# 06 — Campanhas e Push Notifications

## Requisito original

> "Add uma aba para o admin onde ele consegue enviar push notifications para
> os clientes, como promoções, novos preços etc."

Tipos selecionados pelo usuário: **promo, price_update, news, schedule,
new_service**. Visualização do cliente: **banner no topo da tela inicial**.

## Visão geral do fluxo

```
┌─────────────────────────────────────────────────────────────────┐
│ DEVICE DO CLIENTE                                               │
│                                                                 │
│ App boota → AuthContext.useEffect → registerForPushNotificationsAsync()
│   ├─ Notifications.getPermissionsAsync() / requestPermissionsAsync()
│   ├─ Notifications.getExpoPushTokenAsync({ projectId })
│   └─ updateUser(userId, { pushToken })                          │
│                                                                 │
│                  Token salvo em users.push_token (SQLite)       │
└─────────────────────────────────────────────────────────────────┘

                              ▼ (mesmo banco compartilhado)

┌─────────────────────────────────────────────────────────────────┐
│ DEVICE DO ADMIN                                                 │
│                                                                 │
│ Admin → Avisos → Nova → preenche → Enviar                       │
│   ├─ collectClientPushTokens(data.users)  → array de tokens     │
│   ├─ sendCampaignToTokens({ title, message, type }, tokens)     │
│   │    └─ POST https://exp.host/--/api/v2/push/send             │
│   │       (em batches de 100)                                   │
│   └─ updateCampaign(id, { status: 'sent', recipientsCount,      │
│                            deliveredCount, sentAt })            │
└─────────────────────────────────────────────────────────────────┘

                              ▼ (Expo entrega via APNs/FCM)

┌─────────────────────────────────────────────────────────────────┐
│ DEVICE DO CLIENTE                                               │
│                                                                 │
│ Notification chega no SO (banner, som, badge)                   │
│ Ao abrir o app → ClientHomeScreen → CampaignBanner exibe a      │
│                  campanha em carrossel horizontal dispensável.  │
└─────────────────────────────────────────────────────────────────┘
```

## Modelo de dados

```ts
// src/types/index.ts
export type CampaignType =
  | 'promo'
  | 'price_update'
  | 'news'
  | 'schedule'
  | 'new_service';

export type CampaignStatus = 'draft' | 'sent' | 'failed';

export interface Campaign {
  id: string;
  type: CampaignType;
  title: string;
  message: string;
  validUntil?: string;            // ISO date (somente para 'promo')
  status: CampaignStatus;
  sentAt?: string;                // ISO datetime
  recipientsCount?: number;
  deliveredCount?: number;
  errorMessage?: string;
  createdAt: string;
}
```

E na entidade `User`:

```ts
export interface User {
  // ...
  pushToken?: string;             // Expo Push Token deste device
}
```

## Schema SQLite

```sql
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  valid_until TEXT,
  status TEXT NOT NULL,
  sent_at TEXT,
  recipients_count INTEGER,
  delivered_count INTEGER,
  error_message TEXT,
  created_at TEXT NOT NULL
);

-- E em users:
ALTER TABLE users ADD COLUMN push_token TEXT;     -- via tryAddColumn
```

## Camadas

### Serviço de push: `src/services/pushNotifications.ts`

```ts
// Configuração global do handler — define que notificações em foreground
// também devem mostrar banner/som.
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// Cria o canal Android obrigatório para mostrar notificações.
export async function ensureAndroidChannel() { /* ... */ }

// Pede permissão e devolve o Expo Push Token (ou null).
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) return null;             // não funciona em sim
  // pede permissão se necessário
  // chama Notifications.getExpoPushTokenAsync({ projectId })
}

// Filtra clientes com token válido.
export function collectClientPushTokens(users: User[]): string[] {
  return users
    .filter((u) => u.role === 'client' && isExpoPushToken(u.pushToken))
    .map((u) => u.pushToken as string);
}

// Envia em batches de 100 para a Expo Push API.
export async function sendCampaignToTokens(
  campaign: Pick<Campaign, 'title' | 'message' | 'type'>,
  tokens: string[]
): Promise<SendCampaignResult> {
  // POST https://exp.host/--/api/v2/push/send
  // Soma deliveredCount para tickets com status === 'ok'
  // Acumula errorMessages para tickets com status === 'error'
}

// Validação do formato do token.
export function isExpoPushToken(t?: string | null): t is string {
  return !!t && /^Expo(nent)?PushToken\[.+\]$/.test(t);
}
```

### Bootstrap em `App.tsx`

```tsx
configureNotificationHandler();          // executa ao importar o módulo

export default function App() {
  useEffect(() => {
    ensureAndroidChannel().catch(() => {});
  }, []);
  // ...
}
```

### Hook em `AuthContext`

Após autenticação, registra o token e salva no usuário:

```tsx
useEffect(() => {
  if (!user) return;
  let cancelled = false;
  (async () => {
    const pushToken = await registerForPushNotificationsAsync();
    if (cancelled) return;
    if (pushToken && pushToken !== user.pushToken) {
      await updateUser(user.id, { pushToken });
    }
  })();
  return () => { cancelled = true; };
}, [user, updateUser]);
```

### CRUD em `AppContext`

```ts
addCampaign(payload):     gera id+createdAt, prepend em data.campaigns, persist
updateCampaign(id, p):    map+merge, persist
deleteCampaign(id):       filter, persist
```

## UI Admin

### Tab `Avisos` no `AdminNavigator`

```tsx
const CampaignsStack = createStackNavigator<CampaignsStackParamList>();

function CampaignsNavigator() {
  return (
    <CampaignsStack.Navigator screenOptions={HEADER_STYLE}>
      <CampaignsStack.Screen name="CampaignsList" component={CampaignsListScreen} options={{ title: 'Campanhas' }} />
      <CampaignsStack.Screen name="CampaignForm" component={CampaignFormScreen} />
    </CampaignsStack.Navigator>
  );
}

const TAB_ICONS = {
  // ...
  Campaigns: { icon: 'bullhorn', label: 'Avisos' },
  // ...
};
```

### `CampaignsListScreen`

- Header com **contagem de clientes alcançáveis** (`reachable`).
- FlatList ordenada por `sentAt ?? createdAt` desc.
- Cada card mostra:
  - Chip de tipo (com cor e ícone próprios).
  - Badge de status (Rascunho / Enviada / Falhou).
  - Título, mensagem (truncada em 2 linhas).
  - Footer com tempo relativo + contador `delivered/recipients` (se enviada).
  - Botão de excluir (com `ConfirmDialog`).
- FAB dourado para criar nova.
- `EmptyState` quando vazio.

### `CampaignFormScreen`

Cinco seções verticais:

1. **Card de alcance** — destacando quantos clientes vão receber.
2. **Seletor de tipo** (5 chips coloridos com ícone). Cada chip tem `bg`,
   `color` e `hint` próprios. Em modo de edição de campanha já enviada, o
   seletor fica desabilitado.
3. **Campos**: título (max 80), mensagem (max 240, multiline), `validUntil`
   (apenas se tipo for `promo`). Cada campo de texto exibe contador de
   caracteres.
4. **Pré-visualização** — card que simula a aparência da notificação:
   ícone do app, "BARBEARIA · agora", título e corpo.
5. **Status info** (apenas em edição): badge verde se `sent`, vermelho se
   `failed` (com `errorMessage`).

Bottom bar com 2 ações:

- **Salvar rascunho** (status: `draft`)
- **Enviar (N)** — confirmação via `Alert`, então:
  ```ts
  const result = await sendCampaignToTokens(payload, tokens);
  const status = result.delivered > 0 ? 'sent' : 'failed';
  await updateCampaign(id, {
    ...payload,
    status,
    sentAt: new Date().toISOString(),
    recipientsCount: result.recipients,
    deliveredCount: result.delivered,
    errorMessage: result.errors.slice(0, 3).join(' | ') || undefined,
  });
  ```

## UI Cliente: `CampaignBanner`

Componente em `src/components/CampaignBanner.tsx`. Renderizado em
`ClientHomeScreen` logo após o card de "próximo horário".

### Filtros aplicados

```ts
function isStillValid(c: Campaign): boolean {
  if (c.status !== 'sent') return false;            // só sent
  if (c.type !== 'promo') return true;              // não-promo nunca expira
  if (!c.validUntil) return true;
  return Date.now() <= new Date(`${c.validUntil}T23:59:59`).getTime();
}

const visible = campaigns
  .filter(isStillValid)
  .filter((c) => !dismissed.has(c.id))              // já dispensados pelo cliente
  .sort((a, b) => (b.sentAt ?? b.createdAt).localeCompare(...))
  .slice(0, 5);
```

### Persistência de "dispensados"

Por usuário, em `AsyncStorage`:

```
@appBarber:dismissedCampaigns:<userId>  →  JSON.stringify(string[] of ids)
```

### Carrossel

`FlatList horizontal pagingEnabled snapToInterval={CARD_W + spacing.md}` para
scroll com snap suave. Cada card tem largura `screenWidth - spacing.lg * 2`.

### Componente do card

- Ícone colorido + chip do tipo.
- Botão `X` no canto superior direito → `dismiss(id)`.
- Título (h3), mensagem (3 linhas).
- Para promoções: linha extra "Válida até dd/mm/aaaa".

## Limitações conhecidas

### 1. Sem backend = entrega depende de banco compartilhado

A função `collectClientPushTokens(users: User[])` lê tokens do **SQLite local
do admin**. Se admin e cliente estiverem em devices diferentes (cenário real),
o admin não verá os tokens dos clientes.

**Workaround atual**: usado para demos onde admin/cliente alternam no mesmo
device.

**Próximo passo (futuro)**: trocar essa função por uma chamada HTTP a um
backend que centralize tokens. Tudo o resto (UI, validações, lógica de envio)
permanece intacto.

### 2. Push em iOS Simulator
Apple não suporta APNs em simuladores. Em iOS, é necessário **iPhone físico**.
Em Android, emulador funciona.

### 3. Expo Go vs Build nativo
- **Expo Go** (Devs): tokens funcionam de imediato, sem configuração extra.
- **Build nativa** (`expo prebuild`): requer configuração do plugin
  `expo-notifications` no `app.json` (já presente) e dos `entitlements` no iOS
  / `google-services.json` no Android.

## Configuração no `app.json`

```json
"plugins": [
  "expo-font",
  [
    "expo-notifications",
    {
      "icon": "./assets/icon.png",
      "color": "#D4A453"
    }
  ]
],
"notification": {
  "iosDisplayInForeground": true
}
```

## Tipos coloridos por categoria

Mantemos o "design language" consistente:

| Tipo           | Label      | Ícone               | Cor       | Background |
| -------------- | ---------- | ------------------- | --------- | ---------- |
| `promo`        | Promoção   | tag-heart           | #E11D48   | #FFE4E6    |
| `price_update` | Preço      | cash-multiple       | #16A34A   | #DCFCE7    |
| `news`         | Aviso      | bullhorn            | #2563EB   | #DBEAFE    |
| `schedule`     | Horário    | calendar-clock      | #F59E0B   | #FEF3C7    |
| `new_service`  | Novidade   | star-shooting       | #7C3AED   | #EDE9FE    |

Esse mapa é duplicado em `CampaignsListScreen`, `CampaignFormScreen` e
`CampaignBanner` — três visões com leves variações. Evitamos "hoist" para um
módulo comum porque cada visão tem detalhes próprios (ex: o banner usa
ícones maiores, a lista usa textos abreviados). Caso o mapa cresça,
considerar mover para `src/theme/campaigns.ts`.

## Arquivos relacionados

- `src/services/pushNotifications.ts` — registro + envio (Expo Push API)
- `src/types/index.ts` — `Campaign`, `CampaignType`, `CampaignStatus`
- `src/database/sqlite.ts` — tabela `campaigns`, coluna `push_token`
- `src/context/AppContext.tsx` — `addCampaign`, `updateCampaign`, `deleteCampaign`
- `src/context/AuthContext.tsx` — registro automático do token
- `src/navigation/AdminNavigator.tsx` — tab `Avisos`
- `src/screens/Campaigns/CampaignsListScreen.tsx`
- `src/screens/Campaigns/CampaignFormScreen.tsx`
- `src/components/CampaignBanner.tsx`
- `src/screens/Client/ClientHomeScreen.tsx` (consumidor do banner)
- `App.tsx` — `configureNotificationHandler()` + `ensureAndroidChannel()`
- `app.json` — plugin `expo-notifications`

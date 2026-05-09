# 09 — Tenants e carrossel pre-login do cliente

## Requisito original

> "O carrousel de cliente precisa ser mostrado antes de login do cliente,
> listando assim todos os tenants que existem na nossa tabela."

O app deixa de representar uma unica barbearia e passa a operar como uma
plataforma multiestabelecimento. Antes de entrar como cliente, o usuario escolhe
qual estabelecimento deseja acessar. O login/cadastro do cliente acontece no
contexto desse tenant e, depois da autenticacao, todas as telas de cliente
mostram apenas dados daquele estabelecimento.

---

## Glossario

| Termo | Significado |
| ----- | ----------- |
| `Tenant` | Entidade tecnica que representa um estabelecimento dentro da plataforma. |
| Estabelecimento | Nome de produto/UX exibido ao usuario final. |
| Tenant selecionado | O estabelecimento escolhido no carrossel pre-login. |
| Cliente global | Usuario `role: 'client'` que pode acessar/agendar em mais de um tenant. |
| Staff tenant-scoped | Admin/profissional vinculados a um unico tenant. |

> Regra de naming: no codigo, usar `Tenant`/`tenantId`; na UI, usar
> "estabelecimento", "barbearia" ou o nome do tenant.

---

## Objetivos

1. Exibir um carrossel publico de tenants **antes do login do cliente**.
2. Permitir que o cliente escolha o estabelecimento onde deseja entrar.
3. Levar `tenantId` para login, cadastro, sessao e telas do cliente.
4. Separar dados operacionais por tenant: servicos, profissionais, agenda,
   produtos, financeiro e campanhas.
5. Manter compatibilidade com bases locais existentes criando um tenant padrao
   durante a migracao.
6. Preparar a arquitetura para um backend futuro que liste tenants publicos e
   sincronize dados entre devices.

## Fora de escopo imediato

- Busca remota de tenants via API.
- Pagamentos, planos ou billing por tenant.
- Permissoes multi-tenant para um mesmo admin.
- Avaliacoes, favoritos e geolocalizacao.
- Sincronizacao real entre dispositivos.

Esses itens ficam desenhados como extensoes futuras.

---

## Fluxo de produto

### Cliente

```txt
App abre
  -> AppProvider carrega SQLite
  -> AuthProvider tenta restaurar sessao
  -> status === unauthenticated
  -> AuthNavigator exibe TenantSelectScreen
  -> cliente escolhe tenant no carrossel
  -> LoginScreen em modo Cliente recebe tenantId
  -> loginClient({ name, phone, tenantId })
  -> issueSession(user, { selectedTenantId: tenantId })
  -> ClientNavigator
  -> Home / Agendar / Conta filtram por selectedTenantId
```

### Cadastro de cliente

```txt
TenantSelectScreen
  -> cliente escolhe tenant
  -> LoginScreen
  -> "Cadastre-se"
  -> RegisterScreen recebe tenantId
  -> registerClient({ name, phone, tenantId })
  -> cria User global, se necessario
  -> issueSession(user, { selectedTenantId: tenantId })
  -> ClientNavigator
```

### Staff

Staff nao precisa passar pelo carrossel publico. A tela inicial deve oferecer
um caminho secundario "Sou funcionario".

```txt
TenantSelectScreen
  -> "Sou funcionario"
  -> StaffLoginScreen/LoginScreen modo funcionario
  -> loginStaff({ username, password })
  -> usuario ja possui tenantId
  -> AdminNavigator ou ProfessionalNavigator filtrado pelo tenant do staff
```

---

## Decisao de dominio

### Cliente e global; dados operacionais sao tenant-scoped

O mesmo cliente deve poder acessar varios estabelecimentos com a mesma conta.
Por isso, `User` com `role: 'client'` nao precisa pertencer exclusivamente a um
tenant. O vinculo com tenant acontece nos agendamentos e, futuramente, em
preferencias ou relacionamento cliente-estabelecimento.

```ts
User(role: 'client')         -> global por telefone/nome
Appointment.tenantId         -> onde o cliente agendou
Campaign.tenantId            -> campanha enviada por estabelecimento
Professional.tenantId        -> equipe de uma barbearia
Service/Product.tenantId     -> catalogo de uma barbearia
Transaction.tenantId         -> financeiro de uma barbearia
```

### Admin e profissional sao tenant-scoped

`User` de staff deve ter `tenantId` obrigatorio:

```ts
User(role: 'admin' | 'professional') -> tenantId obrigatorio
```

Isso simplifica as telas administrativas: admin/profissional sempre operam no
tenant associado ao proprio usuario.

---

## Modelo de dados

### Novo tipo `Tenant`

```ts
export interface Tenant {
  id: string;
  name: string;
  description?: string;
  phone?: string;
  address?: string;
  city?: string;
  imageUrl?: string;
  coverColor?: string;
  active: boolean;
  createdAt: string;
}
```

Campos recomendados para a primeira versao:

| Campo | Uso |
| ----- | --- |
| `name` | Titulo principal do card. |
| `description` | Subtitulo curto: "Barbearia premium no centro". |
| `address` | Texto secundario no card/detalhes. |
| `city` | Filtro futuro e exibicao rapida. |
| `phone` | Contato do estabelecimento. |
| `imageUrl` | Capa/logo futura. No offline local pode ficar vazio. |
| `coverColor` | Fallback visual para cards sem imagem. |
| `active` | Controla se aparece no carrossel publico. |

### `AppData`

```ts
export interface AppData {
  tenants: Tenant[];
  users: User[];
  services: Service[];
  professionals: Professional[];
  products: Product[];
  appointments: Appointment[];
  transactions: Transaction[];
  campaigns: Campaign[];
}
```

### Entidades com `tenantId`

```ts
export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  tenantId?: string;          // obrigatorio para admin/professional
  professionalId?: string;
  username?: string;
  passwordHash?: string;
  pushToken?: string;
  createdAt: string;
}

export interface Service {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  active: boolean;
  createdAt: string;
}

export interface Professional {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  email: string;
  specialties: string[];
  active: boolean;
  workingHours: WorkingHours;
  createdAt: string;
}

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  price: number;
  costPrice: number;
  stock: number;
  category: string;
  active: boolean;
  createdAt: string;
}

export interface Appointment {
  id: string;
  tenantId: string;
  professionalId: string;
  clientName: string;
  clientPhone: string;
  clientUserId?: string;
  serviceIds: string[];
  productIds: string[];
  date: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  totalValue: number;
  paymentMethod?: PaymentMethod;
  notes?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  tenantId: string;
  type: 'income' | 'expense';
  category: TransactionCategory;
  description: string;
  amount: number;
  date: string;
  paymentMethod?: PaymentMethod;
  appointmentId?: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  tenantId: string;
  type: CampaignType;
  title: string;
  message: string;
  validUntil?: string;
  status: CampaignStatus;
  sentAt?: string;
  recipientsCount?: number;
  deliveredCount?: number;
  errorMessage?: string;
  createdAt: string;
}
```

---

## Schema SQLite

### Nova tabela `tenants`

```sql
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  image_url TEXT,
  cover_color TEXT,
  active INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(active);
CREATE INDEX IF NOT EXISTS idx_tenants_city ON tenants(city);
```

### Novas colunas nas tabelas existentes

```sql
ALTER TABLE users ADD COLUMN tenant_id TEXT;
ALTER TABLE services ADD COLUMN tenant_id TEXT;
ALTER TABLE professionals ADD COLUMN tenant_id TEXT;
ALTER TABLE products ADD COLUMN tenant_id TEXT;
ALTER TABLE appointments ADD COLUMN tenant_id TEXT;
ALTER TABLE transactions ADD COLUMN tenant_id TEXT;
ALTER TABLE campaigns ADD COLUMN tenant_id TEXT;
```

Como o projeto usa migracoes idempotentes, cada coluna deve ser adicionada com
`tryAddColumn(db, table, column, type)`.

### Indices recomendados

```sql
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_services_tenant ON services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_professionals_tenant ON professionals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_date ON appointments(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_date ON transactions(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_created ON campaigns(tenant_id, created_at);
```

### Mapeamento Row <-> Domain

Adicionar `TenantRow` e conversores:

```ts
type TenantRow = {
  id: string;
  name: string;
  description: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  image_url: string | null;
  cover_color: string | null;
  active: number;
  created_at: string;
};

function rowToTenant(r: TenantRow): Tenant {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? undefined,
    phone: r.phone ?? undefined,
    address: r.address ?? undefined,
    city: r.city ?? undefined,
    imageUrl: r.image_url ?? undefined,
    coverColor: r.cover_color ?? undefined,
    active: r.active === 1,
    createdAt: r.created_at,
  };
}
```

Todos os `rowToX` existentes devem mapear `tenant_id` para `tenantId`. Todos os
`INSERT` em `saveAllToSqlite` devem persistir `tenant_id`.

---

## Estrategia de migracao local

### Problema

Bases existentes nao possuem tabela `tenants` nem `tenant_id`. Como todos os
dados atuais pertencem implicitamente a uma unica barbearia, precisamos criar
um tenant padrao e vincular todos os registros antigos a ele.

### Regra

1. Carregar dados do SQLite.
2. Se nao houver tenants mas houver dados operacionais, criar tenant padrao.
3. Preencher `tenantId` ausente nas entidades tenant-scoped.
4. Para staff sem `tenantId`, preencher com o tenant padrao.
5. Clientes podem continuar sem `tenantId`.
6. Persistir o snapshot migrado no SQLite.

### Tenant padrao

```ts
const DEFAULT_TENANT_NAME = 'Barber Studio';

function buildDefaultTenant(): Tenant {
  return {
    id: uuidv4(),
    name: DEFAULT_TENANT_NAME,
    description: 'Estabelecimento principal',
    active: true,
    coverColor: '#D4A24C',
    createdAt: new Date().toISOString(),
  };
}
```

### Helper de normalizacao

```ts
function ensureTenantScope(data: AppData): AppData {
  const tenants = data.tenants?.length ? data.tenants : [buildDefaultTenant()];
  const defaultTenantId = tenants[0].id;

  return {
    ...data,
    tenants,
    users: data.users.map((u) =>
      u.role === 'admin' || u.role === 'professional'
        ? { ...u, tenantId: u.tenantId ?? defaultTenantId }
        : u
    ),
    services: data.services.map((s) => ({ ...s, tenantId: s.tenantId ?? defaultTenantId })),
    professionals: data.professionals.map((p) => ({ ...p, tenantId: p.tenantId ?? defaultTenantId })),
    products: data.products.map((p) => ({ ...p, tenantId: p.tenantId ?? defaultTenantId })),
    appointments: data.appointments.map((a) => ({ ...a, tenantId: a.tenantId ?? defaultTenantId })),
    transactions: data.transactions.map((t) => ({ ...t, tenantId: t.tenantId ?? defaultTenantId })),
    campaigns: data.campaigns.map((c) => ({ ...c, tenantId: c.tenantId ?? defaultTenantId })),
  };
}
```

> Observacao: em TypeScript, durante a migracao, pode ser necessario aceitar
> tipos parciais vindos do banco/legacy (`tenantId?: string`) antes de retornar
> `AppData` normalizado com `tenantId` obrigatorio nas entidades tenant-scoped.

---

## Seed multi-tenant

Atualizar `buildExampleData()` para criar mais de um tenant:

```ts
const tenants: Tenant[] = [
  {
    id: uuidv4(),
    name: 'Barber Studio Centro',
    description: 'Cortes classicos e barba premium',
    address: 'Rua das Palmeiras, 120',
    city: 'Sao Paulo',
    coverColor: '#D4A24C',
    active: true,
    createdAt: olderIso,
  },
  {
    id: uuidv4(),
    name: 'Barber Premium Norte',
    description: 'Atendimento rapido e horario estendido',
    address: 'Av. Norte, 880',
    city: 'Sao Paulo',
    coverColor: '#0F172A',
    active: true,
    createdAt: olderIso,
  },
  {
    id: uuidv4(),
    name: 'Barbearia Classic',
    description: 'Tradicional, familiar e completa',
    address: 'Rua Central, 45',
    city: 'Campinas',
    coverColor: '#7C3AED',
    active: true,
    createdAt: olderIso,
  },
];
```

Cada tenant deve receber seus proprios:

- profissionais
- usuarios staff
- servicos
- produtos
- agendamentos
- transacoes
- campanhas

Clientes demo podem ser globais e aparecer em agendamentos de varios tenants.

---

## Navegacao

### Param lists

Atualizar `AuthStackParamList`:

```ts
export type AuthStackParamList = {
  TenantSelect: undefined;
  Login: { tenantId?: string; mode?: 'client' | 'staff' };
  Register: { tenantId: string };
};
```

`tenantId` e obrigatorio para cadastro de cliente e para login cliente. No modo
staff, `tenantId` nao deve ser passado pela UI publica; ele vem do usuario
encontrado no login.

### AuthNavigator

```tsx
function AuthNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="TenantSelect"
        component={TenantSelectScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
```

### Tela publica `TenantSelectScreen`

Responsabilidades:

1. Ler `data.tenants`.
2. Filtrar `active === true`.
3. Renderizar carrossel horizontal.
4. Ao selecionar tenant, navegar para login cliente.
5. Exibir acao secundaria "Sou funcionario".
6. Lidar com estado vazio.

```tsx
const tenants = data.tenants.filter((t) => t.active);

function handleTenantPress(tenant: Tenant) {
  navigation.navigate('Login', { tenantId: tenant.id, mode: 'client' });
}

function handleStaffPress() {
  navigation.navigate('Login', { mode: 'staff' });
}
```

### Estado vazio

Se nao houver tenants ativos:

- Mostrar `EmptyState`.
- Texto: "Nenhum estabelecimento disponivel neste dispositivo."
- Em ambiente demo/dev, oferecer botao para recarregar seed ou orientar admin.

---

## UI do carrossel

### Componentes

```txt
src/screens/Auth/TenantSelectScreen.tsx
src/components/TenantCarousel.tsx
src/components/TenantCard.tsx
```

### Layout sugerido

```txt
┌─────────────────────────────────────┐
│ appBarber                           │
│ Escolha onde deseja agendar         │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Barber Studio Centro          │  │
│  │ Cortes classicos e barba...   │  │
│  │ Rua das Palmeiras, 120        │  │
│  │ [Acessar estabelecimento]     │  │
│  └───────────────────────────────┘  │
│     ●  ○  ○                         │
│                                     │
│ Sou funcionario                     │
└─────────────────────────────────────┘
```

### `TenantCarousel`

Usar `FlatList` horizontal, como `CampaignBanner` ja faz:

```tsx
<FlatList
  horizontal
  pagingEnabled
  snapToInterval={CARD_WIDTH + spacing.md}
  decelerationRate="fast"
  showsHorizontalScrollIndicator={false}
  data={tenants}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => (
    <TenantCard tenant={item} onPress={() => onSelect(item)} />
  )}
/>
```

### `TenantCard`

Conteudo minimo:

- Imagem/capa ou gradient com `coverColor`.
- Nome.
- Descricao.
- Cidade/endereco.
- Telefone, se houver.
- Botao "Acessar".

Estados:

- `active=false`: nao entra na lista publica.
- sem `imageUrl`: usar cor/gradiente.
- ultimo tenant acessado: badge "Ultimo acesso" (opcional P2).

---

## Autenticacao e sessao

### Token payload

Adicionar `selectedTenantId`:

```ts
export interface TokenPayload {
  sub: string;
  name: string;
  phone: string;
  role: UserRole;
  tenantId?: string;           // tenant fixo do staff
  selectedTenantId?: string;   // tenant escolhido pelo cliente
  professionalId?: string;
  iat: number;
  exp: number;
}
```

### AuthContext

Adicionar no tipo publico:

```ts
interface AuthContextType {
  status: AuthStatus;
  token: string | null;
  user: User | null;
  role: UserRole | null;
  selectedTenantId: string | null;

  loginClient: (params: {
    name: string;
    phone: string;
    tenantId: string;
  }) => Promise<AuthResult>;

  registerClient: (params: {
    name: string;
    phone: string;
    tenantId: string;
  }) => Promise<AuthResult>;

  loginStaff: (params: {
    username: string;
    password: string;
  }) => Promise<AuthResult>;

  selectTenant: (tenantId: string) => Promise<void>;
  logout: () => Promise<void>;
}
```

### `issueSession`

```ts
async function issueSession(matched: User, selectedTenantId?: string) {
  const tenantIdForSession =
    matched.role === 'client'
      ? selectedTenantId
      : matched.tenantId;

  const newToken = signToken({
    sub: matched.id,
    name: matched.name,
    phone: matched.phone,
    role: matched.role,
    tenantId: matched.tenantId,
    selectedTenantId: tenantIdForSession,
    professionalId: matched.professionalId,
  });

  await AsyncStorage.setItem(TOKEN_STORAGE_KEY, newToken);
  setToken(newToken);
  setUser(matched);
  setSelectedTenantIdState(tenantIdForSession ?? null);
}
```

### Login cliente

`loginClient` deve validar `tenantId` antes de emitir sessao:

```ts
const tenant = data.tenants.find((t) => t.id === tenantId && t.active);
if (!tenant) {
  return { ok: false, reason: 'Estabelecimento indisponivel.' };
}
```

O match do cliente continua por nome + telefone, mas a sessao recebe o tenant
escolhido:

```ts
await issueSession(matched, tenantId);
```

### Cadastro cliente

Cadastro cria cliente global, mas entra no tenant selecionado:

```ts
const created = await addUser({
  name: nameTrim,
  phone: phone.trim(),
  role: 'client',
});
await issueSession(created, tenantId);
```

### Persistir ultimo tenant do cliente

Opcional P1/P2, mas recomendado para UX:

```txt
@appBarber:lastTenant:<userId> -> tenantId
```

Uso:

- No `TenantSelectScreen`, destacar o ultimo tenant se o usuario ja tiver
  autenticado antes e fez logout.
- Em uma tela futura de troca de estabelecimento, pre-selecionar esse tenant.

> Como a tela e pre-login, nem sempre sabemos o `userId`. Para isso funcionar
> antes do login, pode-se manter tambem uma chave por telefone normalizado
> depois que o usuario digitar o telefone, ou deixar esse destaque para depois
> da autenticacao.

---

## Seletores por tenant

Para evitar filtros duplicados em todas as telas, criar helpers puros:

```txt
src/utils/tenantSelectors.ts
```

```ts
export function getTenantById(data: AppData, tenantId?: string | null) {
  return data.tenants.find((t) => t.id === tenantId);
}

export function getServicesByTenant(data: AppData, tenantId: string) {
  return data.services.filter((s) => s.tenantId === tenantId);
}

export function getProfessionalsByTenant(data: AppData, tenantId: string) {
  return data.professionals.filter((p) => p.tenantId === tenantId);
}

export function getProductsByTenant(data: AppData, tenantId: string) {
  return data.products.filter((p) => p.tenantId === tenantId);
}

export function getAppointmentsByTenant(data: AppData, tenantId: string) {
  return data.appointments.filter((a) => a.tenantId === tenantId);
}

export function getCampaignsByTenant(data: AppData, tenantId: string) {
  return data.campaigns.filter((c) => c.tenantId === tenantId);
}

export function getTransactionsByTenant(data: AppData, tenantId: string) {
  return data.transactions.filter((t) => t.tenantId === tenantId);
}
```

### Hook conveniente

Opcionalmente, criar:

```ts
export function useSelectedTenant() {
  const { data } = useAppContext();
  const { selectedTenantId } = useAuth();
  const tenant = getTenantById(data, selectedTenantId);

  if (!selectedTenantId || !tenant) {
    return { tenant: null, tenantId: null };
  }
  return { tenant, tenantId: selectedTenantId };
}
```

---

## Telas afetadas

### Auth

| Arquivo | Mudanca |
| ------- | ------- |
| `src/navigation/AuthNavigator.tsx` | Primeira rota passa a ser `TenantSelect`. |
| `src/screens/Auth/TenantSelectScreen.tsx` | Nova tela publica com carrossel. |
| `src/screens/Auth/LoginScreen.tsx` | Recebe `tenantId` em modo cliente; staff continua sem tenant pre-selecionado. |
| `src/screens/Auth/RegisterScreen.tsx` | Recebe `tenantId` obrigatorio. |
| `src/context/AuthContext.tsx` | Sessao passa a conhecer `selectedTenantId`. |
| `src/utils/token.ts` | Token payload inclui `tenantId`/`selectedTenantId`. |

### Cliente

| Tela | Regra |
| ---- | ----- |
| `ClientHomeScreen` | Filtrar agendamentos e campanhas por `selectedTenantId`. Mostrar nome do tenant no header. |
| `ClientProfessionalsListScreen` | Listar apenas profissionais ativos do tenant. |
| `ClientBookingFormScreen` | Usar servicos/profissionais/agendamentos do tenant. Payload recebe `tenantId`. |
| `ClientAppointmentDetailScreen` | Garantir que detalhe pertence ao cliente e ao tenant atual. |
| `CampaignBanner` | Receber campanhas ja filtradas por tenant ou filtrar internamente com `tenantId`. |
| `AccountScreen` | Exibir estabelecimento atual para cliente e permitir "Trocar estabelecimento" futuramente. |

### Admin

Admin opera no `user.tenantId`.

| Tela | Regra |
| ---- | ----- |
| `HomeScreen` | KPIs apenas do tenant do admin. |
| `ScheduleMainScreen` | Agenda apenas do tenant. |
| `AppointmentFormScreen` | Criar/editar com `tenantId` do admin. |
| `ServicesListScreen`/`ServiceFormScreen` | Listar/criar servicos do tenant. |
| `ProfessionalsListScreen`/`ProfessionalFormScreen` | Listar/criar equipe do tenant; user profissional recebe mesmo `tenantId`. |
| `ProductsListScreen`/`ProductFormScreen` | Listar/criar produtos do tenant. |
| `FinancialMainScreen`/`TransactionFormScreen` | Financeiro por tenant. |
| `CampaignsListScreen`/`CampaignFormScreen` | Campanhas por tenant; envio para clientes do tenant quando houver relacionamento. |

### Profissional

Profissional opera em `user.tenantId` + `user.professionalId`.

| Tela | Regra |
| ---- | ----- |
| `ProfessionalScheduleScreen` | Filtrar por `tenantId` e `professionalId`. |
| `AppointmentDetail` | Validar que appointment pertence ao tenant/profissional. |
| `AccountScreen` | Exibir tenant vinculado. |

---

## Regras de negocio

### Tenant ativo

- Somente tenants `active=true` aparecem no carrossel publico.
- Se um tenant for desativado enquanto existe sessao cliente nele, a proxima
  restauracao de sessao deve invalidar `selectedTenantId` e pedir nova escolha.

### Cliente sem tenant selecionado

Se `status === authenticated`, `role === 'client'` e `selectedTenantId` estiver
ausente/invalido:

- Redirecionar para `TenantSelectScreen`; ou
- Exibir tela "Escolha um estabelecimento" dentro do `ClientNavigator`.

Recomendacao: redirecionar para uma tela de selecao compartilhada, para evitar
home vazia.

### Staff sem tenant

Staff sem `tenantId` indica migracao incompleta. Mitigacao:

- Durante `loadAppData`, `ensureTenantScope` deve preencher staff legado.
- Em runtime, se ainda faltar, bloquear login staff com mensagem:
  "Conta sem estabelecimento vinculado. Recrie ou migre os dados."

### Dados cruzados

Toda criacao de entidade tenant-scoped deve receber o tenant do contexto atual.
Nunca confiar em `tenantId` vindo de parametros editaveis da UI.

Exemplos:

- Admin cria servico: usar `auth.user.tenantId`.
- Cliente cria agendamento: usar `auth.selectedTenantId`.
- Profissional atualiza agendamento: validar `appointment.tenantId === user.tenantId`.

---

## Campanhas e push em ambiente multi-tenant

### Filtro de campanhas

Campanhas passam a ser tenant-scoped:

```ts
const visibleCampaigns = data.campaigns.filter(
  (c) => c.tenantId === selectedTenantId && c.status === 'sent'
);
```

### Push tokens

No modelo atual offline-first, `User.pushToken` fica no usuario global. Para
multi-tenant real, o ideal e uma entidade de relacionamento:

```ts
interface TenantClient {
  id: string;
  tenantId: string;
  userId: string;
  pushToken?: string;
  marketingOptIn: boolean;
  createdAt: string;
  lastSeenAt?: string;
}
```

Porem, para a primeira implementacao local, podemos manter `pushToken` em
`User` e limitar campanhas aos clientes que possuem agendamentos naquele tenant:

```ts
function collectClientPushTokensForTenant(data: AppData, tenantId: string): string[] {
  const clientIds = new Set(
    data.appointments
      .filter((a) => a.tenantId === tenantId && a.clientUserId)
      .map((a) => a.clientUserId as string)
  );

  return data.users
    .filter((u) => u.role === 'client' && clientIds.has(u.id) && isExpoPushToken(u.pushToken))
    .map((u) => u.pushToken as string);
}
```

> Quando houver backend, substituir por uma tabela/endpoint real de
> relacionamento `tenant_clients`.

---

## Impacto na persistencia atual

`saveAllToSqlite(data)` hoje faz `DELETE + INSERT` de todas as tabelas. A
mudanca multi-tenant aumenta o volume de dados, mas ainda e aceitavel para MVP.
Ao crescer:

- priorizar UPSERT incremental por tabela;
- adicionar `PRAGMA user_version` para migracoes com versao;
- considerar dividir `AppContext` por dominios;
- evitar recalcular filtros grandes em toda renderizacao.

---

## Plano de implementacao

### P0 — Base de dominio e banco

1. Adicionar `Tenant` em `src/types/index.ts`.
2. Adicionar `tenants: Tenant[]` em `AppData`.
3. Adicionar `tenantId` nas entidades tenant-scoped.
4. Adicionar `tenantId?: string` em `User`, obrigatorio para staff.
5. Criar tabela `tenants` no SQLite.
6. Adicionar `tenant_id` nas tabelas existentes via `tryAddColumn`.
7. Criar indices por tenant.
8. Atualizar `rowToX`, tipos Row e `saveAllToSqlite`.
9. Atualizar `defaultData`.
10. Criar migracao `ensureTenantScope`.

### P1 — Seed e dados demo

1. Atualizar `buildExampleData()` para 3 tenants.
2. Distribuir profissionais/servicos/produtos/agendamentos entre tenants.
3. Garantir admin/profissionais com `tenantId`.
4. Manter clientes demo globais.
5. Atualizar README/SDD se credenciais demo mudarem.

### P2 — Selecao pre-login

1. Criar `TenantSelectScreen`.
2. Criar `TenantCarousel` e `TenantCard`.
3. Alterar `AuthNavigator` para iniciar no seletor.
4. Passar `tenantId` para login/cadastro cliente.
5. Adicionar link "Sou funcionario".
6. Tratar lista vazia de tenants ativos.

### P3 — Sessao tenant-aware

1. Adicionar `selectedTenantId` no `AuthContext`.
2. Adicionar `selectedTenantId` no token local.
3. Atualizar `issueSession`.
4. Atualizar `loginClient` e `registerClient` para exigirem `tenantId`.
5. Atualizar restauracao de sessao para validar tenant ativo.
6. Persistir ultimo tenant acessado, se desejado.

### P4 — Filtros nas telas cliente

1. Criar `tenantSelectors.ts`.
2. Filtrar `ClientHomeScreen`.
3. Filtrar `ClientProfessionalsListScreen`.
4. Filtrar `ClientBookingFormScreen`.
5. Filtrar `ClientAppointmentDetailScreen`.
6. Filtrar `CampaignBanner`.
7. Incluir nome do estabelecimento na UI cliente.

### P5 — Filtros nas telas admin/profissional

1. Admin: filtrar dashboard, agenda, servicos, profissionais, produtos,
   financeiro e campanhas por `user.tenantId`.
2. Profissional: filtrar agenda por `user.tenantId` e `professionalId`.
3. Garantir payloads de criacao com tenant correto.
4. Validar que edicoes/exclusoes nao cruzam tenants.

### P6 — QA e testes

1. Testar migracao de base antiga para tenant padrao.
2. Testar login cliente em tenant A e agendamento em tenant A.
3. Testar que tenant B nao mostra dados do tenant A.
4. Testar staff de tenant A sem acesso a dados do tenant B.
5. Testar campanhas filtradas por tenant.
6. Testar logout e novo login escolhendo outro tenant.
7. Adicionar testes unitarios para seletores e migracao.

---

## Checklist de seguranca/consistencia

- [ ] Nenhuma tela usa dados globais sem filtro quando existe contexto de
      tenant.
- [ ] Todo `addX` tenant-scoped recebe `tenantId` do contexto, nao do usuario.
- [ ] Staff sem `tenantId` e corrigido na migracao ou bloqueado.
- [ ] Cliente autenticado sem `selectedTenantId` e redirecionado para selecao.
- [ ] Tenant inativo nao permite login cliente novo.
- [ ] Appointment sempre tem `tenantId`.
- [ ] Transaction criada a partir de appointment herda o mesmo `tenantId`.
- [ ] Campaign criada por admin herda `user.tenantId`.
- [ ] Push/campanha nao mistura clientes de tenants diferentes.

---

## Estrutura de arquivos esperada

```txt
src/
  components/
    TenantCarousel.tsx
    TenantCard.tsx
  context/
    AppContext.tsx
    AuthContext.tsx
  database/
    sqlite.ts
    seed.ts
    index.ts
  navigation/
    AuthNavigator.tsx
    ClientNavigator.tsx
    AdminNavigator.tsx
    ProfessionalNavigator.tsx
  screens/
    Auth/
      TenantSelectScreen.tsx
      LoginScreen.tsx
      RegisterScreen.tsx
  utils/
    tenantSelectors.ts
    token.ts
  types/
    index.ts
```

---

## Futuro com backend

Quando a plataforma sair do modelo somente local, o `TenantSelectScreen` deve
buscar tenants publicos de uma API antes do login:

```txt
GET /public/tenants?active=true
```

Depois do login:

```txt
POST /auth/client-login
POST /auth/client-register
GET /tenants/:tenantId/catalog
GET /tenants/:tenantId/availability
POST /tenants/:tenantId/appointments
```

No backend, o modelo deve incluir:

- `tenants`
- `users`
- `tenant_staff`
- `tenant_clients`
- `services`
- `professionals`
- `appointments`
- `campaigns`
- `push_tokens`

A implementacao local descrita neste documento deve manter os mesmos nomes de
campo (`tenantId`) para facilitar a migracao futura.

---

## Arquivos relacionados

- `src/types/index.ts` — `Tenant`, `tenantId`, ParamLists.
- `src/database/sqlite.ts` — tabela `tenants`, colunas `tenant_id`, indices e mapeamento.
- `src/database/index.ts` — migracao `ensureTenantScope`.
- `src/database/seed.ts` — seed multi-tenant.
- `src/context/AuthContext.tsx` — `selectedTenantId`, login/cadastro tenant-aware.
- `src/utils/token.ts` — payload de sessao com tenant.
- `src/navigation/AuthNavigator.tsx` — fluxo pre-login.
- `src/screens/Auth/TenantSelectScreen.tsx` — nova tela publica.
- `src/components/TenantCarousel.tsx` — carrossel horizontal.
- `src/components/TenantCard.tsx` — card visual do estabelecimento.
- `src/utils/tenantSelectors.ts` — seletores por tenant.
- Telas `Client/*`, `Home`, `Schedule`, `Services`, `Professionals`,
  `Products`, `Financial`, `Campaigns` — filtros e payloads por tenant.

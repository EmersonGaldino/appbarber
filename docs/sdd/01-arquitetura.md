# 01 — Arquitetura geral

## Princípios de design

1. **Offline-first**: o app funciona 100% sem conexão. Toda operação CRUD vai ao
   SQLite local; o estado em memória (Context) é a única fonte da UI e é
   mantido em sincronia com o disco a cada commit.
2. **Source of truth única**: o `AppContext` mantém o `AppData` consolidado
   (users, services, professionals, products, appointments, transactions,
   campaigns). Todos os componentes leem dali.
3. **Persistência fileira de gravações**: para evitar condição de corrida entre
   chamadas concorrentes, todas as gravações passam por uma fila
   (`persistChain.current = persistChain.current.then(...)`).
4. **Migrações idempotentes**: o schema é evoluído com `tryAddColumn`/`CREATE
   IF NOT EXISTS` para que upgrades de app não destruam dados existentes.
5. **Componentização**: UI é construída a partir de primitivos reutilizáveis
   (`FormField`, `PasswordField`, `PressableScale`, `EmptyState`,
   `ConfirmDialog`, `CampaignBanner`, etc).

## Diagrama de camadas

```
┌─────────────────────────────────────────────────────────────────┐
│                       UI (Screens & Components)                 │
│  Screens consomem hooks: useAuth(), useAppContext()             │
└────────────────┬────────────────────────────────┬───────────────┘
                 │ leitura                        │ mutação
                 ▼                                ▼
┌──────────────────────────────┐   ┌─────────────────────────────┐
│        AuthContext           │   │        AppContext           │
│ • status / token / user      │   │ • data: AppData (snapshot)  │
│ • loginClient / loginStaff   │   │ • addX / updateX / deleteX  │
│ • registerClient / logout    │   │ • commit() → fila           │
│ • registra Expo Push Token   │   └──────────────┬──────────────┘
└──────────────────────────────┘                  │
                                                  ▼
                                  ┌────────────────────────────────┐
                                  │        Persistência            │
                                  │  database/index.ts (orquestra) │
                                  │  ├── sqlite.ts (loadAll/saveAll)│
                                  │  ├── seed.ts (dados iniciais)   │
                                  │  └── storage.ts (legacy migrate)│
                                  └─────────────┬──────────────────┘
                                                ▼
                                  ┌────────────────────────────────┐
                                  │        Disco (Device)          │
                                  │  • SQLite (expo-sqlite)        │
                                  │  • AsyncStorage (sessão/flags) │
                                  └────────────────────────────────┘

                          [Serviços externos]
                                     │
                                     ▼
                          ┌─────────────────────────────┐
                          │      Expo Push API          │
                          │ src/services/               │
                          │   pushNotifications.ts      │
                          └─────────────────────────────┘
```

## Fluxo de inicialização (boot)

```
App.tsx
  └─ configureNotificationHandler()                    [side-effect síncrono]
  └─ <GestureHandlerRootView>
      └─ <SafeAreaProvider>
          └─ <AppProvider>                             [carrega SQLite → setData]
              └─ <AuthProvider>                        [restaura sessão do AsyncStorage]
                  └─ <AppNavigator>                    [decide rota com base em role]
                      ├─ <AuthNavigator>               (não autenticado)
                      ├─ <ClientNavigator>             (role === 'client')
                      ├─ <ProfessionalNavigator>       (role === 'professional')
                      └─ <AdminNavigator>              (role === 'admin')
```

Após o login, o `AuthContext` dispara um `useEffect` que tenta registrar o
Expo Push Token deste dispositivo e gravá-lo no `User` correspondente
(somente uma vez por sessão, se o token mudou).

## Estado em memória vs disco

O padrão é **espelhamento eventual**:

```ts
// AppContext.tsx
const commit = useCallback(async (updater) => {
  await new Promise((resolve, reject) => {
    persistChain.current = persistChain.current
      .then(async () => {
        const next = updater(dataRef.current);  // produz novo snapshot
        dataRef.current = next;                  // atualiza ref síncrona
        await persistAppData(next);              // grava no SQLite
        setData(next);                           // re-render
      })
      .then(() => resolve())
      .catch(reject);
  });
}, []);
```

**Por que `dataRef`?** O `setData` é assíncrono — duas chamadas seguidas a
`addCampaign` poderiam ler o mesmo `data` antigo. Manter `dataRef.current` em
sincronia logo dentro do `then` garante que a próxima função na fila já enxerga
o estado mais novo.

## Roteamento e Param Lists

Todas as pilhas de navegação têm seus tipos centralizados em
`src/types/index.ts` (ex.: `AdminTabParamList`, `CampaignsStackParamList`,
`ClientHomeStackParamList`). Os componentes consumidores tipam suas props com
`StackNavigationProp<...>` e `RouteProp<...>` para garantir autocomplete e
checagem em tempo de compilação.

## Tema e visual

`src/theme/index.ts` exporta:

- `colors` — paleta com primárias (dourado), neutros, estados, gradientes
- `spacing`, `radius`, `typography`, `shadow` — escalas consistentes
- Tudo é importado a partir de uma única origem para fácil rebranding

A linguagem visual segue o **dourado de marca** (`#D4A24C`) sobre fundo
neutro/claro, com uso pontual de cor escura (`colors.ink`) para CTAs primários.

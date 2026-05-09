# Software Design Document — appBarber

> Documentação técnica das funcionalidades implementadas até o momento.
>
> Este SDD descreve a arquitetura, modelos de dados, fluxos e decisões técnicas
> tomadas durante o desenvolvimento do app **appBarber** — um aplicativo
> mobile (Expo + React Native) para gestão de barbearias com perfis de
> **administrador**, **profissional** e **cliente**.

---

## Sumário

| #   | Documento                                              | Descrição |
| --- | ------------------------------------------------------ | --------- |
| 01  | [Arquitetura geral](./01-arquitetura.md)               | Stack, camadas, organização de pastas, contextos React e fluxo de dados. |
| 02  | [Autenticação](./02-autenticacao.md)                   | Login diferenciado por role (cliente x staff), hash determinístico de senha, JWT-like local, persistência de sessão. |
| 03  | [Máscara de telefone](./03-mascaras-telefone.md)       | Formatação BR de telefones nos formulários e exibição. |
| 04  | [Password Field](./04-password-field.md)               | Componente customizado que contorna bug do `secureTextEntry` no iOS Simulator com mascaramento manual. |
| 05  | [Tab Bar customizada](./05-tab-bar-customizada.md)     | Bottom-tab "soft-lift" com animações em Reanimated. |
| 06  | [Campanhas e Push Notifications](./06-campanhas-push.md) | Fluxo completo de criação, envio e exibição de campanhas via Expo Push API. |
| 07  | [Banco de dados](./07-banco-de-dados.md)               | Schema SQLite, migrações idempotentes, mapeamento Row ↔ Domain. |
| 08  | [Decisões técnicas](./08-decisoes-tecnicas.md)         | Registro informal das escolhas de design (ADRs). |
| 09  | [Tenants e carrossel pre-login](./09-tenants-carrossel-pre-login.md) | Roadmap completo para seleção pública de estabelecimento antes do login do cliente e separação multi-tenant. |

---

## Visão geral do produto

O **appBarber** é um app **offline-first** que atende três personas:

- **Administrador**: gerencia equipe, serviços, produtos, agenda, financeiro e
  envia campanhas (avisos, promoções) para os clientes.
- **Profissional**: visualiza sua própria agenda e histórico de atendimentos.
- **Cliente**: faz agendamentos, vê histórico, recebe avisos do estabelecimento
  via push notifications e banner na home.

Todos os dados ficam persistidos localmente em **SQLite** (`expo-sqlite`) e a
sessão de autenticação em **AsyncStorage**. O app não depende de backend para
funcionar — porém a feature de envio de push para múltiplos dispositivos
distintos exige um servidor central de tokens (não implementado neste estágio).

---

## Stack tecnológica

| Camada            | Tecnologia |
| ----------------- | ---------- |
| Runtime           | Expo SDK **54** + React Native, New Architecture habilitada |
| Linguagem         | TypeScript estrito |
| Navegação         | `@react-navigation/native` (stack + bottom-tabs) |
| Estado            | Context API (`AppContext`, `AuthContext`) |
| Persistência      | `expo-sqlite` (principal) + `@react-native-async-storage/async-storage` (sessão e flags de UX) |
| Animação          | `react-native-reanimated` ~4.1 + `react-native-worklets` 0.5 |
| Notificações      | `expo-notifications` ~0.32 + `expo-device` ~8 + Expo Push API |
| Identificadores   | `uuid` v4 |
| Iconografia       | `@expo/vector-icons` (MaterialCommunityIcons) |
| Gerenciador       | `pnpm` |

---

## Estrutura de pastas

```
appBarber/
├── App.tsx                         # entrypoint
├── app.json                        # config Expo (plugins, push, ícones)
├── babel.config.js
├── docs/sdd/                       # ⬅ este SDD
├── src/
│   ├── components/                 # UI reusable (FormField, PasswordField, CampaignBanner...)
│   ├── context/                    # AppContext, AuthContext
│   ├── database/                   # sqlite.ts, seed.ts, index.ts (orquestração)
│   ├── navigation/                 # AdminNavigator, ClientNavigator, ProfessionalNavigator, AuthNavigator, CustomTabBar
│   ├── screens/
│   │   ├── Account/
│   │   ├── Auth/                   # LoginScreen, RegisterScreen
│   │   ├── Campaigns/              # CampaignsListScreen, CampaignFormScreen
│   │   ├── Client/                 # ClientHomeScreen, ClientBookingFormScreen, ...
│   │   ├── Financial/
│   │   ├── Home/
│   │   ├── Products/
│   │   ├── Professional/
│   │   ├── Professionals/
│   │   ├── Schedule/
│   │   └── Services/
│   ├── services/                   # pushNotifications.ts (Expo Push API)
│   ├── theme/                      # cores, tipografia, sombras, gradientes
│   ├── types/                      # interfaces e ParamLists de navegação
│   └── utils/                      # helpers, storage, token (hash + sign)
└── package.json
```

---

## Linha do tempo das mudanças desta iteração

1. **Bootstrap**: corrigido erro *"App entry not found"* (versões de Reanimated /
   Worklets vs Expo SDK 54), reinstalação com `pnpm`.
2. **Máscara de telefone** em todos os inputs de telefone do app.
3. **Login diferenciado**: clientes entram com **nome + telefone**; admin e
   profissional usam **usuário + senha** (hash determinístico).
4. **Password Field**: contornar bug de input de senha no iOS Simulator via
   mascaramento manual com `•`.
5. **Migração SQLite**: colunas `username`, `password_hash`, `push_token` em
   `users`; nova tabela `campaigns`.
6. **Tab bar "soft-lift"**: ícone ativo sobe 4px, dot dourado, label fade-in.
7. **Campanhas + Push Notifications**: aba Admin com CRUD + envio via
   Expo Push API; banner dispensável no cliente.

Cada item está detalhado nos documentos a seguir.

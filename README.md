# appBarber

Aplicativo mobile para **gestão de barbearia** construído com **Expo** e **React Native**. Atende três perfis: **administrador**, **profissional** e **cliente**. Os dados ficam armazenados localmente em **SQLite** (offline-first), com sessão em **AsyncStorage** e suporte a **notificações push** para campanhas e avisos.

---

## Funcionalidades

### Administrador

- Dashboard e visão geral da operação.
- **Agenda**: criar, editar e acompanhar atendimentos.
- **Serviços**, **equipe** (profissionais com usuário e senha), **produtos**.
- **Financeiro**: lançamentos e visão do caixa.
- **Campanhas / Avisos**: criar mensagens (promoções, preços, novidades, horários, novos serviços), salvar rascunho e **enviar push** para clientes com token registrado.
- **Conta**: dados da sessão.

### Profissional

- Agenda própria e detalhes dos atendimentos.

### Cliente

- **Cadastro e login** com **nome + telefone** (máscara brasileira).
- Agendamento de atendimentos, lista de profissionais e histórico na **home**.
- **Banner de campanhas** na home (avisos enviados pela barbearia, com opção de dispensar).

---

## Stack tecnológica

| Área | Tecnologia |
|------|------------|
| Framework | [Expo SDK 54](https://docs.expo.dev/), React Native (New Architecture habilitada) |
| Linguagem | TypeScript |
| UI | React Native + tema próprio (`src/theme`), `@expo/vector-icons`, gradientes (`expo-linear-gradient`) |
| Navegação | `@react-navigation/native` (stack + bottom tabs) |
| Estado | Context API (`AppContext`, `AuthContext`) |
| Banco local | `expo-sqlite` |
| Sessão / flags | `@react-native-async-storage/async-storage` |
| Animações | `react-native-reanimated` ~4.1 |
| Notificações | `expo-notifications`, `expo-device`, Expo Push API |
| Calendário | `react-native-calendars` |
| Gerenciador de pacotes | **pnpm** |

---

## Pré-requisitos

- **Node.js** na faixa indicada no `package.json` (recomendado: **22**, conforme `.nvmrc`).
- **pnpm** instalado globalmente (`npm install -g pnpm`).
- Para desenvolvimento mobile:
  - **iOS**: Xcode + Simulador (push real exige **dispositivo físico**).
  - **Android**: Android Studio / emulador ou aparelho com USB debugging.

---

## Como rodar o projeto

### 1. Clonar e instalar dependências

```bash
git clone https://github.com/EmersonGaldino/appbarber.git
cd appbarber
```

Se usar NVM:

```bash
nvm use
```

Instalar pacotes:

```bash
pnpm install
```

Conferir compatibilidade com o Expo (opcional):

```bash
npx expo install --check
```

### 2. Iniciar o servidor de desenvolvimento

```bash
pnpm start
```

Ou diretamente por plataforma:

```bash
pnpm run ios      # Simulador iOS (via Xcode)
pnpm run android  # Emulador/dispositivo Android
pnpm run web      # Versão web (limitada para recursos nativos)
```

Há também um script auxiliar que fixa Node 22 antes do Expo:

```bash
pnpm run dev
```

### 3. Abrir no dispositivo

Com o bundler rodando, escaneie o QR Code com **Expo Go** (Android) ou a câmera / Expo Go (iOS).

---

## Login de demonstração (seed)

Na primeira execução com banco vazio, o app pode popular dados de exemplo (`src/database/seed.ts`). Credenciais típicas após o seed:

| Perfil | Como entrar |
|--------|----------------|
| **Admin** | Aba **Funcionário**: usuário `admin`, senha `admin123` |
| **Profissional** | Aba **Funcionário**: usuário gerado a partir do nome no seed (ex.: slug do nome), senha padrão **`barber123`** para contas criadas/migradas pelo seed |
| **Cliente** | Aba **Cliente**: nome e telefone conforme usuários de exemplo criados no seed, ou **cadastre-se** com nome + telefone |

> As senhas de staff são armazenadas como **hash determinístico** local (`src/utils/token.ts`). Em produção com backend, substitua por hash adequado no servidor.

---

## Estrutura do repositório

```
appBarber/
├── App.tsx                 # Raiz: providers + notificações (handler/canal Android)
├── app.json                # Config Expo (plugins, notificações)
├── index.ts                # Registro do app
├── docs/
│   └── sdd/                # Software Design Document (arquitetura, auth, DB, push…)
├── src/
│   ├── components/         # UI reutilizável (FormField, PasswordField, CampaignBanner…)
│   ├── context/            # AppContext (dados), AuthContext (sessão)
│   ├── database/           # SQLite, seed, carregamento/persistência
│   ├── navigation/         # Navigators + CustomTabBar
│   ├── screens/            # Telas por domínio (Auth, Client, Campaigns…)
│   ├── services/           # pushNotifications.ts (Expo Push API)
│   ├── theme/              # Cores, tipografia, sombras
│   ├── types/              # Tipos TypeScript e ParamLists
│   └── utils/              # helpers (máscara telefone), storage, token
├── assets/                 # Ícones e splash
├── package.json
├── pnpm-lock.yaml
├── babel.config.js
├── tsconfig.json
└── .nvmrc                  # Node 22 recomendado
```

---

## Documentação técnica (SDD)

A especificação de design e decisões está em **`docs/sdd/`**:

- [`docs/sdd/README.md`](docs/sdd/README.md) — índice geral
- Arquitetura, autenticação, máscaras, campo de senha, tab bar, campanhas push, banco de dados e ADRs

---

## Notificações push

- O app solicita permissão e registra um **Expo Push Token** por usuário (`User.pushToken`), persistido no SQLite.
- O admin envia campanhas pela aba **Avisos**; o envio usa a **Expo Push API** (`src/services/pushNotifications.ts`).
- **Limitação atual**: sem backend, os tokens ficam no SQLite **local**. Para alcançar clientes em **outros aparelhos**, é necessário um serviço que centralize tokens (veja detalhes em `docs/sdd/06-campanhas-push.md`).
- **iOS Simulator** não recebe push da Apple; use **iPhone físico** ou **Android** para testes reais.

---

## Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `pnpm start` | Inicia o Metro / Expo (`expo start`) |
| `pnpm run ios` | Abre no iOS |
| `pnpm run android` | Abre no Android |
| `pnpm run web` | Abre na web |
| `pnpm run dev` | Usa Node 22 via NVM e inicia o Expo |

---

## Solução de problemas

### Erro de versões / “App entry not found”

Alinhe dependências ao SDK do Expo:

```bash
npx expo install --fix
```

Use as versões indicadas em `package.json` (Reanimated ~4.1.x, Worklets 0.5.1, etc.).

### Erro de migração SQLite (“no such column…”)

O projeto usa migrações **idempotentes**. Se algo falhar, atualize o app para a última versão do código; em último caso, desinstale o app do simulador/dispositivo para recriar o banco (perda de dados locais).

### Senha não aparece ao digitar (Simulador iOS)

O projeto usa **`PasswordField`** com mascaramento manual para evitar bugs do `secureTextEntry` no simulador. Se testar em device físico e quiser habilitar autofill no futuro, avalie uma variante com campo nativo apenas em release.

---

## Repositório

- **GitHub:** [https://github.com/EmersonGaldino/appbarber](https://github.com/EmersonGaldino/appbarber)

---

## Licença

Este projeto está marcado como **`private`** no `package.json`. Defina a licença no repositório conforme a política da sua organização.

---

## Contribuiindo

1. Crie uma branch a partir de `main`.
2. Faça commits objetivos com mensagens claras.
3. Abra um Pull Request descrevendo mudanças e como testar.

Sugestão de escopo futuro: backend para sincronização de dados e centralização de tokens de push.

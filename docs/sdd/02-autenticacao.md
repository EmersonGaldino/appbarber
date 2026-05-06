# 02 — Autenticação

## Requisito original

> "Para logar apenas com o nome e telefone isso deve ser apenas para o cliente.
> Outros perfis precisam de usuário e senha. Assim que o admin criar um novo
> profissional, ele já preenche uma senha para ele logar junto com o nome de
> usuário."

## Modelo de dados

```ts
// src/types/index.ts
export type UserRole = 'admin' | 'professional' | 'client';

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  professionalId?: string;     // se role === 'professional'
  username?: string;           // login admin/profissional
  passwordHash?: string;       // hash determinístico
  pushToken?: string;          // Expo Push Token deste dispositivo
  createdAt: string;
}
```

Cliente **não** preenche `username` nem `passwordHash`. Staff (admin,
professional) **sempre** preenche ambos no momento da criação.

## Hash de senha

Como o app é offline-first sem backend, optamos por um **hash determinístico
local** com pepper, em vez de algoritmos com salt aleatório (que exigem
armazenamento extra do salt e dificultam comparação determinística simples).

```ts
// src/utils/token.ts
const PASSWORD_PEPPER = '...';      // string fixa do app

export function hashPassword(plain: string): string {
  return localHash(`${PASSWORD_PEPPER}.${plain}`);
}

export function verifyPassword(plain: string, hash?: string | null): boolean {
  if (!hash) return false;
  return hashPassword(plain) === hash;
}
```

> **Limitação consciente**: como o pepper está no bundle do app, este esquema
> protege contra leitura casual do banco mas não contra um atacante que tenha
> o binário. É adequado ao escopo offline-first do produto. Quando houver
> backend, deve ser substituído por um algoritmo com salt (`bcrypt`/`argon2`)
> realizado no servidor.

## Token de sessão

`signToken(payload)` cria um string base64 com `header.payload.signature`
inspirado em JWT, assinado localmente. `verifyToken(token)` valida a
assinatura e retorna o payload (com `sub`, `name`, `phone`, `role`, etc).

O token é guardado em `AsyncStorage` na chave `@appBarber:authToken` e
recuperado no boot do `AuthContext`.

## Fluxo de login

```
                ┌──────────────┐
                │ LoginScreen  │
                └──────┬───────┘
                       │ usuário escolhe modo
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
     loginClient(            loginStaff(
       name, phone)            username, password)
              │                 │
              ▼                 ▼
   busca user role='client'  busca user role∈{admin,professional}
   pelo nome+telefone        pelo username
              │                 │
   se encontrou:             se encontrou:
   ✓ issueSession(matched)   verifyPassword(plain, user.passwordHash)
                                 │
                                 ✓ issueSession(matched)
                                 ✗ "Usuário ou senha inválidos"
              │
              ▼
        AsyncStorage.setItem(TOKEN_KEY, token)
        setUser(matched)
              │
              ▼
        AppNavigator decide pela role
```

### Mensagens de erro tratadas

A função `loginClient` distingue cenários para dar feedback útil:

| Situação                                                 | Mensagem |
| -------------------------------------------------------- | -------- |
| Telefone vazio                                           | "Informe seu telefone." |
| Telefone existe mas pertence a admin/profissional        | "Esta conta é de funcionário. Entre na aba 'Funcionário'..." |
| Telefone confere mas nome não bate                       | "Telefone encontrado, mas o nome não confere com o cadastro." |
| Telefone não encontrado                                  | "Não encontramos uma conta com esse telefone. Cadastre-se..." |

## Cadastro de cliente

`registerClient(name, phone)`:

1. Valida nome e telefone (≥ 10 dígitos).
2. **Impede duplicidade por telefone apenas entre clientes**: o mesmo telefone
   pode aparecer em uma ficha de profissional sem conflitar com um cadastro de
   cliente.
3. Cria o `User` com `role: 'client'` e emite a sessão automaticamente.

## Cadastro de profissional (admin)

A tela `ProfessionalFormScreen` foi expandida para criar **dois registros**
relacionados:

```
ProfessionalFormScreen → handleSave():
  ┌─ valida nome, telefone, email, especialidades, horários
  │  E TAMBÉM username, password (mínimo 4 caracteres)
  │
  ├─ se NOVO:
  │    1) addProfessional(...)       → retorna Professional criado
  │    2) addUser({                  → cria User vinculado
  │         role: 'professional',
  │         professionalId: prof.id,
  │         username, passwordHash: hashPassword(password),
  │       })
  │
  └─ se EDIÇÃO:
       1) updateProfessional(id, ...)
       2) updateUser(linkedUserId, { name, phone, username, passwordHash? })
          (passwordHash só atualiza se admin tiver digitado nova senha)
```

A função `deleteProfessional(id)` foi atualizada para também remover o `User`
vinculado:

```ts
await commit((prev) => ({
  ...prev,
  professionals: prev.professionals.filter((p) => p.id !== id),
  users: prev.users.filter((u) => u.professionalId !== id),
}));
```

### Sugestão automática de username

Helper `buildUsernameFromName(name, existingUsernames)` em `seed.ts`:

1. Normaliza o nome removendo acentos (`NFD` + `replace`).
2. Concatena partes em snake_case (`joão silva` → `joao_silva`).
3. Se já existir, adiciona sufixo numérico (`joao_silva_2`).

Botão **"Sugerir"** chama esse helper e preenche o campo `username` na UI.

## Restauração de sessão (bootstrap)

```ts
// AuthContext.tsx
useEffect(() => {
  if (appLoading) return;       // espera dados carregarem do SQLite
  (async () => {
    const stored = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    const payload = verifyToken(stored);
    if (payload) {
      const matched = data.users.find((u) => u.id === payload.sub);
      if (matched) {
        setToken(stored);
        setUser(matched);
      } else {
        await AsyncStorage.removeItem(TOKEN_STORAGE_KEY); // user removido
      }
    }
    setBootstrapping(false);
  })();
}, [appLoading]);
```

E mantém o `user` em sincronia com edições posteriores:

```ts
useEffect(() => {
  if (!user) return;
  const fresh = data.users.find((u) => u.id === user.id);
  if (fresh && fresh !== user) setUser(fresh);
  if (!fresh) logout();          // foi deletado em outro lugar
}, [data.users, user]);
```

## Garantia de credenciais para staff legado

Em `database/seed.ts`, a função `ensureStaffCredentials(users)` é executada no
boot via `loadAppData`. Ela percorre todos os users com `role` ∈ {admin,
professional} e:

- Se `username` faltar, gera com `buildUsernameFromName`.
- Se `passwordHash` faltar, aplica a senha padrão (`DEFAULT_ADMIN_PASSWORD` ou
  `DEFAULT_PROFESSIONAL_PASSWORD`) hash-zada.

Isso permite que bases criadas antes da feature de senha continuem funcionando
sem perder dados.

## Diagrama de estados de autenticação

```
                  ┌──────────┐
                  │ loading  │  AppContext.loading || AuthContext.bootstrapping
                  └────┬─────┘
                       │ done
        ┌──────────────┴─────────────────┐
        │                                │
        ▼ token válido                   ▼ sem token / inválido
 ┌─────────────────┐              ┌──────────────────┐
 │ authenticated   │ ◀──────────  │ unauthenticated  │
 │ user, role,     │   loginX()   │ → AuthNavigator  │
 │ token presentes │              └──────────────────┘
 └─────────────────┘                      ▲
        │                                 │ logout()
        └─────────────────────────────────┘
```

## Arquivos relacionados

- `src/types/index.ts` — interface `User` com `username`, `passwordHash`, `pushToken`
- `src/utils/token.ts` — `signToken`, `verifyToken`, `hashPassword`, `verifyPassword`
- `src/context/AuthContext.tsx` — orquestra todo o fluxo
- `src/screens/Auth/LoginScreen.tsx` — UI dual (cliente / staff)
- `src/screens/Auth/RegisterScreen.tsx` — cadastro de cliente
- `src/screens/Professionals/ProfessionalFormScreen.tsx` — admin cria/edita staff
- `src/database/seed.ts` — `ensureStaffCredentials`, `buildUsernameFromName`

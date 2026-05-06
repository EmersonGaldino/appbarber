# 07 — Banco de dados

## Visão geral

O appBarber usa **SQLite** via `expo-sqlite` como persistência principal, e
**AsyncStorage** apenas para sessão de autenticação e flags de UX (ex.: lista
de campanhas dispensadas pelo cliente).

Nome do banco: `appBarber.db` (constante `DB_NAME` em `sqlite.ts`).

## Schema atual

```sql
-- Usuários (todos os perfis)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  role TEXT NOT NULL,                        -- 'admin' | 'professional' | 'client'
  professional_id TEXT,                      -- FK informal para professionals.id
  username TEXT,                             -- staff only
  password_hash TEXT,                        -- staff only
  push_token TEXT,                           -- Expo Push Token deste device
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Serviços oferecidos
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  duration INTEGER NOT NULL,                 -- minutos
  active INTEGER NOT NULL,                   -- 0/1
  created_at TEXT NOT NULL
);

-- Profissionais (perfil de trabalho)
CREATE TABLE IF NOT EXISTS professionals (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  specialties_json TEXT NOT NULL,            -- JSON array
  working_hours_json TEXT NOT NULL,          -- JSON object
  active INTEGER NOT NULL,                   -- 0/1
  created_at TEXT NOT NULL
);

-- Produtos comercializados
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  cost_price REAL NOT NULL,
  stock INTEGER NOT NULL,
  category TEXT NOT NULL,
  active INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

-- Atendimentos / agendamentos
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_user_id TEXT,                       -- FK para users.id (cliente logado)
  professional_id TEXT NOT NULL,
  service_ids_json TEXT NOT NULL,            -- JSON array de service ids
  date TEXT NOT NULL,                        -- 'yyyy-mm-dd'
  start_time TEXT NOT NULL,                  -- 'HH:mm'
  end_time TEXT NOT NULL,
  status TEXT NOT NULL,                      -- 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  total_value REAL NOT NULL,
  payment_method TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);

-- Lançamentos financeiros
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL,                        -- 'income' | 'expense'
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  payment_method TEXT,
  appointment_id TEXT,
  created_at TEXT NOT NULL
);

-- Campanhas / push notifications (NOVA)
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL,                        -- 'promo'|'price_update'|'news'|'schedule'|'new_service'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  valid_until TEXT,                          -- ISO date para promo
  status TEXT NOT NULL,                      -- 'draft' | 'sent' | 'failed'
  sent_at TEXT,
  recipients_count INTEGER,
  delivered_count INTEGER,
  error_message TEXT,
  created_at TEXT NOT NULL
);
```

## Estratégia de migrações

### `runMigrations(db)`

Executado a cada `getDb()`. Faz duas coisas:

1. **Cria tabelas com `CREATE TABLE IF NOT EXISTS`** — não destrói nada se já
   existirem, mesmo se o schema da declaração for mais novo (SQLite ignora a
   declaração).
2. **Adiciona colunas com `tryAddColumn(db, table, col, type)`** —
   helper que executa `ALTER TABLE ... ADD COLUMN` e captura erro se a coluna
   já existir.

```ts
async function tryAddColumn(db: SQLiteDatabase, table: string, col: string, type: string) {
  try {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${col} ${type};`);
  } catch (e) {
    // ignora "duplicate column"
  }
}

await tryAddColumn(db, 'appointments', 'client_user_id', 'TEXT');
await tryAddColumn(db, 'users', 'username', 'TEXT');
await tryAddColumn(db, 'users', 'password_hash', 'TEXT');
await tryAddColumn(db, 'users', 'push_token', 'TEXT');
```

### Bug histórico corrigido: `no such column: username`

**Sintoma**: `loadAppData: [Error: Calling the 'execAsync' function has failed
→ Caused by: no such column: username]`.

**Causa**: dentro de um único `execAsync(...)` multi-statement, a sequência
era:

```sql
CREATE TABLE IF NOT EXISTS users (..., username TEXT, ...);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);  -- ⚠️
```

Em bases já existentes (criadas antes da feature), o `CREATE TABLE` é no-op e
mantém a tabela velha sem a coluna `username`. O subsequente `CREATE INDEX`
falha → o `execAsync` aborta inteiro → o `tryAddColumn` posterior nunca roda.

**Correção**:

1. Mover o `CREATE INDEX` para fora do `execAsync` principal, em um
   `try/catch` próprio executado **depois** dos `tryAddColumn`.
2. Tornar `getDb()` resiliente — se `runMigrations` falhar, **invalidar** o
   cache da instância para que a próxima chamada tente de novo:

```ts
let dbInstance: Promise<SQLiteDatabase> | null = null;

function getDb(): Promise<SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = (async () => {
      const db = await openDatabaseAsync(DB_NAME);
      try {
        await runMigrations(db);
      } catch (e) {
        dbInstance = null;          // ⬅ não cacheia em estado inválido
        throw e;
      }
      return db;
    })();
  }
  return dbInstance;
}
```

## Mapeamento Row ↔ Domain

Cada tabela tem um par de funções:

```ts
type UserRow = { id: string; name: string; ...; created_at: string };

function rowToUser(r: UserRow): User { /* conversão snake_case → camelCase */ }
```

Saída de `loadAllFromSqlite()` retorna `AppData` 100% normalizado, pronto para
o React/UI. Entrada de `saveAllToSqlite(data)` converte de volta. Entre as
camadas, **nada do snake_case do banco vaza para a UI**.

### JSON colunas

Listas e objetos complexos são armazenados como JSON-string em colunas TEXT:

- `professionals.specialties_json`
- `professionals.working_hours_json`
- `appointments.service_ids_json`

`rowToProfessional` faz `JSON.parse(r.specialties_json)` com fallback para `[]`
caso a string esteja inválida.

## Operação `saveAllToSqlite(data)`

Estratégia: **DELETE + INSERT em transação**.

```ts
await db.withTransactionAsync(async () => {
  await db.execAsync(`
    DELETE FROM campaigns;
    DELETE FROM transactions;
    DELETE FROM appointments;
    DELETE FROM products;
    DELETE FROM professionals;
    DELETE FROM services;
    DELETE FROM users;
  `);

  for (const u of data.users) {
    await db.runAsync(`INSERT INTO users (...) VALUES (?, ?, ?, ...)`, ...);
  }
  // ... outros INSERTs
});
```

> **Por que truncar tudo?** Mantém o código de persistência simples e
> consistente. Como `AppData` é o snapshot autoritativo em memória, gravar
> tudo a cada commit não corrompe; a transação garante atomicidade.
>
> **Trade-off**: para apps com bases muito grandes (milhares de
> appointments), uma estratégia diff-based seria mais eficiente. No escopo
> atual (centenas de registros), a abordagem simples é mais que suficiente.

## Migração legacy: AsyncStorage → SQLite

Versões muito antigas do app usavam `AsyncStorage` puro. `database/index.ts`
detecta e migra automaticamente:

```ts
async function loadAppData(): Promise<AppData> {
  const fromSqlite = await loadAllFromSqlite();
  if (hasAnyRecords(fromSqlite)) {
    return ensureStaffCredentials(fromSqlite);     // garante user/pwd para staff
  }

  const legacy = await loadFromAsyncStorage();
  if (hasAnyRecords(legacy)) {
    const normalized: AppData = {
      ...legacy,
      users: legacy.users ?? [],
      campaigns: legacy.campaigns ?? [],           // novo campo
    };
    await saveAllToSqlite(normalized);
    await AsyncStorage.removeItem(STORAGE_KEY);    // limpa fonte legacy
    return normalized;
  }

  // base vazia → semeia dados de exemplo
  if (!await hasSeededFlag()) {
    const seed = buildExampleData();
    await saveAllToSqlite(seed);
    await markSeededFlag();
    return seed;
  }
  return defaultData;
}
```

## Seed de exemplo (`buildExampleData`)

`src/database/seed.ts` cria:

- 1 admin (`username: 'admin'`, senha padrão hashada).
- 2-3 profissionais (com User vinculado para login).
- Serviços, produtos, alguns appointments.
- `campaigns: []` (vazio).

## `defaultData` (`utils/storage.ts`)

```ts
export const defaultData: AppData = {
  users: [],
  services: [],
  professionals: [],
  products: [],
  appointments: [],
  transactions: [],
  campaigns: [],
};
```

Usado como fallback quando não há nada no SQLite e o seed já foi marcado.

## AsyncStorage — chaves usadas

| Chave                                          | Conteúdo                                      |
| ---------------------------------------------- | --------------------------------------------- |
| `@appBarber:authToken`                         | Token assinado da sessão atual                |
| `@appBarber:seeded`                            | Flag booleana (`'true'` | ausente)            |
| `@appBarber:dismissedCampaigns:<userId>`       | JSON `string[]` de campaigns IDs dispensados  |
| `@appBarber:storage` *(legacy)*                | Snapshot completo do `AppData` (versões antigas) — limpo na migração |

## Boas práticas adotadas

1. **Sempre `IF NOT EXISTS`** em CREATE TABLE/INDEX.
2. **Sempre `tryAddColumn` para evolução de schema** — nunca DROP/RECREATE.
3. **Funções `rowToX` e `xToRow` próximas das definições de tipo Row** — fácil
   manter quando algum campo muda.
4. **Transações para gravações compostas** (`db.withTransactionAsync`).
5. **Não usar SQL inline em screens** — toda interação SQL passa pela camada
   `database/`.

## Arquivos relacionados

- `src/database/sqlite.ts` — schema, migrações, load/save
- `src/database/seed.ts` — dados iniciais e `ensureStaffCredentials`
- `src/database/index.ts` — orquestração e migração legacy
- `src/utils/storage.ts` — `defaultData` e operações em AsyncStorage
- `src/types/index.ts` — `AppData` e entidades

# 08 — Decisões técnicas (ADRs informais)

Registro consolidado das principais decisões de arquitetura, com contexto e
trade-offs. Pequeno e revisitável — pode ser expandido quando aparecer algo
relevante.

---

## ADR 01 — Offline-first com SQLite

**Contexto**: o produto é para barbearias pequenas/médias; muitas operam em
locais com conexão instável.

**Decisão**: usar `expo-sqlite` como persistência principal, sem backend.

**Consequências**:
- ✓ App funciona em qualquer lugar.
- ✓ Operações instantâneas (sem latência de rede).
- ✗ Cada device é uma "ilha" — sincronização entre devices não existe.
- ✗ Push notifications cross-device dependem de um backend futuro.

---

## ADR 02 — Context API em vez de Redux/Zustand

**Contexto**: app de tamanho médio (~30 telas), com mutações relativamente
simples.

**Decisão**: dois Contexts (`AppContext` para dados, `AuthContext` para
sessão), commit-style com fila de gravações.

**Consequências**:
- ✓ Zero boilerplate, fácil para colaboradores entrarem.
- ✓ Não precisamos de devtools especiais.
- ✗ Re-render de toda a árvore quando `data` muda. Aceitável no escopo
  atual; se virar gargalo, considerar `zustand` com seletores.

---

## ADR 03 — Hash determinístico em vez de bcrypt

**Contexto**: armazenar senhas de staff localmente sem backend.

**Decisão**: `localHash(pepper + password)` com pepper fixo no bundle.

**Consequências**:
- ✓ Comparação direta (`hashPassword(input) === stored`).
- ✓ Não precisa armazenar salt.
- ✗ Mesma senha gera o mesmo hash → vulnerável a rainbow tables se o pepper
  vazar.
- ✗ Pepper no bundle = qualquer um com o APK pode extrair.
- → **Quando houver backend**: trocar por bcrypt/argon2 server-side.

---

## ADR 04 — Não usar `secureTextEntry` nativo

**Contexto**: bug recorrente do iOS Simulator (e historicamente do Android com
`fontWeight` numérico) em que o `TextInput` com `secureTextEntry` simplesmente
não recebe input.

**Decisão**: `PasswordField` próprio com mascaramento manual (`•` repetido) e
toggle interno de visibilidade.

**Consequências**:
- ✓ Funciona em todas as plataformas e simuladores.
- ✓ Controle total da UX.
- ✗ Não suporta autofill de gerenciadores de senha.
- ✗ Duplicação de ~50 linhas em `LoginScreen` (variante `Glass`).

---

## ADR 05 — Telefone armazenado mascarado

**Contexto**: campo `phone` é exibido em UI, usado para login do cliente e
identificação em appointments.

**Decisão**: `User.phone` é guardado já formatado (`(11) 98765-4321`).
Comparações sempre normalizam via `normalizePhone(s)` (`replace(/\D/g, '')`).

**Consequências**:
- ✓ UI escreve e lê direto, sem formatação extra.
- ✗ Comparações precisam normalizar. Mitigado por usar a função utilitária
  consistentemente.

---

## ADR 06 — Migrações idempotentes (`tryAddColumn`)

**Contexto**: schema evolui sem forçar usuários a "limpar dados" ou reinstalar.

**Decisão**: `CREATE TABLE IF NOT EXISTS` + `tryAddColumn` (com try/catch
ignorando "duplicate column") em cada boot.

**Consequências**:
- ✓ Adicionar coluna nova é uma única linha.
- ✓ Zero risco de quebrar bases existentes.
- ✗ Não suporta migrações que renomeiam ou removem colunas — exigiria
  estratégia mais complexa (recriar tabela, copiar dados).
- ✗ Não há controle de versão de schema (`PRAGMA user_version`); poderia ser
  útil quando migrações ficarem mais complexas.

---

## ADR 07 — `getDb()` resiliente a falhas de migração

**Contexto**: bug em que uma migração quebrada deixava `dbInstance` cacheado
em estado inválido, fazendo todas as chamadas subsequentes falharem.

**Decisão**: se `runMigrations` lançar exception, **invalidar o cache**
(`dbInstance = null`) e re-lançar; assim a próxima chamada tenta de novo (e
pode ter sucesso depois de hot-reload com código corrigido).

**Consequências**:
- ✓ Erros de migração não corrompem o estado do app inteiro.
- ✓ Fácil debugar — uma vez corrigido o código, a próxima chamada já
  funciona.

---

## ADR 08 — Tab bar customizada (não usar `tabBarLabel`/`tabBarIcon`)

**Contexto**: queríamos animações ricas (lift, dot, fade-in da label) que o
`tabBarLabel` padrão do React Navigation não permite.

**Decisão**: prop `tabBar={(props) => <CustomTabBar ...>}` com mapeamento
externo de ícones.

**Consequências**:
- ✓ Controle total da renderização.
- ✓ Reaproveitada por todos os 3 navigators (admin/client/professional).
- ✗ Perde algumas features automáticas (tab focus styles vindos do tema do
  React Navigation). Mitigado: customizamos manualmente.

---

## ADR 09 — Push API direto do client (sem backend)

**Contexto**: usuário pediu "push real via Expo".

**Decisão**: o admin chama `https://exp.host/--/api/v2/push/send`
diretamente, com os tokens dos clientes lidos do SQLite local.

**Consequências**:
- ✓ Nenhum servidor para manter.
- ✓ Toda a UI/UX já está pronta para um futuro backend; basta substituir a
  função `collectClientPushTokens(users)` por uma chamada HTTP.
- ✗ Não funciona entre devices distintos (admin no celular A não vê tokens
  do cliente no celular B).
- ✗ Sem rate-limiting confiável; em uso real precisaria de access token da
  Expo.
- → Documentado no SDD 06 como limitação consciente.

---

## ADR 10 — Pasta `services/` separada de `utils/`

**Contexto**: precisávamos de um lugar pra módulos que fazem I/O externo
(push API).

**Decisão**: criar `src/services/` para módulos que fazem chamadas HTTP/SDK.
Mantemos `src/utils/` apenas para funções puras (mask, hash, format).

**Consequências**:
- ✓ Separação clara: `utils` é testável sem mocks; `services` exige mocks.
- → Próximos módulos a entrarem em `services/`: integrações com backend
  futuro, gateways de pagamento, calendário do sistema, etc.

---

## ADR 11 — Mensagens em português

**Contexto**: app é totalmente em pt-BR (público brasileiro).

**Decisão**: todas as labels, mensagens de erro, e até os comentários de
domínio ficam em português. Comentários técnicos (sobre detalhes de
implementação) podem ser em inglês.

**Consequências**:
- ✓ Equipe e produto alinhados.
- ✗ Não é internacionalizável imediatamente; quando precisar de i18n, todo
  texto que está hard-coded precisará ir para um catálogo (`react-i18next`
  ou similar).

---

## Lista de melhorias futuras anotadas

Estes itens não são decisões tomadas — são pontos identificados durante o
trabalho que valem a pena revisitar.

- **Backend mínimo** para sincronização de tokens entre devices (Expo Push
  fica utilizável de verdade).
- **Migração com versão** (`PRAGMA user_version`) quando o schema crescer.
- **Estratégia de gravação diff** se o `AppData` ficar grande.
- **`AppContext` por domínio** (`useUsers()`, `useCampaigns()`, ...) para
  reduzir re-renders se virar gargalo.
- **i18n** quando expandir para outros mercados.
- **Tests E2E** com Detox ou Maestro nas telas críticas (login, agendar,
  envio de campanha).
- **Hoisting do mapa de cores por `CampaignType`** se aparecer uma 4ª view
  consumindo o mesmo dado.
- **Auditoria de senhas** — quando houver backend, migrar staff para hash
  com salt.

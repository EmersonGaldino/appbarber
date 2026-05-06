# 03 — Máscara de telefone

## Requisito original

> "Senti falta de máscara nos inputs de telefone."

## Função utilitária

Toda a lógica está em `src/utils/helpers.ts`:

```ts
export function maskPhoneBR(value: string): string {
  const digits = (value ?? '').replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    // Telefone fixo: (DD) XXXX-XXXX
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  // Celular: (DD) 9XXXX-XXXX
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function unmaskPhone(value: string): string {
  return (value ?? '').replace(/\D/g, '');
}

export function formatPhoneBR(value: string): string {
  return maskPhoneBR(value);
}

export const PHONE_MASK_MAX_LENGTH = 15;  // "(XX) XXXXX-XXXX"
```

### Comportamento

| Entrada bruta   | Saída              |
| --------------- | ------------------ |
| `""`            | `""`               |
| `"1"`           | `"(1"`             |
| `"11"`          | `"(11"`            |
| `"1199"`        | `"(11) 99"`        |
| `"11987654321"` | `"(11) 98765-4321"` |
| `"1133334444"`  | `"(11) 3333-4444"` |
| `"abc11999"`    | `"(11) 999"` (extrai apenas dígitos) |

## Onde foi aplicado

A máscara é usada **na escrita** (input controlado) e **na exibição**.

### Inputs (escrita)

```tsx
<FormField
  label="Telefone"
  value={phone}
  onChangeText={(v) => setPhone(maskPhoneBR(v))}
  placeholder="(00) 00000-0000"
  keyboardType="phone-pad"
  maxLength={PHONE_MASK_MAX_LENGTH}
/>
```

Telas com input mascarado:

- `src/screens/Auth/LoginScreen.tsx` (campo telefone do cliente)
- `src/screens/Auth/RegisterScreen.tsx`
- `src/screens/Professionals/ProfessionalFormScreen.tsx`
- `src/screens/Schedule/AppointmentFormScreen.tsx` (`clientPhone`)

### Exibição (leitura)

```tsx
<Text>{maskPhoneBR(user.phone)}</Text>
```

Telas com display formatado:

- `src/screens/Account/AccountScreen.tsx`

## Estratégia de armazenamento

**O telefone é armazenado mascarado** no SQLite (formato com parênteses, espaço
e traço). Para comparações e buscas, sempre usamos `unmaskPhone()` ou
`replace(/\D/g, '')` ad-hoc — é o que `AuthContext.normalizePhone()` faz.

```ts
// AuthContext.tsx
function normalizePhone(s: string): string {
  return (s ?? '').replace(/\D/g, '').trim();
}
```

> **Trade-off**: armazenar mascarado simplifica a UI (basta `value={phone}`)
> mas exige normalização em buscas. Optamos por isso porque a UI escreve e lê
> mascarado em 90% dos lugares.

## Edge cases tratados

1. **Pasted text com formato livre**: `replace(/\D/g, '')` joga fora qualquer
   coisa que não for dígito antes de aplicar o template.
2. **Limite de 11 dígitos**: `slice(0, 11)` impede que digitar muito gere
   strings inválidas (ex: 12 dígitos).
3. **`maxLength={15}`** impede colar string muito longa que confundiria
   o cursor.
4. **Caracteres apagados de trás para frente**: como reaplicamos a máscara a
   cada keystroke, o usuário pode apagar do meio sem efeitos colaterais.

## Por que não uma lib externa?

Avaliamos `react-native-mask-input` mas o trade-off não compensava:

- Adicionar 1 dependência só para máscara de telefone, quando 20 linhas
  resolvem o problema BR.
- Manter controle total da UX (ex: mostrar `(` já com 1 dígito).
- Funções podem ser reusadas para `formatPhoneBR()` em exibição estática.

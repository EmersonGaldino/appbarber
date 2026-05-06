# 04 — Password Field

## Bug original

> "Ao tentar digitar a senha não está saindo nada."
> "Ainda não está digitando no input de senha."
> "No campo de senha ele pisca o cursor porém não digita nada."

**Cenário reproduzível**: iOS Simulator, campo `<TextInput secureTextEntry>`,
mesmo com teclado virtual ativo (Cmd+K → desligar Hardware Keyboard).

## Investigação e tentativas

### Tentativa 1 — bug Android conhecido (`fontWeight` numérico)
Suspeitamos do bug clássico do RN onde `secureTextEntry={true}` com
`fontWeight: 700` derruba inputs no Android. Mitigação aplicada:

```tsx
<TextInput
  secureTextEntry
  style={{ fontWeight: 'normal', fontFamily: 'System' }}
/>
```

❌ **Sem efeito** no iOS Simulator.

### Tentativa 2 — interferência de autofill (Strong Password)
Suspeitamos do iOS Strong Password tentando "ajudar" e bloqueando entrada.
Aplicamos um conjunto agressivo de props:

```tsx
<TextInput
  secureTextEntry
  textContentType="none"
  autoComplete="off"
  importantForAutofill="no"
  passwordRules=""
  autoCorrect={false}
  spellCheck={false}
  autoCapitalize="none"
/>
```

❌ **Sem efeito** no iOS Simulator.

### Tentativa 3 (final) — abandono do `secureTextEntry`
Concluímos que o problema é específico do iOS Simulator e algum estado interno
das views nativas envolvendo `secureTextEntry`. Trocamos para
**mascaramento manual em JavaScript** e nunca mais usamos a flag nativa.

## Solução: `PasswordField.tsx`

Componente dedicado em `src/components/PasswordField.tsx`:

```tsx
const MASK_CHAR = '\u2022';   // bullet "•"

export function PasswordField({ value, onChangeText, label, error, ... }) {
  const [hidden, setHidden] = useState(true);

  const realValue = value ?? '';
  const displayValue = hidden
    ? MASK_CHAR.repeat(realValue.length)
    : realValue;

  const handleChangeText = (next: string) => {
    if (!hidden) {
      onChangeText(next);
      return;
    }
    // Modo "oculto": comparamos comprimento para inferir adição/remoção.
    if (next.length > displayValue.length) {
      // O usuário digitou X caracteres novos no FINAL.
      const added = next.slice(displayValue.length);
      onChangeText(realValue + added);
    } else if (next.length < displayValue.length) {
      // Backspace removeu (displayValue.length - next.length) chars.
      const removed = displayValue.length - next.length;
      onChangeText(realValue.slice(0, realValue.length - removed));
    }
    // Se não mudou de tamanho, ignora (proteção contra autofill).
  };

  return (
    <View style={styles.container}>
      {label && <Text>{label}</Text>}
      <View style={wrapStyle}>
        <TextInput
          value={displayValue}                  // ← mostra apenas os bullets
          onChangeText={handleChangeText}
          // SEM secureTextEntry!
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          textContentType="none"
          autoComplete="off"
          importantForAutofill="no"
          passwordRules=""
        />
        <Pressable onPress={() => setHidden(h => !h)}>
          <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} />
        </Pressable>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}
```

### Pontos críticos da implementação

1. **`value` prop interno é o mascarado** (`displayValue`); o
   componente pai só recebe e armazena o `realValue` real.
2. **Inferência por comprimento**: comparar `next.length` com
   `displayValue.length` é mais robusto do que tentar diff por posição,
   especialmente no Android onde o cursor pode pular.
3. **Sem `Animated.View` envolvendo o `TextInput`**: a versão original
   tinha um wrapper animado de Reanimated; com mascaramento manual, isso
   causou sobreposição de re-renders e perda de input. Substituímos por
   `View` puro com estilo condicional (`focused ? borderActive : border`).
4. **Nunca usar `secureTextEntry`**.

## Variante: `GlassPasswordField` (LoginScreen)

A `LoginScreen` tem um visual "glass" (fundo translúcido sobre gradiente)
diferente dos outros formulários. Em vez de criar uma prop temática no
`PasswordField`, criamos uma **variante inline** dentro de
`LoginScreen.tsx`:

```tsx
const GlassPasswordField = React.forwardRef<TextInput, GlassPasswordProps>(
  (props, ref) => {
    const [hidden, setHidden] = useState(true);
    // ...mesma lógica do PasswordField, mas com estilo glass
  }
);
```

Por que duplicar em vez de generalizar? A `LoginScreen` precisa de
animações de focus específicas e ícone customizado. Criar uma prop
`variant: 'default' | 'glass'` poluiria o componente principal. A duplicação
é pequena (50 linhas) e localizada.

## Onde é usado

| Tela                                                | Componente            |
| --------------------------------------------------- | --------------------- |
| `screens/Auth/LoginScreen.tsx` (modo staff)         | `GlassPasswordField` (inline) |
| `screens/Professionals/ProfessionalFormScreen.tsx`  | `PasswordField`       |

## API pública do `PasswordField`

```ts
interface PasswordFieldProps {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  error?: string;
  autoFocus?: boolean;
  returnKeyType?: ReturnKeyType;
  onSubmitEditing?: () => void;
}
```

Toggle do olho (mostrar/ocultar) é estado **local** do componente — não é
controlado pelo pai.

## Por que não uma lib?

Avaliamos `react-native-paper` (TextInput com `secureTextEntry`) e
`react-native-elements` — ambas usam `secureTextEntry` por baixo, então têm o
mesmo bug. A solução manual nos dá controle total.

## Trade-offs aceitos

- **Não suporta autofill de gerenciadores de senha** (Bitwarden, 1Password,
  Keychain). É aceitável porque o cenário primário é staff digitando senha
  curta de 4-6 caracteres em ambiente confiável.
- **Não exibe a senha ao usuário durante a digitação** (a menos que ele
  toque no olho). Isso é, na verdade, o comportamento esperado.
- **Performance**: `MASK_CHAR.repeat(N)` é O(N), aceitável para senhas
  realistas (< 100 chars).

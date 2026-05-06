# 05 — Tab Bar customizada (soft-lift)

## Requisito original

> "O menu seria legal darmos mais evidência ao menu selecionado deixando ele
> mais alto quando estiver selecionado."

Após uma primeira tentativa rejeitada com a frase "ficou horrível, precisa
melhorar muito", chegamos ao design final descrito abaixo.

## Conceito visual

Animação **soft-lift**:

- Tabs **inativos**: ícone neutro (`textMuted`), sem label, sem dot.
- Tab **ativo**: ícone sobe **4px**, escala **1.08×**, vira `colors.primary`,
  aparece um **dot dourado** (4×4 px) abaixo do ícone, e o **label** desliza
  para baixo com fade-in.

```
   inativo            ativo
   ┌─────┐         ┌─────┐
   │  ✂️  │         │  ✂️  │   ← sobe 4px, color: primary, scale 1.08
   │     │         │  •  │   ← dot dourado
   │     │         │Cortes│   ← label aparece (slide + fade)
   └─────┘         └─────┘
```

## Implementação

Arquivo: `src/navigation/CustomTabBar.tsx`

```tsx
function TabButton({ icon, label, focused, onPress }) {
  const progress = useSharedValue(focused ? 1 : 0);

  React.useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, {
      damping: 18,
      stiffness: 240,
      mass: 0.6,
    });
  }, [focused, progress]);

  // Ícone: translateY(-4px) + scale(1.08) quando ativo
  const iconWrapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, -4], Extrapolate.CLAMP) },
      { scale: interpolate(progress.value, [0, 1], [1, 1.08], Extrapolate.CLAMP) },
    ],
  }));

  // Dot: aparece e cresce
  const dotStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.2, 1], Extrapolate.CLAMP) }],
  }));

  // Label: fade + slide
  const labelStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: interpolate(progress.value, [0, 1], [-4, 0], Extrapolate.CLAMP) }],
  }));

  return (
    <PressableScale haptic={null} onPress={onPress} style={styles.tabBtn} scale={0.94}>
      <Animated.View style={[styles.iconWrap, iconWrapStyle]}>
        <MaterialCommunityIcons
          name={icon}
          size={24}
          color={focused ? colors.primary : colors.textMuted}
        />
      </Animated.View>
      <Animated.View style={[styles.dot, dotStyle]} pointerEvents="none" />
      <Animated.Text numberOfLines={1} style={[styles.label, labelStyle]}>
        {label}
      </Animated.Text>
    </PressableScale>
  );
}
```

## Estilo

```ts
tabBar: {
  flexDirection: 'row',
  paddingHorizontal: 4,
  paddingTop: 10,             // ⬅ espaço extra para o ícone subir
},
tabBtn: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'flex-start',
  paddingVertical: 4,
  minHeight: 56,              // ⬅ mantém altura constante
},
dot: {
  width: 4, height: 4, borderRadius: 2,
  backgroundColor: colors.primary,
  marginTop: 4,
},
label: {
  fontSize: 11,
  fontWeight: '800',
  color: colors.primary,
  letterSpacing: 0.2,
  marginTop: 3,
},
```

A `tabBarWrap` aplica também a borda superior, sombra e respeita o
`safe area inset` inferior:

```tsx
<View style={[styles.tabBarWrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
```

## Configuração de ícones por aba

A tab bar é **agnóstica** ao set de ícones — recebe um mapa via prop:

```tsx
const TAB_ICONS: Record<string, TabIconConfig> = {
  Home: { icon: 'view-dashboard', label: 'Início' },
  Schedule: { icon: 'calendar-month', label: 'Agenda' },
  // ...
  Campaigns: { icon: 'bullhorn', label: 'Avisos' },
  Account: { icon: 'account-circle', label: 'Conta' },
};

<Tab.Navigator
  tabBar={(props) => <CustomTabBar {...props} iconsByName={TAB_ICONS} />}
>
```

Isso permite que cada navigator (`AdminNavigator`, `ClientNavigator`,
`ProfessionalNavigator`) use seu próprio mapa de ícones e a mesma tab bar.

## Haptics

Ao tocar em uma aba, dispara `Haptics.selectionAsync()` (ignorando erros). É
uma micro-interação cara em UX que diferencia o app.

```tsx
onPress={() => {
  Haptics.selectionAsync().catch(() => {});
  // ... navegação ...
}}
```

## Trade-offs

- **8 abas no Admin**: com a adição de "Avisos", o `AdminNavigator` agora
  tem 8 abas. Em telas de 320px de largura, cada uma fica com ~40px — o
  ícone de 24px ainda cabe confortavelmente, mas a label `Profissionais`
  precisa caber em 11px. Aceitável; futuramente pode-se agrupar
  Produtos/Equipe num menu de "Cadastros".
- **Spring com mass 0.6**: testamos `damping=20, stiffness=180` (mais lento)
  e `damping=14, stiffness=300` (com bounce). O atual dá feedback rápido
  (~250ms até estabilizar) sem overshoot perceptível.

## Arquivos relacionados

- `src/navigation/CustomTabBar.tsx` — componente principal
- `src/navigation/AdminNavigator.tsx`, `ClientNavigator.tsx`,
  `ProfessionalNavigator.tsx` — consumidores da tab bar customizada
- `src/components/PressableScale.tsx` — wrapper de toque com escala

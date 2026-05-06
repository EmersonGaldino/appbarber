import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ScrollView,
  Alert,
  Keyboard,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { colors, radius, spacing, typography } from '../../theme';
import { PressableScale } from '../../components/PressableScale';
import { useAuth } from '../../context/AuthContext';
import type { AuthStackParamList } from '../../types';
import { maskPhoneBR, PHONE_MASK_MAX_LENGTH } from '../../utils/helpers';

type Nav = StackNavigationProp<AuthStackParamList, 'Login'>;

/**
 * Tela de login com:
 * - Fundo escuro com gradiente premium (ink)
 * - Orbs douradas pulsando + flutuando (efeito "spotlight")
 * - Logo da marca girando suavemente em loop
 * - Card translúcido (BlurView) com inputs com foco animado
 * - Transições suaves dos campos (slide + fade)
 */
type LoginMode = 'client' | 'staff';

export function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { loginClient, loginStaff } = useAuth();

  const [mode, setMode] = useState<LoginMode>('client');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // ---------- Animações decorativas ----------
  const orb1 = useSharedValue(0);
  const orb2 = useSharedValue(0);
  const logoSpin = useSharedValue(0);
  const sheetY = useSharedValue(40);
  const sheetOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(20);
  const sparkle = useSharedValue(0);

  useEffect(() => {
    orb1.value = withRepeat(
      withTiming(1, { duration: 6500, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
    orb2.value = withRepeat(
      withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
    logoSpin.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 3200, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    sparkle.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );

    titleOpacity.value = withDelay(150, withTiming(1, { duration: 600 }));
    titleY.value = withDelay(150, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));
    sheetOpacity.value = withDelay(350, withTiming(1, { duration: 600 }));
    sheetY.value = withDelay(350, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, [orb1, orb2, logoSpin, sparkle, titleOpacity, titleY, sheetOpacity, sheetY]);

  const orb1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(orb1.value, [0, 1], [-30, 30], Extrapolate.CLAMP) },
      { translateY: interpolate(orb1.value, [0, 1], [-20, 20], Extrapolate.CLAMP) },
      { scale: interpolate(orb1.value, [0, 1], [1, 1.18], Extrapolate.CLAMP) },
    ],
    opacity: interpolate(orb1.value, [0, 1], [0.55, 0.85], Extrapolate.CLAMP),
  }));

  const orb2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(orb2.value, [0, 1], [40, -40], Extrapolate.CLAMP) },
      { translateY: interpolate(orb2.value, [0, 1], [30, -10], Extrapolate.CLAMP) },
      { scale: interpolate(orb2.value, [0, 1], [1.1, 0.9], Extrapolate.CLAMP) },
    ],
    opacity: interpolate(orb2.value, [0, 1], [0.4, 0.65], Extrapolate.CLAMP),
  }));

  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(logoSpin.value, [0, 1], [-6, 6])}deg` },
      { scale: interpolate(logoSpin.value, [0, 1], [1, 1.04]) },
    ],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.value,
    transform: [{ translateY: sheetY.value }],
  }));

  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sparkle.value, [0, 1], [0.4, 1]),
    transform: [{ scale: interpolate(sparkle.value, [0, 1], [0.85, 1.1]) }],
  }));

  function switchMode(next: LoginMode) {
    if (next === mode) return;
    setMode(next);
    setErrorMsg(null);
  }

  // ---------- Submit ----------
  async function handleSubmit() {
    if (submitting) return;
    Keyboard.dismiss();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = mode === 'client'
        ? await loginClient({ name, phone })
        : await loginStaff({ username, password });
      if (!res.ok) {
        setErrorMsg(res.reason);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível entrar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#06080B', ...colors.gradientHero, '#06080B']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Orbs douradas decorativas */}
      <Animated.View style={[styles.orb, styles.orb1, orb1Style]}>
        <LinearGradient
          colors={['rgba(212,162,76,0.55)', 'rgba(212,162,76,0)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>
      <Animated.View style={[styles.orb, styles.orb2, orb2Style]}>
        <LinearGradient
          colors={['rgba(232,200,150,0.45)', 'rgba(232,200,150,0)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      <View style={[styles.grid, { top: insets.top - 20 }]} pointerEvents="none">
        {Array.from({ length: 18 }).map((_, i) => (
          <View key={i} style={styles.gridDot} />
        ))}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <Animated.View style={[styles.hero, titleStyle]}>
            <Animated.View style={[styles.logoOuter, logoStyle]}>
              <LinearGradient
                colors={colors.gradientGold}
                style={styles.logoInner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="content-cut" size={36} color="#fff" />
              </LinearGradient>
              <Animated.View style={[styles.logoSparkle, sparkleStyle]} pointerEvents="none">
                <MaterialCommunityIcons name="star-four-points" size={16} color={colors.primary} />
              </Animated.View>
            </Animated.View>

            <Text style={styles.brand}>BARBER STUDIO</Text>
            <Text style={styles.brandTagline}>uma experiência feita para você</Text>

            <View style={styles.titleBlock}>
              <Text style={styles.title}>Bem-vindo de volta</Text>
              <Text style={styles.subtitle}>
                Acesse sua agenda, agende serviços e acompanhe tudo em um só lugar.
              </Text>
            </View>
          </Animated.View>

          {/* Card de login */}
          <Animated.View style={[styles.cardWrap, sheetStyle]}>
            <BlurView intensity={30} tint="dark" style={styles.cardBlur}>
              <LinearGradient
                colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.cardBorder} pointerEvents="none" />

              <View style={styles.cardContent}>
                <View style={styles.tabRow}>
                  <PressableScale
                    haptic="light"
                    scale={0.97}
                    onPress={() => switchMode('client')}
                    style={[styles.tabBtn, mode === 'client' && styles.tabBtnActive]}
                  >
                    <MaterialCommunityIcons
                      name="account-heart-outline"
                      size={16}
                      color={mode === 'client' ? '#06080B' : 'rgba(255,255,255,0.7)'}
                    />
                    <Text style={[styles.tabLabel, mode === 'client' && styles.tabLabelActive]}>
                      Cliente
                    </Text>
                  </PressableScale>
                  <PressableScale
                    haptic="light"
                    scale={0.97}
                    onPress={() => switchMode('staff')}
                    style={[styles.tabBtn, mode === 'staff' && styles.tabBtnActive]}
                  >
                    <MaterialCommunityIcons
                      name="shield-account-outline"
                      size={16}
                      color={mode === 'staff' ? '#06080B' : 'rgba(255,255,255,0.7)'}
                    />
                    <Text style={[styles.tabLabel, mode === 'staff' && styles.tabLabelActive]}>
                      Funcionário
                    </Text>
                  </PressableScale>
                </View>

                {mode === 'client' ? (
                  <>
                    <GlassField
                      icon="account"
                      placeholder="Seu nome"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                      returnKeyType="next"
                      onSubmitEditing={() => phoneRef.current?.focus()}
                      textContentType="name"
                    />
                    <GlassField
                      ref={phoneRef}
                      icon="phone"
                      placeholder="Seu telefone (com DDD)"
                      value={phone}
                      onChangeText={(t) => setPhone(maskPhoneBR(t))}
                      keyboardType="phone-pad"
                      returnKeyType="go"
                      onSubmitEditing={handleSubmit}
                      textContentType="telephoneNumber"
                      maxLength={PHONE_MASK_MAX_LENGTH}
                    />
                  </>
                ) : (
                  <>
                    <GlassField
                      icon="account-circle-outline"
                      placeholder="Usuário"
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                      onSubmitEditing={() => passwordRef.current?.focus()}
                      textContentType="none"
                      autoComplete="off"
                      importantForAutofill="no"
                    />
                    <GlassPasswordField
                      ref={passwordRef}
                      placeholder="Senha"
                      value={password}
                      onChangeText={setPassword}
                      returnKeyType="go"
                      onSubmitEditing={handleSubmit}
                    />
                  </>
                )}

                {errorMsg && (
                  <View style={styles.errorBox}>
                    <MaterialCommunityIcons
                      name="alert-circle-outline"
                      size={16}
                      color="#FFB4B4"
                    />
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </View>
                )}

                <PressableScale
                  haptic="medium"
                  onPress={handleSubmit}
                  scale={0.97}
                  style={[styles.cta, submitting && { opacity: 0.7 }]}
                  disabled={submitting}
                >
                  <LinearGradient
                    colors={colors.gradientGold}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  <Text style={styles.ctaText}>
                    {submitting ? 'Entrando...' : 'Entrar'}
                  </Text>
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={20}
                    color="#fff"
                    style={{ marginLeft: 6 }}
                  />
                </PressableScale>

                {mode === 'client' && (
                  <>
                    <View style={styles.dividerRow}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>OU</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    <PressableScale
                      haptic="light"
                      onPress={() => navigation.navigate('Register')}
                      style={styles.registerBtn}
                      scale={0.97}
                    >
                      <MaterialCommunityIcons
                        name="account-plus-outline"
                        size={18}
                        color={colors.primary}
                      />
                      <Text style={styles.registerText}>Criar conta de cliente</Text>
                    </PressableScale>
                  </>
                )}

                {mode === 'staff' && (
                  <View style={styles.staffNote}>
                    <MaterialCommunityIcons
                      name="information-outline"
                      size={14}
                      color="rgba(255,255,255,0.55)"
                    />
                    <Text style={styles.staffNoteText}>
                      Não tem credenciais? Solicite ao administrador.
                    </Text>
                  </View>
                )}
              </View>
            </BlurView>
          </Animated.View>

          <Animated.View style={[styles.helperBlock, sheetStyle]}>
            <Text style={styles.helperLabel}>Acesso de teste</Text>
            {mode === 'staff' ? (
              <>
                <Text style={styles.helperHint}>
                  Admin: <Text style={styles.helperEmphasis}>admin</Text> ·{' '}
                  <Text style={styles.helperEmphasis}>admin123</Text>
                </Text>
                <Text style={styles.helperHintSmall}>
                  Profissional: usuário do nome (ex.: andre) · barber123
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.helperHint}>
                  Cliente: <Text style={styles.helperEmphasis}>nome cadastrado</Text> +{' '}
                  <Text style={styles.helperEmphasis}>telefone</Text>
                </Text>
                <Text style={styles.helperHintSmall}>
                  Funcionário e admin? Use a aba "Funcionário".
                </Text>
              </>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ---------- Campo "vidro" com ícone ----------

interface FieldProps extends React.ComponentProps<typeof TextInput> {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  placeholder: string;
}

const MASK_CHAR = '\u2022';

const GlassField = React.forwardRef<TextInput, FieldProps>(function GlassField(
  { icon, placeholder, onFocus, onBlur, ...rest },
  ref
) {
  const focused = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: focused.value
      ? `rgba(212,162,76,${0.6 + focused.value * 0.4})`
      : 'rgba(255,255,255,0.12)',
    backgroundColor: focused.value
      ? 'rgba(255,255,255,0.07)'
      : 'rgba(255,255,255,0.03)',
    transform: [{ scale: 1 + focused.value * 0.005 }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + focused.value * 0.1 }],
  }));

  return (
    <Animated.View style={[styles.field, animatedStyle]}>
      <Animated.View style={iconStyle}>
        <MaterialCommunityIcons name={icon} size={20} color={colors.primaryLight} />
      </Animated.View>
      <TextInput
        ref={ref}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.4)"
        style={styles.fieldInput}
        onFocus={(e) => {
          focused.value = withTiming(1, { duration: 200 });
          onFocus?.(e);
        }}
        onBlur={(e) => {
          focused.value = withTiming(0, { duration: 200 });
          onBlur?.(e);
        }}
        {...rest}
      />
    </Animated.View>
  );
});

// ---------- Campo de senha "vidro" (sem Animated.View ao redor do TextInput) ----------

interface GlassPasswordProps
  extends Omit<React.ComponentProps<typeof TextInput>, 'secureTextEntry'> {
  placeholder: string;
}

const GlassPasswordField = React.forwardRef<TextInput, GlassPasswordProps>(
  function GlassPasswordField(
    { placeholder, value, onChangeText, onFocus, onBlur, ...rest },
    ref
  ) {
    const [focused, setFocused] = React.useState(false);
    const [hidden, setHidden] = React.useState(true);

    const realValue = value ?? '';
    const displayValue = hidden ? MASK_CHAR.repeat(realValue.length) : realValue;

    const handleChangeText = (next: string) => {
      if (!hidden) {
        onChangeText?.(next);
        return;
      }
      const oldLen = realValue.length;
      const newLen = next.length;
      if (newLen > oldLen) {
        onChangeText?.(realValue + next.slice(oldLen));
      } else if (newLen < oldLen) {
        onChangeText?.(realValue.slice(0, newLen));
      }
    };

    return (
      <View
        style={[
          styles.field,
          {
            backgroundColor: focused
              ? 'rgba(255,255,255,0.07)'
              : 'rgba(255,255,255,0.03)',
            borderColor: focused
              ? 'rgba(212,162,76,0.7)'
              : 'rgba(255,255,255,0.12)',
          },
        ]}
      >
        <MaterialCommunityIcons name="lock-outline" size={20} color={colors.primaryLight} />
        <TextInput
          ref={ref}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.4)"
          style={styles.fieldInput}
          value={displayValue}
          onChangeText={handleChangeText}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          textContentType="none"
          autoComplete="off"
          importantForAutofill="no"
          passwordRules=""
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        <Pressable
          onPress={() => setHidden((h) => !h)}
          hitSlop={10}
          style={styles.fieldTrailing}
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Mostrar senha' : 'Ocultar senha'}
        >
          <MaterialCommunityIcons
            name={hidden ? 'eye-outline' : 'eye-off-outline'}
            size={20}
            color="rgba(255,255,255,0.55)"
          />
        </Pressable>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#06080B' },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['3xl'],
    flexGrow: 1,
  },

  orb: {
    position: 'absolute',
    borderRadius: 999,
    overflow: 'hidden',
  },
  orb1: {
    width: 360,
    height: 360,
    top: -120,
    right: -120,
  },
  orb2: {
    width: 280,
    height: 280,
    bottom: -80,
    left: -100,
  },

  grid: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 80,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    opacity: 0.18,
  },
  gridDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },

  hero: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing['2xl'],
  },
  logoOuter: {
    width: 88,
    height: 88,
    borderRadius: 26,
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  logoInner: {
    width: 88,
    height: 88,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoSparkle: {
    position: 'absolute',
    top: -8,
    right: -6,
  },
  brand: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 4,
    marginTop: 18,
  },
  brandTagline: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.6,
    marginTop: 4,
    fontStyle: 'italic',
  },
  titleBlock: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 12,
    lineHeight: 20,
  },

  cardWrap: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  cardBlur: {
    overflow: 'hidden',
    borderRadius: 28,
  },
  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(212,162,76,0.18)',
  },
  cardContent: {
    padding: spacing.xl,
  },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md - 2,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  tabLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  tabLabelActive: {
    color: '#06080B',
  },

  staffNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.lg,
    paddingHorizontal: 4,
  },
  staffNoteText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },

  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 8,
    borderRadius: radius.md,
    borderWidth: 1.2,
    marginBottom: 12,
  },
  fieldInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: Platform.OS === 'ios' ? 0 : 8,
  },
  fieldTrailing: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: 'rgba(225,29,72,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(225,29,72,0.35)',
    marginTop: 4,
    marginBottom: spacing.md,
  },
  errorText: {
    color: '#FFD8D8',
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
  },

  cta: {
    height: 52,
    borderRadius: radius.md,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  ctaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: spacing.lg,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },

  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: 'rgba(212,162,76,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212,162,76,0.35)',
  },
  registerText: {
    color: colors.primaryLight,
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.3,
  },

  helperBlock: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  helperLabel: {
    ...typography.overline,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 6,
  },
  helperHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12.5,
    fontWeight: '500',
    textAlign: 'center',
  },
  helperEmphasis: {
    color: colors.primaryLight,
    fontWeight: '800',
  },
  helperHintSmall: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
  },
});

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
  withDelay,
  withRepeat,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { colors, radius, spacing } from '../../theme';
import { PressableScale } from '../../components/PressableScale';
import { useAuth } from '../../context/AuthContext';
import type { AuthStackParamList } from '../../types';
import { maskPhoneBR, PHONE_MASK_MAX_LENGTH } from '../../utils/helpers';

type Nav = StackNavigationProp<AuthStackParamList, 'Register'>;

export function RegisterScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { registerClient } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const phoneRef = useRef<TextInput>(null);

  // Decorativos
  const orb = useSharedValue(0);
  const card = useSharedValue(40);
  const cardOp = useSharedValue(0);

  useEffect(() => {
    orb.value = withRepeat(
      withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
    cardOp.value = withDelay(150, withTiming(1, { duration: 600 }));
    card.value = withDelay(150, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, [orb, card, cardOp]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(orb.value, [0, 1], [-20, 20], Extrapolate.CLAMP) },
      { translateY: interpolate(orb.value, [0, 1], [-30, 10], Extrapolate.CLAMP) },
      { scale: interpolate(orb.value, [0, 1], [1, 1.15]) },
    ],
    opacity: interpolate(orb.value, [0, 1], [0.45, 0.75]),
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOp.value,
    transform: [{ translateY: card.value }],
  }));

  async function handleSubmit() {
    if (submitting) return;
    Keyboard.dismiss();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await registerClient({ name, phone });
      if (!res.ok) {
        setErrorMsg(res.reason);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível criar a conta. Tente novamente.');
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

      <Animated.View style={[styles.orb, orbStyle]}>
        <LinearGradient
          colors={['rgba(212,162,76,0.55)', 'rgba(212,162,76,0)']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top bar */}
          <View style={styles.topBar}>
            <PressableScale
              haptic="light"
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
              scale={0.9}
            >
              <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
            </PressableScale>
            <Text style={styles.topTitle}>Criar conta</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <LinearGradient
                colors={colors.gradientGold}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <MaterialCommunityIcons name="account-plus" size={28} color="#fff" />
            </View>
            <Text style={styles.heroTitle}>Sua barbearia digital</Text>
            <Text style={styles.heroSubtitle}>
              Cadastre-se em segundos para agendar seus serviços e acompanhar seu histórico.
            </Text>
          </View>

          <Animated.View style={[styles.cardWrap, cardStyle]}>
            <BlurView intensity={30} tint="dark" style={styles.cardBlur}>
              <LinearGradient
                colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.cardBorder} pointerEvents="none" />

              <View style={styles.cardContent}>
                <GlassField
                  icon="account"
                  placeholder="Nome completo"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => phoneRef.current?.focus()}
                  textContentType="name"
                  autoFocus
                />

                <GlassField
                  ref={phoneRef}
                  icon="phone"
                  placeholder="Telefone com DDD"
                  value={phone}
                  onChangeText={(t) => setPhone(maskPhoneBR(t))}
                  keyboardType="phone-pad"
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit}
                  textContentType="telephoneNumber"
                  maxLength={PHONE_MASK_MAX_LENGTH}
                />

                <View style={styles.infoBox}>
                  <MaterialCommunityIcons
                    name="shield-check-outline"
                    size={16}
                    color={colors.primaryLight}
                  />
                  <Text style={styles.infoText}>
                    Seus dados ficam apenas neste dispositivo. Sem senha — você entra com
                    nome + telefone.
                  </Text>
                </View>

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
                    {submitting ? 'Criando conta...' : 'Criar conta e entrar'}
                  </Text>
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={20}
                    color="#fff"
                    style={{ marginLeft: 6 }}
                  />
                </PressableScale>

                <PressableScale
                  haptic="light"
                  onPress={() => navigation.goBack()}
                  style={styles.linkBtn}
                  scale={0.97}
                >
                  <Text style={styles.linkText}>
                    Já tem conta? <Text style={styles.linkTextBold}>Entrar</Text>
                  </Text>
                </PressableScale>
              </View>
            </BlurView>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

interface FieldProps extends React.ComponentProps<typeof TextInput> {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  placeholder: string;
}

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
  }));
  return (
    <Animated.View style={[styles.field, animatedStyle]}>
      <MaterialCommunityIcons name={icon} size={20} color={colors.primaryLight} />
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
    width: 320,
    height: 320,
    borderRadius: 180,
    overflow: 'hidden',
    top: -120,
    right: -100,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    marginBottom: spacing.lg,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  hero: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  heroTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 14,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 8,
    marginTop: 4,
    lineHeight: 19,
  },

  cardWrap: { borderRadius: 28, overflow: 'hidden' },
  cardBlur: { borderRadius: 28, overflow: 'hidden' },
  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(212,162,76,0.18)',
  },
  cardContent: { padding: spacing.xl },

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

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: 'rgba(212,162,76,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212,162,76,0.25)',
    marginTop: 4,
    marginBottom: spacing.md,
  },
  infoText: {
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
    fontSize: 12.5,
    fontWeight: '500',
    lineHeight: 17,
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

  linkBtn: { alignItems: 'center', paddingVertical: spacing.md, marginTop: 4 },
  linkText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  linkTextBold: { color: colors.primaryLight, fontWeight: '800' },
});

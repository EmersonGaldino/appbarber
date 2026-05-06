import { Platform } from 'react-native';

export const colors = {
  // Marca / Primária
  primary: '#D4A24C',
  primaryDark: '#B8862E',
  primaryLight: '#E8C896',
  primarySoft: '#FBF4E7',

  // Neutros (modo claro)
  bg: '#F4F4F7',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',

  // Hero / dark accents
  ink: '#0E1116',
  inkSoft: '#1B2027',
  inkMuted: '#2A2F39',

  // Texto
  textPrimary: '#0E1116',
  textSecondary: '#5A6173',
  textMuted: '#8A91A2',
  textInverse: '#FFFFFF',

  // Estado
  success: '#16A34A',
  successSoft: '#DCFCE7',
  danger: '#E11D48',
  dangerSoft: '#FFE4E6',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  info: '#2563EB',
  infoSoft: '#DBEAFE',

  // Bordas / divisores
  border: '#E5E7EE',
  borderStrong: '#D2D5DC',

  // Gradientes (tuplas para LinearGradient)
  gradientHero: ['#0E1116', '#1B2027', '#2A2F39'] as const,
  gradientGold: ['#D4A24C', '#B8862E'] as const,
  gradientSuccess: ['#16A34A', '#15803D'] as const,
  gradientDanger: ['#E11D48', '#9F1239'] as const,
  gradientCard: ['#FFFFFF', '#FAFBFD'] as const,

  // Glow / overlay
  goldGlow: 'rgba(212, 162, 76, 0.25)',
  overlay: 'rgba(14, 17, 22, 0.55)',
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

export const typography = {
  display: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5 },
  h1: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.3 },
  h2: { fontSize: 18, fontWeight: '700' as const },
  h3: { fontSize: 16, fontWeight: '700' as const },
  body: { fontSize: 14, fontWeight: '500' as const },
  bodyBold: { fontSize: 14, fontWeight: '700' as const },
  small: { fontSize: 12, fontWeight: '500' as const },
  smallBold: { fontSize: 12, fontWeight: '700' as const },
  overline: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
} as const;

export const shadow = {
  sm: Platform.select({
    ios: {
      shadowColor: '#0E1116',
      shadowOpacity: 0.06,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
    },
    android: { elevation: 2 },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#0E1116',
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 12,
    },
    android: { elevation: 4 },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#0E1116',
      shadowOpacity: 0.18,
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 24,
    },
    android: { elevation: 8 },
    default: {},
  }),
  gold: Platform.select({
    ios: {
      shadowColor: '#D4A24C',
      shadowOpacity: 0.45,
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 16,
    },
    android: { elevation: 8 },
    default: {},
  }),
} as const;

export const motion = {
  fast: 180,
  base: 280,
  slow: 480,
  springGentle: { damping: 18, stiffness: 180, mass: 0.6 },
  springBouncy: { damping: 12, stiffness: 200, mass: 0.7 },
} as const;

export const theme = {
  colors,
  radius,
  spacing,
  typography,
  shadow,
  motion,
};

export type Theme = typeof theme;

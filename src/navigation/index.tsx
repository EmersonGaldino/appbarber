import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { AdminNavigator } from './AdminNavigator';
import { ProfessionalNavigator } from './ProfessionalNavigator';
import { ClientNavigator } from './ClientNavigator';
import { colors } from '../theme';

const NavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.primary,
  },
};

function SplashScreen() {
  const pulse = useSharedValue(0);

  React.useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.95, 1.05]) }],
    opacity: interpolate(pulse.value, [0, 1], [0.8, 1]),
  }));

  return (
    <View style={styles.splashContainer}>
      <LinearGradient
        colors={['#06080B', ...colors.gradientHero, '#06080B']}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.splashLogo, animatedStyle]}>
        <LinearGradient colors={colors.gradientGold} style={StyleSheet.absoluteFill} />
        <MaterialCommunityIcons name="content-cut" size={36} color="#fff" />
      </Animated.View>
      <ActivityIndicator color={colors.primaryLight} style={{ marginTop: 24 }} />
    </View>
  );
}

export function AppNavigator() {
  const { status, role } = useAuth();

  return (
    <NavigationContainer theme={NavTheme}>
      {status === 'loading' && <SplashScreen />}
      {status === 'unauthenticated' && <AuthNavigator />}
      {status === 'authenticated' && role === 'admin' && <AdminNavigator />}
      {status === 'authenticated' && role === 'professional' && <ProfessionalNavigator />}
      {status === 'authenticated' && role === 'client' && <ClientNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splashContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  splashLogo: {
    width: 88,
    height: 88,
    borderRadius: 26,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
});

import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, shadow } from '../theme';
import { PressableScale } from './PressableScale';

interface Props {
  icon?: string;
  onPress: () => void;
  style?: ViewStyle;
  pulse?: boolean;
}

export function AnimatedFAB({ icon = 'plus', onPress, style, pulse = true }: Props) {
  const glow = useSharedValue(0);
  const enter = useSharedValue(0);

  useEffect(() => {
    enter.value = withSpring(1, { damping: 14, stiffness: 160 });
    if (pulse) {
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );
    }
  }, [enter, glow, pulse]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + glow.value * 0.5,
    transform: [{ scale: 1 + glow.value * 0.35 }],
  }));

  const enterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: enter.value }],
    opacity: enter.value,
  }));

  return (
    <Animated.View style={[styles.wrap, enterStyle, style]} pointerEvents="box-none">
      {pulse && <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none" />}
      <PressableScale
        scale={0.9}
        haptic="medium"
        onPress={() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          onPress();
        }}
        style={styles.fab}
      >
        <LinearGradient
          colors={colors.gradientGold}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <MaterialCommunityIcons name={icon as any} size={28} color="#fff" />
        </LinearGradient>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
  },
  glow: {
    position: 'absolute',
    inset: 0,
    borderRadius: 30,
    backgroundColor: colors.goldGlow,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    ...(shadow.gold as any),
  },
  gradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

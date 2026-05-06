import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props extends PressableProps {
  children: React.ReactNode;
  scale?: number;
  haptic?: 'light' | 'medium' | 'heavy' | null;
  style?: StyleProp<ViewStyle>;
}

export function PressableScale({
  children,
  scale = 0.96,
  haptic = 'light',
  onPress,
  onPressIn,
  onPressOut,
  style,
  ...rest
}: Props) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(1 - pressed.value * (1 - scale), {
          damping: 18,
          stiffness: 280,
          mass: 0.5,
        }),
      },
    ],
    opacity: withTiming(pressed.value ? 0.9 : 1, { duration: 120 }),
  }));

  return (
    <AnimatedPressable
      onPressIn={(e) => {
        pressed.value = 1;
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = 0;
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) {
          const map = {
            light: Haptics.ImpactFeedbackStyle.Light,
            medium: Haptics.ImpactFeedbackStyle.Medium,
            heavy: Haptics.ImpactFeedbackStyle.Heavy,
          } as const;
          Haptics.impactAsync(map[haptic]).catch(() => {});
        }
        onPress?.(e);
      }}
      style={[animatedStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { colors, radius, spacing, typography } from '../theme';

interface Props extends TextInputProps {
  label: string;
  error?: string;
  required?: boolean;
}

export function FormField({
  label,
  error,
  required,
  style,
  onFocus,
  onBlur,
  ...props
}: Props) {
  const [focused, setFocused] = useState(false);
  const focus = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focus.value,
      [0, 1],
      [error ? colors.danger : colors.border, error ? colors.danger : colors.primary]
    ),
    backgroundColor: interpolateColor(
      focus.value,
      [0, 1],
      [colors.bg, colors.surface]
    ),
  }));

  return (
    <View style={styles.container}>
      <Text style={[styles.label, focused && { color: colors.primary }]}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <Animated.View style={[styles.inputWrap, animatedStyle]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textMuted}
          onFocus={(e) => {
            setFocused(true);
            focus.value = withTiming(1, { duration: 180 });
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            focus.value = withTiming(0, { duration: 180 });
            onBlur?.(e);
          }}
          {...props}
        />
      </Animated.View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.smallBold,
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  required: {
    color: colors.danger,
  },
  inputWrap: {
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  error: {
    ...typography.small,
    color: colors.danger,
    marginTop: 4,
  },
});

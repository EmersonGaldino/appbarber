import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { colors, radius, shadow } from '../theme';

interface Props extends ViewProps {
  variant?: 'flat' | 'elevated' | 'outlined';
  padded?: boolean;
}

export function Card({
  children,
  variant = 'elevated',
  padded = true,
  style,
  ...rest
}: Props) {
  return (
    <View
      style={[
        styles.base,
        padded && styles.padded,
        variant === 'elevated' && [styles.elevated, shadow.sm as any],
        variant === 'outlined' && styles.outlined,
        variant === 'flat' && styles.flat,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  padded: {
    padding: 16,
  },
  elevated: {
    backgroundColor: colors.surface,
  },
  outlined: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  flat: {
    backgroundColor: colors.bg,
  },
});

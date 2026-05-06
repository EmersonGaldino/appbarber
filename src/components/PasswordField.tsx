import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  required?: boolean;
}

const MASK_CHAR = '\u2022';

/**
 * Campo de senha simplificado e blindado contra bugs do iOS:
 * - NÃO usa `secureTextEntry` nativo (que em alguns cenários trava a entrada
 *   de teclado no iOS Simulator).
 * - Mascara o texto manualmente (`••••`) usando o tamanho do `value`.
 * - Wrappers simples (View, sem Animated.View) para evitar interferência do
 *   reanimated nos eventos do teclado.
 */
export function PasswordField({
  label,
  error,
  required,
  style,
  value,
  onChangeText,
  onFocus,
  onBlur,
  ...props
}: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

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
      const added = next.slice(oldLen);
      onChangeText?.(realValue + added);
    } else if (newLen < oldLen) {
      onChangeText?.(realValue.slice(0, newLen));
    }
  };

  const wrapStyle = [
    styles.inputWrap,
    focused && styles.inputWrapFocused,
    error && styles.inputWrapError,
  ];

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, focused && { color: colors.primary }]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <View style={wrapStyle}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textMuted}
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
          {...props}
        />
        <Pressable
          onPress={() => setHidden((h) => !h)}
          hitSlop={10}
          style={styles.trailing}
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Mostrar senha' : 'Ocultar senha'}
        >
          <MaterialCommunityIcons
            name={hidden ? 'eye-outline' : 'eye-off-outline'}
            size={20}
            color={colors.textMuted}
          />
        </Pressable>
      </View>
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
    borderColor: colors.border,
    backgroundColor: colors.bg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWrapFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  inputWrapError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    paddingRight: 4,
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  trailing: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  error: {
    ...typography.small,
    color: colors.danger,
    marginTop: 4,
  },
});

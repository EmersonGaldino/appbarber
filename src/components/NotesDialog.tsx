import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PressableScale } from './PressableScale';
import { colors, radius, shadow, spacing, typography } from '../theme';

interface NotesDialogProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  inputLabel: string;
  placeholder?: string;
  confirmLabel: string;
  cancelLabel?: string;
  initialValue?: string;
  iconName?: string;
  iconColor?: string;
  iconBackground?: string;
  confirmBackground?: string;
  maxLength?: number;
  loading?: boolean;
  required?: boolean;
  onCancel: () => void;
  onConfirm: (value: string) => void | Promise<void>;
}

export function NotesDialog({
  visible,
  title,
  subtitle,
  inputLabel,
  placeholder,
  confirmLabel,
  cancelLabel = 'Cancelar',
  initialValue,
  iconName = 'note-edit-outline',
  iconColor = colors.primary,
  iconBackground = colors.primarySoft,
  confirmBackground = colors.primary,
  maxLength = 280,
  loading,
  required,
  onCancel,
  onConfirm,
}: NotesDialogProps) {
  const [value, setValue] = useState(initialValue ?? '');

  useEffect(() => {
    if (visible) setValue(initialValue ?? '');
  }, [visible, initialValue]);

  const trimmed = value.trim();
  const disabledByValidation = required ? trimmed.length === 0 : false;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: iconBackground }]}>
              <MaterialCommunityIcons name={iconName as any} size={20} color={iconColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
          </View>

          <Text style={styles.label}>{inputLabel}</Text>
          <TextInput
            value={value}
            onChangeText={(v) => setValue(v.slice(0, maxLength))}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            maxLength={maxLength}
            style={styles.input}
            editable={!loading}
          />
          <Text style={styles.counter}>{value.length}/{maxLength}</Text>

          <View style={styles.actions}>
            <PressableScale
              haptic="light"
              onPress={onCancel}
              disabled={loading}
              style={[styles.cancelBtn, loading && styles.disabled]}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </PressableScale>
            <PressableScale
              haptic="medium"
              onPress={() => onConfirm(trimmed)}
              disabled={loading || disabledByValidation}
              style={[
                styles.confirmBtn,
                { backgroundColor: confirmBackground },
                (loading || disabledByValidation) && styles.disabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check" size={16} color="#fff" />
                  <Text style={styles.confirmText}>{confirmLabel}</Text>
                </>
              )}
            </PressableScale>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...(shadow.md as any),
  },
  header: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.bodyBold, color: colors.textPrimary, fontSize: 16 },
  subtitle: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  label: {
    ...typography.smallBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    color: colors.textPrimary,
    padding: spacing.md,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  counter: {
    ...typography.small,
    color: colors.textMuted,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  cancelText: { ...typography.bodyBold, color: colors.textPrimary, fontSize: 14 },
  confirmBtn: {
    flex: 1.4,
    paddingVertical: 13,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  confirmText: { ...typography.bodyBold, color: '#fff', fontSize: 14 },
  disabled: { opacity: 0.6 },
});

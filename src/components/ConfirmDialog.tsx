import React from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { colors, radius, shadow, spacing, typography } from '../theme';
import { PressableScale } from './PressableScale';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  confirmColor?: string;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirmar',
  confirmColor = colors.danger,
}: Props) {
  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onCancel}>
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.overlay}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <Animated.View
          entering={ZoomIn.springify().damping(15)}
          exiting={ZoomOut.duration(150)}
          style={styles.box}
        >
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <PressableScale onPress={onCancel} style={[styles.btn, styles.cancel]}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </PressableScale>
            <PressableScale
              onPress={onConfirm}
              haptic="medium"
              style={[styles.btn, styles.confirm, { backgroundColor: confirmColor }]}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </PressableScale>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  box: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing['2xl'],
    width: '100%',
    maxWidth: 400,
    ...(shadow.lg as any),
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing['2xl'],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancel: {
    backgroundColor: colors.bg,
  },
  confirm: {},
  cancelText: {
    ...typography.bodyBold,
    color: colors.textSecondary,
  },
  confirmText: {
    ...typography.bodyBold,
    color: '#fff',
  },
});

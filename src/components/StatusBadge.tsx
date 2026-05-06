import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

type Status = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

const STATUS_CONFIG: Record<Status, { label: string; bg: string; color: string; dot: string }> = {
  scheduled: { label: 'Agendado', bg: colors.infoSoft, color: colors.info, dot: colors.info },
  completed: { label: 'Concluído', bg: colors.successSoft, color: colors.success, dot: colors.success },
  cancelled: { label: 'Cancelado', bg: colors.dangerSoft, color: colors.danger, dot: colors.danger },
  no_show: { label: 'Não Compareceu', bg: colors.warningSoft, color: colors.warning, dot: colors.warning },
};

export function StatusBadge({ status }: { status: Status }) {
  const config = STATUS_CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <View style={[styles.dot, { backgroundColor: config.dot }]} />
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAppContext } from '../../context/AppContext';
import { Professional, ProfessionalsStackParamList } from '../../types';
import { EmptyState } from '../../components/EmptyState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PressableScale } from '../../components/PressableScale';
import { AnimatedFAB } from '../../components/AnimatedFAB';
import { colors, radius, shadow, spacing, typography } from '../../theme';

type Nav = StackNavigationProp<ProfessionalsStackParamList, 'ProfessionalsList'>;

const AVATAR_GRADIENTS: [string, string][] = [
  ['#0EA5E9', '#0369A1'],
  ['#10B981', '#047857'],
  ['#F59E0B', '#B45309'],
  ['#6366F1', '#4338CA'],
  ['#EC4899', '#BE185D'],
  ['#14B8A6', '#0F766E'],
];

function Avatar({ name, index }: { name: string; index: number }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
  const grad = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
  return (
    <LinearGradient colors={grad} style={styles.avatar}>
      <Text style={styles.avatarText}>{initials}</Text>
    </LinearGradient>
  );
}

export function ProfessionalsListScreen() {
  const { data, updateProfessional, deleteProfessional } = useAppContext();
  const navigation = useNavigation<Nav>();
  const [deleteTarget, setDeleteTarget] = useState<Professional | null>(null);

  const sorted = [...data.professionals].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <View style={styles.container}>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={sorted.length === 0 ? styles.empty : styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="account-tie"
            title="Nenhum profissional"
            subtitle="Cadastre os profissionais da sua barbearia"
          />
        }
        renderItem={({ item, index }) => {
          const today = new Date().toISOString().split('T')[0];
          const todayAppts = data.appointments.filter(
            (a) => a.professionalId === item.id && a.date === today && a.status === 'scheduled'
          ).length;

          return (
            <Animated.View entering={FadeInDown.delay(index * 60).springify().damping(16)}>
              <PressableScale
                onPress={() => navigation.navigate('ProfessionalForm', { professional: item })}
                style={[styles.card, !item.active && styles.cardInactive]}
              >
                <Avatar name={item.name} index={index} />
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardName, !item.active && styles.textInactive]}>{item.name}</Text>
                  {item.phone ? (
                    <View style={styles.metaRow}>
                      <MaterialCommunityIcons name="phone-outline" size={12} color={colors.textMuted} />
                      <Text style={styles.metaText}>{item.phone}</Text>
                    </View>
                  ) : null}
                  {item.specialties.length > 0 && (
                    <View style={styles.specRow}>
                      {item.specialties.slice(0, 3).map((sp) => (
                        <View key={sp} style={styles.specChip}>
                          <Text style={styles.specText}>{sp}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {todayAppts > 0 && (
                    <View style={styles.apptBadge}>
                      <MaterialCommunityIcons name="calendar-today" size={11} color={colors.info} />
                      <Text style={styles.apptBadgeText}>
                        {todayAppts} agendamento{todayAppts !== 1 ? 's' : ''} hoje
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.cardActions}>
                  <Switch
                    value={item.active}
                    onValueChange={(v) => updateProfessional(item.id, { active: v })}
                    trackColor={{ false: colors.borderStrong, true: colors.primaryLight }}
                    thumbColor={item.active ? colors.primary : '#fff'}
                    ios_backgroundColor={colors.borderStrong}
                  />
                  <PressableScale onPress={() => setDeleteTarget(item)} haptic="light" style={styles.deleteIcon}>
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger} />
                  </PressableScale>
                </View>
              </PressableScale>
            </Animated.View>
          );
        }}
      />

      <AnimatedFAB onPress={() => navigation.navigate('ProfessionalForm', {})} />

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Excluir profissional"
        message={`Deseja excluir "${deleteTarget?.name}"?`}
        onConfirm={async () => {
          if (deleteTarget) await deleteProfessional(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
        confirmLabel="Excluir"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: 110 },
  empty: { flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    ...(shadow.sm as any),
  },
  cardInactive: { opacity: 0.65 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  cardInfo: { flex: 1, gap: 4 },
  cardName: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  textInactive: { color: colors.textMuted },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    ...typography.small,
    color: colors.textMuted,
  },
  specRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 2,
  },
  specChip: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  specText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  apptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.infoSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  apptBadgeText: {
    fontSize: 11,
    color: colors.info,
    fontWeight: '700',
  },
  cardActions: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  deleteIcon: {
    padding: 6,
    borderRadius: 8,
  },
});

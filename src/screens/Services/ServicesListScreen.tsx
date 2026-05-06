import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAppContext } from '../../context/AppContext';
import { formatCurrency, formatDuration } from '../../utils/helpers';
import { Service, ServicesStackParamList } from '../../types';
import { EmptyState } from '../../components/EmptyState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PressableScale } from '../../components/PressableScale';
import { AnimatedFAB } from '../../components/AnimatedFAB';
import { colors, radius, shadow, spacing, typography } from '../../theme';

type Nav = StackNavigationProp<ServicesStackParamList, 'ServicesList'>;

export function ServicesListScreen() {
  const { data, updateService, deleteService } = useAppContext();
  const navigation = useNavigation<Nav>();
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);

  const sorted = [...data.services].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <View style={styles.container}>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={sorted.length === 0 ? styles.empty : styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="scissors-cutting"
            title="Nenhum serviço cadastrado"
            subtitle="Toque no botão dourado para adicionar seu primeiro serviço"
          />
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 60).springify().damping(16)}>
            <PressableScale
              onPress={() => navigation.navigate('ServiceForm', { service: item })}
              style={[styles.card, !item.active && styles.cardInactive]}
            >
              <View style={styles.cardLeft}>
                <View style={[styles.iconWrap, !item.active && { opacity: 0.4 }]}>
                  <MaterialCommunityIcons name="scissors-cutting" size={22} color={colors.primary} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardName, !item.active && styles.textInactive]}>{item.name}</Text>
                  {item.description ? (
                    <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>
                  ) : null}
                  <View style={styles.cardMeta}>
                    <View style={styles.metaItem}>
                      <MaterialCommunityIcons name="clock-outline" size={12} color={colors.textMuted} />
                      <Text style={styles.metaText}>{formatDuration(item.duration)}</Text>
                    </View>
                    <View style={styles.dot} />
                    <Text style={styles.priceText}>{formatCurrency(item.price)}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.cardActions}>
                <Switch
                  value={item.active}
                  onValueChange={(v) => updateService(item.id, { active: v })}
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
        )}
      />

      <AnimatedFAB onPress={() => navigation.navigate('ServiceForm', {})} />

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Excluir serviço"
        message={`Deseja excluir "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={async () => {
          if (deleteTarget) await deleteService(deleteTarget.id);
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
    alignItems: 'center',
    ...(shadow.sm as any),
  },
  cardInactive: { opacity: 0.65 },
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  cardName: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  textInactive: { color: colors.textMuted },
  cardDesc: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.small,
    color: colors.textMuted,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.borderStrong,
  },
  priceText: {
    ...typography.smallBold,
    color: colors.success,
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

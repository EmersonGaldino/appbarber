import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAppContext } from '../../context/AppContext';
import { formatCurrency } from '../../utils/helpers';
import { Product, ProductsStackParamList } from '../../types';
import { EmptyState } from '../../components/EmptyState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PressableScale } from '../../components/PressableScale';
import { AnimatedFAB } from '../../components/AnimatedFAB';
import { colors, radius, shadow, spacing, typography } from '../../theme';

type Nav = StackNavigationProp<ProductsStackParamList, 'ProductsList'>;

export function ProductsListScreen() {
  const { data, updateProduct, deleteProduct } = useAppContext();
  const navigation = useNavigation<Nav>();
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [filter, setFilter] = useState<'all' | 'low_stock'>('all');

  let products = [...data.products].sort((a, b) => a.name.localeCompare(b.name));
  if (filter === 'low_stock') products = products.filter((p) => p.stock < 5);

  const lowStockCount = data.products.filter((p) => p.stock < 5 && p.active).length;

  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        {(['all', 'low_stock'] as const).map((f) => (
          <PressableScale
            key={f}
            onPress={() => setFilter(f)}
            haptic="light"
            scale={0.94}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'Todos' : `Estoque baixo`}
            </Text>
            {f === 'low_stock' && lowStockCount > 0 && (
              <View style={[styles.filterBadge, filter === f && styles.filterBadgeActive]}>
                <Text style={[styles.filterBadgeText, filter === f && styles.filterBadgeTextActive]}>{lowStockCount}</Text>
              </View>
            )}
          </PressableScale>
        ))}
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={products.length === 0 ? styles.empty : styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="shopping-outline"
            title="Nenhum produto"
            subtitle="Cadastre os produtos que sua barbearia vende"
          />
        }
        renderItem={({ item, index }) => {
          const lowStock = item.stock < 5;
          return (
            <Animated.View entering={FadeInDown.delay(index * 60).springify().damping(16)}>
              <PressableScale
                onPress={() => navigation.navigate('ProductForm', { product: item })}
                style={[styles.card, !item.active && styles.cardInactive]}
              >
                <View style={[styles.iconWrap, lowStock && { backgroundColor: colors.warningSoft }]}>
                  <MaterialCommunityIcons
                    name={lowStock ? 'package-variant-closed' : 'package-variant'}
                    size={22}
                    color={lowStock ? colors.warning : colors.primary}
                  />
                </View>
                <View style={styles.cardInfo}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.cardName, !item.active && styles.textInactive]} numberOfLines={1}>{item.name}</Text>
                    {item.category ? (
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{item.category}</Text>
                      </View>
                    ) : null}
                  </View>
                  {item.description ? (
                    <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>
                  ) : null}
                  <View style={styles.cardMeta}>
                    <Text style={styles.priceText}>{formatCurrency(item.price)}</Text>
                    <View style={styles.dot} />
                    <View style={styles.metaItem}>
                      <MaterialCommunityIcons
                        name="archive-outline"
                        size={12}
                        color={lowStock ? colors.danger : colors.textMuted}
                      />
                      <Text style={[styles.metaText, lowStock && styles.lowStockText]}>
                        {item.stock} un.
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <Switch
                    value={item.active}
                    onValueChange={(v) => updateProduct(item.id, { active: v })}
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

      <AnimatedFAB onPress={() => navigation.navigate('ProductForm', {})} />

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Excluir produto"
        message={`Deseja excluir "${deleteTarget?.name}"?`}
        onConfirm={async () => {
          if (deleteTarget) await deleteProduct(deleteTarget.id);
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
  filterBar: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
  },
  filterBtnActive: { backgroundColor: colors.ink },
  filterText: {
    ...typography.smallBold,
    color: colors.textSecondary,
  },
  filterTextActive: { color: '#fff' },
  filterBadge: {
    backgroundColor: colors.danger,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeActive: { backgroundColor: colors.primary },
  filterBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  filterBadgeTextActive: { color: colors.ink },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: 110 },
  empty: { flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...(shadow.sm as any),
  },
  cardInactive: { opacity: 0.65 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardName: {
    ...typography.h3,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  textInactive: { color: colors.textMuted },
  categoryBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  categoryText: {
    fontSize: 10.5,
    color: '#6D28D9',
    fontWeight: '700',
  },
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
  priceText: {
    ...typography.smallBold,
    color: colors.success,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.borderStrong,
  },
  lowStockText: {
    color: colors.danger,
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

import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAppContext } from '../../context/AppContext';
import { formatCurrency, formatDate, categoryLabel, paymentMethodLabel } from '../../utils/helpers';
import { Transaction, FinancialStackParamList } from '../../types';
import { EmptyState } from '../../components/EmptyState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PressableScale } from '../../components/PressableScale';
import { AnimatedFAB } from '../../components/AnimatedFAB';
import { colors, radius, shadow, spacing, typography } from '../../theme';

type Nav = StackNavigationProp<FinancialStackParamList, 'FinancialMain'>;

export function FinancialMainScreen() {
  const { data, deleteTransaction } = useAppContext();
  const navigation = useNavigation<Nav>();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  const monthKey = format(currentMonth, 'yyyy-MM');
  const monthLabel = format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR });

  const monthTransactions = useMemo(() => {
    return data.transactions
      .filter((t) => t.date.startsWith(monthKey))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [data.transactions, monthKey]);

  const summary = useMemo(() => {
    const income = monthTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = monthTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, profit: income - expense };
  }, [monthTransactions]);

  const filtered = filter === 'all' ? monthTransactions : monthTransactions.filter((t) => t.type === filter);

  const categoryTotals = useMemo(() => {
    const map: Record<string, { label: string; total: number; type: string }> = {};
    monthTransactions.forEach((t) => {
      if (!map[t.category]) map[t.category] = { label: categoryLabel(t.category), total: 0, type: t.type };
      map[t.category].total += t.amount;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total).slice(0, 5);
  }, [monthTransactions]);

  const maxCategory = categoryTotals[0]?.[1].total ?? 1;

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filtered.length === 0 ? styles.emptyList : styles.list}
        ListHeaderComponent={
          <>
            <View style={styles.monthNav}>
              <PressableScale haptic="light" scale={0.92} onPress={() => setCurrentMonth((d) => subMonths(d, 1))} style={styles.navBtn}>
                <MaterialCommunityIcons name="chevron-left" size={22} color={colors.textPrimary} />
              </PressableScale>
              <Text style={styles.monthLabel}>{monthLabel}</Text>
              <PressableScale haptic="light" scale={0.92} onPress={() => setCurrentMonth((d) => addMonths(d, 1))} style={styles.navBtn}>
                <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textPrimary} />
              </PressableScale>
            </View>

            <Animated.View entering={FadeInDown.delay(50).springify()}>
              <LinearGradient
                colors={summary.profit >= 0 ? colors.gradientHero : ['#7F1D1D', '#991B1B']}
                style={styles.heroSummary}
              >
                <View style={styles.heroDecor} />
                <Text style={styles.heroLabel}>SALDO DO MÊS</Text>
                <Text style={[styles.heroValue, { color: summary.profit >= 0 ? colors.primary : '#FCA5A5' }]}>
                  {formatCurrency(summary.profit)}
                </Text>
                <View style={styles.heroDivider} />
                <View style={styles.heroSplit}>
                  <View style={styles.heroSplitItem}>
                    <View style={styles.heroDot} />
                    <View>
                      <Text style={styles.heroSplitLabel}>Receitas</Text>
                      <Text style={styles.heroSplitValue}>{formatCurrency(summary.income)}</Text>
                    </View>
                  </View>
                  <View style={styles.heroSplitItem}>
                    <View style={[styles.heroDot, { backgroundColor: colors.danger }]} />
                    <View>
                      <Text style={styles.heroSplitLabel}>Despesas</Text>
                      <Text style={styles.heroSplitValue}>{formatCurrency(summary.expense)}</Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>

            {categoryTotals.length > 0 && (
              <Animated.View entering={FadeInDown.delay(120).springify()}>
                <View style={styles.categoriesBox}>
                  <Text style={styles.categoriesTitle}>Top categorias</Text>
                  {categoryTotals.map(([key, val]) => {
                    const pct = (val.total / maxCategory) * 100;
                    const color = val.type === 'income' ? colors.success : colors.danger;
                    return (
                      <View key={key} style={styles.categoryRow}>
                        <View style={styles.categoryInfo}>
                          <Text style={styles.categoryName}>{val.label}</Text>
                          <Text style={[styles.categoryTotal, { color }]}>
                            {val.type === 'expense' ? '−' : '+'} {formatCurrency(val.total)}
                          </Text>
                        </View>
                        <View style={styles.barTrack}>
                          <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </Animated.View>
            )}

            <View style={styles.filterRow}>
              {(['all', 'income', 'expense'] as const).map((f) => (
                <PressableScale
                  key={f}
                  haptic="light"
                  scale={0.94}
                  onPress={() => setFilter(f)}
                  style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
                >
                  <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                    {f === 'all' ? 'Todas' : f === 'income' ? 'Receitas' : 'Despesas'}
                  </Text>
                </PressableScale>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          <EmptyState icon="cash-multiple" title="Sem transações" subtitle="Toque no botão dourado para registrar uma transação" />
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 50).springify().damping(16)}>
            <PressableScale
              onPress={() => navigation.navigate('TransactionForm', { transaction: item })}
              style={styles.txCard}
            >
              <View
                style={[
                  styles.txTypeIcon,
                  { backgroundColor: item.type === 'income' ? colors.successSoft : colors.dangerSoft },
                ]}
              >
                <MaterialCommunityIcons
                  name={item.type === 'income' ? 'arrow-down' : 'arrow-up'}
                  size={22}
                  color={item.type === 'income' ? colors.success : colors.danger}
                />
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txDesc} numberOfLines={1}>{item.description}</Text>
                <Text style={styles.txMeta}>
                  {categoryLabel(item.category)} · {formatDate(item.date)}
                </Text>
                {item.paymentMethod && (
                  <Text style={styles.txPayment}>{paymentMethodLabel(item.paymentMethod)}</Text>
                )}
              </View>
              <View style={styles.txRight}>
                <Text style={[styles.txAmount, { color: item.type === 'income' ? colors.success : colors.danger }]}>
                  {item.type === 'expense' ? '−' : '+'}
                  {formatCurrency(item.amount)}
                </Text>
                <PressableScale haptic="light" onPress={() => setDeleteTarget(item)} style={styles.deleteBtn}>
                  <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.danger} />
                </PressableScale>
              </View>
            </PressableScale>
          </Animated.View>
        )}
      />

      <AnimatedFAB icon="plus" onPress={() => navigation.navigate('TransactionForm', {})} />

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Excluir transação"
        message={`Deseja excluir "${deleteTarget?.description}"?`}
        onConfirm={async () => {
          if (deleteTarget) await deleteTransaction(deleteTarget.id);
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
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    ...(shadow.sm as any),
  },
  navBtn: { padding: 6, borderRadius: 8 },
  monthLabel: {
    ...typography.h3,
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  heroSummary: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radius.xl,
    padding: spacing.xl,
    overflow: 'hidden',
    ...(shadow.lg as any),
  },
  heroDecor: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(212, 162, 76, 0.1)',
  },
  heroLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: 'rgba(255,255,255,0.55)' },
  heroValue: { fontSize: 38, fontWeight: '800', letterSpacing: -1, marginTop: 4 },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: spacing.md },
  heroSplit: { flexDirection: 'row', justifyContent: 'space-between' },
  heroSplitItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  heroSplitLabel: { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
  heroSplitValue: { fontSize: 14, color: '#fff', fontWeight: '700', marginTop: 2 },

  categoriesBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
    ...(shadow.sm as any),
  },
  categoriesTitle: { ...typography.overline, color: colors.textMuted, marginBottom: 12 },
  categoryRow: { marginBottom: 10 },
  categoryInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  categoryName: { ...typography.body, color: colors.textPrimary },
  categoryTotal: { ...typography.smallBold },
  barTrack: { height: 6, backgroundColor: colors.bg, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },

  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surface },
  filterBtnActive: { backgroundColor: colors.ink },
  filterText: { ...typography.smallBold, color: colors.textSecondary },
  filterTextActive: { color: '#fff' },

  list: { paddingHorizontal: spacing.lg, paddingBottom: 110, gap: 8, paddingTop: 4 },
  emptyList: { paddingTop: 40 },
  txCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...(shadow.sm as any),
  },
  txTypeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1 },
  txDesc: { ...typography.bodyBold, color: colors.textPrimary },
  txMeta: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  txPayment: { fontSize: 11, color: colors.primary, marginTop: 1, fontWeight: '700' },
  txRight: { alignItems: 'flex-end', gap: 6 },
  txAmount: { fontSize: 15, fontWeight: '800' },
  deleteBtn: { padding: 4, borderRadius: 8 },
});

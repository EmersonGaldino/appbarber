import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAppContext } from '../../context/AppContext';
import { formatCurrency } from '../../utils/helpers';
import { colors, radius, shadow, spacing, typography } from '../../theme';
import { FadeInView } from '../../components/FadeInView';
import { PressableScale } from '../../components/PressableScale';

const HEADER_HEIGHT = 220;

export function HomeScreen() {
  const { data, clearAllData } = useAppContext();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayLabel = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const heroAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [0, HEADER_HEIGHT], [0, -HEADER_HEIGHT / 2], Extrapolate.CLAMP) },
    ],
    opacity: interpolate(scrollY.value, [0, HEADER_HEIGHT * 0.8], [1, 0], Extrapolate.CLAMP),
  }));

  const stats = useMemo(() => {
    const todayAppts = data.appointments.filter((a) => a.date === today && a.status !== 'cancelled');
    const completedToday = todayAppts.filter((a) => a.status === 'completed');

    // Faturamento do dia = todas as receitas com data de hoje (atendimentos + vendas avulsas + outras entradas)
    const revenueFromTransactions = data.transactions
      .filter((t) => t.type === 'income' && t.date === today)
      .reduce((sum, t) => sum + t.amount, 0);

    // Soma agendamentos concluídos que ainda não tenham transação vinculada (segurança)
    const completedAppointmentIds = new Set(completedToday.map((a) => a.id));
    const linkedAppointmentIds = new Set(
      data.transactions
        .filter((t) => t.type === 'income' && t.appointmentId)
        .map((t) => t.appointmentId as string)
    );
    const orphanRevenue = completedToday
      .filter((a) => !linkedAppointmentIds.has(a.id))
      .reduce((sum, a) => sum + a.totalValue, 0);

    void completedAppointmentIds;
    const revenueToday = revenueFromTransactions + orphanRevenue;

    const thisMonth = format(new Date(), 'yyyy-MM');
    const monthTransactions = data.transactions.filter((t) => t.date.startsWith(thisMonth));
    const monthIncome = monthTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const monthExpense = monthTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    return {
      todayAppts: todayAppts.length,
      completedToday: completedToday.length,
      revenueToday,
      monthIncome,
      monthExpense,
      monthProfit: monthIncome - monthExpense,
      activeServices: data.services.filter((s) => s.active).length,
      activeProfessionals: data.professionals.filter((p) => p.active).length,
      lowStock: data.products.filter((p) => p.stock < 5 && p.active).length,
      activeProducts: data.products.filter((p) => p.active).length,
    };
  }, [data, today]);

  const nextAppointments = useMemo(() => {
    return data.appointments
      .filter((a) => a.date === today && a.status === 'scheduled')
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .slice(0, 4);
  }, [data.appointments, today]);

  const isEmpty = useMemo(
    () =>
      data.services.length === 0 &&
      data.professionals.length === 0 &&
      data.products.length === 0 &&
      data.appointments.length === 0 &&
      data.transactions.length === 0,
    [data]
  );

  const handleClearAll = () => {
    Alert.alert(
      'Limpar todos os dados?',
      'Isso vai remover serviços, profissionais, produtos, agendamentos e transações. Essa ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar tudo',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData();
            } catch (e) {
              console.error(e);
              Alert.alert('Erro', 'Não foi possível limpar os dados.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.heroWrap, heroAnimStyle, { paddingTop: insets.top + 16 }]} pointerEvents="box-none">
        <LinearGradient
          colors={colors.gradientHero}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.heroDecorTop} />
        <View style={styles.heroDecorBottom} />

        <View style={styles.heroContent}>
          <View style={styles.brandRow}>
            <View style={styles.brandLogo}>
              <LinearGradient colors={colors.gradientGold} style={styles.brandLogoGrad}>
                <MaterialCommunityIcons name="content-cut" size={20} color="#fff" />
              </LinearGradient>
            </View>
            <View>
              <Text style={styles.brandName}>BARBER STUDIO</Text>
              <Text style={styles.brandTagline}>gestão profissional</Text>
            </View>
          </View>

          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.greetingDate} numberOfLines={1}>{todayLabel}</Text>
        </View>
      </Animated.View>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: HEADER_HEIGHT + insets.top - 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card destacado */}
        <FadeInView delay={50}>
          <PressableScale onPress={() => navigation.navigate('Financial')}>
            <LinearGradient
              colors={colors.gradientGold}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hotCard}
            >
              <View style={styles.hotCardOverlay} />
              <View>
                <Text style={styles.hotCardLabel}>FATURAMENTO HOJE</Text>
                <Text style={styles.hotCardValue}>{formatCurrency(stats.revenueToday)}</Text>
                <View style={styles.hotCardMetaRow}>
                  <View style={styles.hotCardChip}>
                    <MaterialCommunityIcons name="check-decagram" size={13} color="#fff" />
                    <Text style={styles.hotCardChipText}>{stats.completedToday} concluído{stats.completedToday !== 1 ? 's' : ''}</Text>
                  </View>
                  <View style={styles.hotCardChip}>
                    <MaterialCommunityIcons name="calendar-clock" size={13} color="#fff" />
                    <Text style={styles.hotCardChipText}>{stats.todayAppts} agendado{stats.todayAppts !== 1 ? 's' : ''}</Text>
                  </View>
                </View>
              </View>
              <MaterialCommunityIcons name="trending-up" size={64} color="rgba(255,255,255,0.18)" style={styles.hotCardIcon} />
            </LinearGradient>
          </PressableScale>
        </FadeInView>

        <Text style={styles.sectionTitle}>Este mês</Text>
        <View style={styles.statsRow}>
          <FadeInView delay={120} style={{ flex: 1 }}>
            <PressableScale onPress={() => navigation.navigate('Financial')}>
              <View style={[styles.miniCard, { borderLeftColor: colors.success }]}>
                <View style={[styles.miniIcon, { backgroundColor: colors.successSoft }]}>
                  <MaterialCommunityIcons name="arrow-down-circle" size={18} color={colors.success} />
                </View>
                <Text style={styles.miniLabel}>Receitas</Text>
                <Text style={[styles.miniValue, { color: colors.success }]}>{formatCurrency(stats.monthIncome)}</Text>
              </View>
            </PressableScale>
          </FadeInView>
          <FadeInView delay={180} style={{ flex: 1 }}>
            <PressableScale onPress={() => navigation.navigate('Financial')}>
              <View style={[styles.miniCard, { borderLeftColor: colors.danger }]}>
                <View style={[styles.miniIcon, { backgroundColor: colors.dangerSoft }]}>
                  <MaterialCommunityIcons name="arrow-up-circle" size={18} color={colors.danger} />
                </View>
                <Text style={styles.miniLabel}>Despesas</Text>
                <Text style={[styles.miniValue, { color: colors.danger }]}>{formatCurrency(stats.monthExpense)}</Text>
              </View>
            </PressableScale>
          </FadeInView>
        </View>

        <FadeInView delay={240}>
          <PressableScale onPress={() => navigation.navigate('Financial')}>
            <View style={styles.profitCard}>
              <View>
                <Text style={styles.profitLabel}>SALDO DO MÊS</Text>
                <Text style={[styles.profitValue, { color: stats.monthProfit >= 0 ? colors.success : colors.danger }]}>
                  {formatCurrency(stats.monthProfit)}
                </Text>
              </View>
              <View style={[styles.profitIcon, { backgroundColor: stats.monthProfit >= 0 ? colors.successSoft : colors.dangerSoft }]}>
                <MaterialCommunityIcons
                  name={stats.monthProfit >= 0 ? 'finance' : 'alert-circle'}
                  size={26}
                  color={stats.monthProfit >= 0 ? colors.success : colors.danger}
                />
              </View>
            </View>
          </PressableScale>
        </FadeInView>

        <Text style={styles.sectionTitle}>Atalhos</Text>
        <View style={styles.shortcuts}>
          {[
            { icon: 'calendar-month', label: 'Agenda', color: '#6366F1', screen: 'Schedule', count: stats.todayAppts, badge: 'hoje' },
            { icon: 'scissors-cutting', label: 'Serviços', color: '#10B981', screen: 'Services', count: stats.activeServices, badge: 'ativos' },
            { icon: 'account-tie', label: 'Equipe', color: '#0EA5E9', screen: 'Professionals', count: stats.activeProfessionals, badge: 'ativos' },
            { icon: 'shopping', label: 'Produtos', color: '#F59E0B', screen: 'Products', count: stats.activeProducts, badge: stats.lowStock > 0 ? `${stats.lowStock} c/ baixo` : 'ativos' },
          ].map((item, i) => (
            <FadeInView key={item.screen} delay={300 + i * 60} style={styles.shortcutWrap}>
              <PressableScale onPress={() => navigation.navigate(item.screen)} style={styles.shortcut}>
                <View style={[styles.shortcutIcon, { backgroundColor: item.color + '15' }]}>
                  <MaterialCommunityIcons name={item.icon as any} size={26} color={item.color} />
                </View>
                <Text style={styles.shortcutLabel}>{item.label}</Text>
                <Text style={styles.shortcutCount}>
                  <Text style={{ color: item.color, fontWeight: '800' }}>{item.count}</Text>
                  <Text style={styles.shortcutCountLabel}> {item.badge}</Text>
                </Text>
              </PressableScale>
            </FadeInView>
          ))}
        </View>

        {nextAppointments.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Próximos hoje</Text>
              <PressableScale haptic="light" onPress={() => navigation.navigate('Schedule')} scale={0.94}>
                <Text style={styles.sectionLink}>ver tudo →</Text>
              </PressableScale>
            </View>
            {nextAppointments.map((appt, i) => {
              const prof = data.professionals.find((p) => p.id === appt.professionalId);
              const services = data.services.filter((s) => appt.serviceIds.includes(s.id));
              return (
                <FadeInView key={appt.id} delay={500 + i * 70}>
                  <PressableScale
                    onPress={() => navigation.navigate('Schedule', { screen: 'AppointmentDetail', params: { appointment: appt } })}
                  >
                    <View style={styles.apptCard}>
                      <LinearGradient colors={colors.gradientHero} style={styles.apptTime}>
                        <Text style={styles.apptTimeText}>{appt.startTime}</Text>
                        <View style={styles.apptTimeDivider} />
                        <Text style={styles.apptTimeEnd}>{appt.endTime}</Text>
                      </LinearGradient>
                      <View style={styles.apptInfo}>
                        <Text style={styles.apptClient}>{appt.clientName}</Text>
                        <Text style={styles.apptServices} numberOfLines={1}>
                          {services.map((s) => s.name).join(' • ')}
                        </Text>
                        {prof && <Text style={styles.apptProf}>{prof.name}</Text>}
                      </View>
                      <View style={styles.apptValueWrap}>
                        <Text style={styles.apptValue}>{formatCurrency(appt.totalValue)}</Text>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
                      </View>
                    </View>
                  </PressableScale>
                </FadeInView>
              );
            })}
          </>
        )}

        {!isEmpty && (
          <FadeInView delay={600}>
            <View style={styles.footerActions}>
              <PressableScale onPress={handleClearAll} haptic="medium">
                <View style={styles.clearBtn}>
                  <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.danger} />
                  <Text style={styles.clearBtnText}>Limpar todos os dados</Text>
                </View>
              </PressableScale>
              <Text style={styles.footerHint}>
                Os dados ficam apenas neste dispositivo (armazenamento local).
              </Text>
            </View>
          </FadeInView>
        )}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  heroWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT + 60,
    overflow: 'hidden',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroDecorTop: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(212, 162, 76, 0.12)',
  },
  heroDecorBottom: {
    position: 'absolute',
    bottom: -100,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(212, 162, 76, 0.05)',
  },
  heroContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.xl,
  },
  brandLogo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
  },
  brandLogoGrad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
  },
  brandTagline: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  greeting: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  greetingDate: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100, paddingHorizontal: spacing.lg },

  sectionTitle: {
    ...typography.overline,
    color: colors.textMuted,
    marginTop: spacing['2xl'],
    marginBottom: spacing.md,
    paddingHorizontal: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLink: {
    ...typography.smallBold,
    color: colors.primary,
    marginTop: spacing['2xl'],
    marginBottom: spacing.md,
  },

  hotCard: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    minHeight: 140,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    ...(shadow.gold as any),
  },
  hotCardOverlay: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  hotCardLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  hotCardValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: 4,
  },
  hotCardMetaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.md,
    flexWrap: 'wrap',
  },
  hotCardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  hotCardChipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  hotCardIcon: {
    position: 'absolute',
    right: 16,
    bottom: 12,
  },

  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  miniCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderLeftWidth: 4,
    ...(shadow.sm as any),
  },
  miniIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  miniLabel: {
    ...typography.small,
    color: colors.textMuted,
    marginBottom: 2,
  },
  miniValue: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  profitCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    ...(shadow.sm as any),
  },
  profitLabel: {
    ...typography.overline,
    color: colors.textMuted,
    marginBottom: 4,
  },
  profitValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  profitIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  shortcuts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  shortcutWrap: {
    width: '47.5%',
  },
  shortcut: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...(shadow.sm as any),
  },
  shortcutIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  shortcutLabel: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  shortcutCount: {
    fontSize: 12,
    marginTop: 3,
  },
  shortcutCountLabel: {
    color: colors.textMuted,
    fontWeight: '500',
  },

  apptCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    ...(shadow.sm as any),
  },
  apptTime: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    minWidth: 64,
  },
  apptTimeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  apptTimeDivider: {
    height: 1,
    width: 16,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginVertical: 4,
  },
  apptTimeEnd: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  apptInfo: {
    flex: 1,
    padding: spacing.md,
  },
  apptClient: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  apptServices: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  apptProf: {
    ...typography.small,
    color: colors.primary,
    marginTop: 2,
    fontWeight: '700',
  },
  apptValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.md,
    gap: 4,
  },
  apptValue: {
    ...typography.bodyBold,
    color: colors.success,
  },

  footerActions: {
    marginTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },
  clearBtnText: {
    ...typography.small,
    color: colors.danger,
    fontWeight: '700',
  },
  footerHint: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
    textAlign: 'center',
  },
});

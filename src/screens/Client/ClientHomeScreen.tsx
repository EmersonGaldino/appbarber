import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';
import { colors, radius, shadow, spacing, typography } from '../../theme';
import { PressableScale } from '../../components/PressableScale';
import { FadeInView } from '../../components/FadeInView';
import { StatusBadge } from '../../components/StatusBadge';
import { EmptyState } from '../../components/EmptyState';
import { CampaignBanner } from '../../components/CampaignBanner';
import { formatCurrency } from '../../utils/helpers';
import type { Appointment, ClientHomeStackParamList } from '../../types';

type Nav = StackNavigationProp<ClientHomeStackParamList, 'ClientHomeMain'>;

function normalizePhone(s: string) {
  return (s ?? '').replace(/\D/g, '');
}

export function ClientHomeScreen() {
  const { user } = useAuth();
  const { data } = useAppContext();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const myAppts = useMemo(() => {
    if (!user) return [];
    const userPhone = normalizePhone(user.phone);
    return data.appointments
      .filter(
        (a) =>
          a.clientUserId === user.id ||
          (userPhone && normalizePhone(a.clientPhone) === userPhone)
      )
      .sort((a, b) => `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`));
  }, [data.appointments, user]);

  const upcoming = useMemo(
    () =>
      myAppts
        .filter((a) => a.status === 'scheduled')
        .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
        .slice(0, 1),
    [myAppts]
  );

  const history = useMemo(() => myAppts.filter((a) => a.status !== 'scheduled'), [myAppts]);

  const stats = useMemo(() => {
    const completed = myAppts.filter((a) => a.status === 'completed');
    return {
      total: myAppts.length,
      completed: completed.length,
      totalSpent: completed.reduce((s, a) => s + a.totalValue, 0),
    };
  }, [myAppts]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  function goToBooking() {
    // Pula da home stack para a aba "Agendar".
    const parent = navigation.getParent();
    if (parent) parent.navigate('ClientBook' as never);
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <LinearGradient
              colors={colors.gradientHero}
              style={[styles.hero, { paddingTop: insets.top + 20 }]}
            >
              <View style={styles.heroDecorTop} />
              <View style={styles.heroDecorBottom} />

              <View style={styles.heroTopRow}>
                <View>
                  <Text style={styles.greeting}>{greeting},</Text>
                  <Text style={styles.heroName} numberOfLines={1}>
                    {user?.name?.split(' ')[0] ?? 'Cliente'}
                  </Text>
                </View>
                <View style={styles.heroAvatarWrap}>
                  <LinearGradient colors={colors.gradientGold} style={styles.heroAvatar}>
                    <MaterialCommunityIcons name="account" size={22} color="#fff" />
                  </LinearGradient>
                </View>
              </View>

              <PressableScale onPress={goToBooking} style={styles.heroCta} haptic="medium">
                <LinearGradient
                  colors={colors.gradientGold}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.heroCtaContent}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.heroCtaSmall}>AGENDAR ATENDIMENTO</Text>
                    <Text style={styles.heroCtaTitle}>Reserve seu horário em segundos</Text>
                  </View>
                  <View style={styles.heroCtaIcon}>
                    <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
                  </View>
                </View>
              </PressableScale>
            </LinearGradient>

            {upcoming.length > 0 && (
              <FadeInView delay={80} style={{ marginTop: -28 }}>
                <Text style={styles.sectionLabel}>Seu próximo horário</Text>
                <UpcomingCard
                  appt={upcoming[0]}
                  onPress={() =>
                    navigation.navigate('ClientAppointmentDetail', { appointment: upcoming[0] })
                  }
                />
              </FadeInView>
            )}

            {user && (
              <CampaignBanner campaigns={data.campaigns ?? []} userId={user.id} />
            )}

            <FadeInView delay={140}>
              <View style={styles.statsRow}>
                <StatBox icon="check-decagram" label="Concluídos" value={stats.completed.toString()} />
                <StatBox icon="calendar-multiple" label="Total" value={stats.total.toString()} />
                <StatBox icon="cash-100" label="Gasto total" value={formatCurrency(stats.totalSpent)} />
              </View>
            </FadeInView>

            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Histórico</Text>
              {history.length > 0 && (
                <Text style={styles.historyCount}>
                  {history.length} {history.length === 1 ? 'atendimento' : 'atendimentos'}
                </Text>
              )}
            </View>
          </>
        }
        renderItem={({ item, index }) => (
          <FadeInView delay={index * 60}>
            <HistoryCard
              appt={item}
              onPress={() =>
                navigation.navigate('ClientAppointmentDetail', { appointment: item })
              }
            />
          </FadeInView>
        )}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: spacing.lg }}>
            <EmptyState
              icon="calendar-blank-outline"
              title="Sem histórico ainda"
              subtitle="Faça seu primeiro agendamento e ele aparecerá aqui."
            />
          </View>
        }
      />
    </View>
  );
}

function UpcomingCard({ appt, onPress }: { appt: Appointment; onPress: () => void }) {
  const { data } = useAppContext();
  const prof = data.professionals.find((p) => p.id === appt.professionalId);
  const services = data.services.filter((s) => appt.serviceIds.includes(s.id));
  const dateLabel = (() => {
    try {
      return format(parseISO(appt.date), "EEE, dd 'de' MMM", { locale: ptBR });
    } catch {
      return appt.date;
    }
  })();

  return (
    <PressableScale onPress={onPress} style={styles.upcoming}>
      <LinearGradient colors={colors.gradientHero} style={StyleSheet.absoluteFill} />
      <View style={styles.upcomingDecor} />
      <View style={styles.upcomingTop}>
        <View style={styles.upcomingChip}>
          <MaterialCommunityIcons name="calendar-clock" size={12} color={colors.primary} />
          <Text style={styles.upcomingChipText}>PRÓXIMO</Text>
        </View>
        <Text style={styles.upcomingDate}>{dateLabel}</Text>
      </View>
      <Text style={styles.upcomingTime}>
        {appt.startTime} <Text style={styles.upcomingTimeMuted}>· {appt.endTime}</Text>
      </Text>
      <Text style={styles.upcomingServices} numberOfLines={1}>
        {services.map((s) => s.name).join(' • ')}
      </Text>
      {prof && (
        <View style={styles.upcomingProf}>
          <MaterialCommunityIcons name="account-tie" size={13} color={colors.primaryLight} />
          <Text style={styles.upcomingProfText}>{prof.name}</Text>
        </View>
      )}
    </PressableScale>
  );
}

function StatBox({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statBox}>
      <View style={styles.statBoxIcon}>
        <MaterialCommunityIcons name={icon} size={16} color={colors.primary} />
      </View>
      <Text style={styles.statBoxValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statBoxLabel}>{label}</Text>
    </View>
  );
}

function HistoryCard({ appt, onPress }: { appt: Appointment; onPress: () => void }) {
  const { data } = useAppContext();
  const prof = data.professionals.find((p) => p.id === appt.professionalId);
  const services = data.services.filter((s) => appt.serviceIds.includes(s.id));
  const dateLabel = (() => {
    try {
      return format(parseISO(appt.date), "dd 'de' MMM", { locale: ptBR });
    } catch {
      return appt.date;
    }
  })();

  return (
    <PressableScale onPress={onPress} style={styles.histCard}>
      <View style={styles.histDate}>
        <Text style={styles.histDateText}>{dateLabel}</Text>
        <Text style={styles.histTimeText}>{appt.startTime}</Text>
      </View>
      <View style={styles.histInfo}>
        <View style={styles.histTopRow}>
          {prof && <Text style={styles.histProfName} numberOfLines={1}>{prof.name}</Text>}
          <StatusBadge status={appt.status} />
        </View>
        <Text style={styles.histServices} numberOfLines={1}>
          {services.map((s) => s.name).join(' • ')}
        </Text>
        <View style={styles.histFooter}>
          <Text style={styles.histValue}>{formatCurrency(appt.totalValue)}</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  listContent: { paddingBottom: 100 },

  hero: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 60,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
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
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  greeting: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
  heroName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
  },
  heroAvatar: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  heroCta: {
    height: 78,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginTop: 4,
    shadowColor: colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  heroCtaContent: {
    flex: 1,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroCtaSmall: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  heroCtaTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  heroCtaIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionLabel: {
    ...typography.overline,
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  upcoming: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    overflow: 'hidden',
    ...(shadow.md as any),
  },
  upcomingDecor: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(212,162,76,0.12)',
  },
  upcomingTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  upcomingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(212,162,76,0.18)',
  },
  upcomingChipText: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  upcomingDate: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700' },
  upcomingTime: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginTop: 8,
  },
  upcomingTimeMuted: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    fontWeight: '600',
  },
  upcomingServices: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13.5,
    fontWeight: '600',
    marginTop: 2,
  },
  upcomingProf: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  upcomingProfText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
  },

  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...(shadow.sm as any),
  },
  statBoxIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statBoxValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  statBoxLabel: { ...typography.small, color: colors.textMuted, marginTop: 2 },

  historyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: spacing['2xl'],
    marginBottom: spacing.sm,
  },
  historyTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  historyCount: {
    ...typography.small,
    color: colors.textMuted,
  },

  histCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginVertical: 6,
    overflow: 'hidden',
    ...(shadow.sm as any),
  },
  histDate: {
    width: 78,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  histDateText: {
    ...typography.smallBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  histTimeText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  histInfo: { flex: 1, padding: spacing.md, gap: 4 },
  histTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  histProfName: { ...typography.bodyBold, color: colors.textPrimary, flex: 1 },
  histServices: { ...typography.small, color: colors.textSecondary },
  histFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  histValue: { ...typography.bodyBold, color: colors.success },
});

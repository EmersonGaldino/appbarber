import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, shadow, spacing, typography } from '../../theme';
import { PressableScale } from '../../components/PressableScale';
import { StatusBadge } from '../../components/StatusBadge';
import { EmptyState } from '../../components/EmptyState';
import { formatCurrency } from '../../utils/helpers';
import type {
  Appointment,
  ProfessionalScheduleStackParamList,
} from '../../types';

LocaleConfig.locales['pt-br'] = LocaleConfig.locales['pt-br'] ?? {
  monthNames: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  monthNamesShort: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
  dayNames: ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'],
  dayNamesShort: ['D','S','T','Q','Q','S','S'],
  today: 'Hoje',
};
LocaleConfig.defaultLocale = 'pt-br';

type Nav = StackNavigationProp<ProfessionalScheduleStackParamList, 'ProfessionalScheduleMain'>;

type Filter = 'today' | 'upcoming' | 'completed' | 'all';

export function ProfessionalScheduleScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { data } = useAppContext();
  const insets = useSafeAreaInsets();

  const today = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState(today);
  const [filter, setFilter] = useState<Filter>('today');

  const myProfessionalId = user?.professionalId;

  const myAppointments = useMemo(() => {
    if (!myProfessionalId) return [];
    return data.appointments.filter((a) => a.professionalId === myProfessionalId);
  }, [data.appointments, myProfessionalId]);

  // Resumo do dia selecionado
  const dayAppointments = useMemo(() => {
    return myAppointments
      .filter((a) => a.date === selectedDate)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [myAppointments, selectedDate]);

  const filteredAppointments = useMemo(() => {
    switch (filter) {
      case 'today':
        return dayAppointments;
      case 'upcoming':
        return myAppointments
          .filter((a) => a.date >= today && a.status === 'scheduled')
          .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
      case 'completed':
        return myAppointments
          .filter((a) => a.status === 'completed')
          .sort((a, b) => `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`));
      case 'all':
      default:
        return myAppointments
          .slice()
          .sort((a, b) => `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`));
    }
  }, [filter, dayAppointments, myAppointments, today]);

  const todayStats = useMemo(() => {
    const list = myAppointments.filter((a) => a.date === today);
    return {
      total: list.length,
      completed: list.filter((a) => a.status === 'completed').length,
      revenue: list
        .filter((a) => a.status === 'completed')
        .reduce((s, a) => s + a.totalValue, 0),
    };
  }, [myAppointments, today]);

  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    myAppointments.forEach((a) => {
      if (!marks[a.date]) marks[a.date] = { dots: [] };
      const dotColors: Record<string, string> = {
        scheduled: colors.info,
        completed: colors.success,
        cancelled: colors.danger,
        no_show: colors.warning,
      };
      if (marks[a.date].dots.length < 3) {
        marks[a.date].dots.push({ color: dotColors[a.status] ?? colors.textMuted });
      }
    });
    marks[selectedDate] = {
      ...(marks[selectedDate] ?? {}),
      selected: true,
      selectedColor: colors.ink,
    };
    return marks;
  }, [myAppointments, selectedDate]);

  if (!myProfessionalId) {
    return (
      <View style={[styles.container, { padding: spacing.xl }]}>
        <EmptyState
          icon="alert-circle-outline"
          title="Conta não vinculada"
          subtitle="Sua conta está marcada como profissional, mas não está vinculada a um cadastro. Peça para o administrador ajustar."
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.gradientHero}
        style={[styles.hero, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.heroDecor} />
        <Text style={styles.heroLabel}>MINHA AGENDA</Text>
        <Text style={styles.heroName} numberOfLines={1}>
          {user?.name?.split(' ').slice(0, 2).join(' ') ?? 'Profissional'}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <MaterialCommunityIcons name="calendar-today" size={14} color={colors.primary} />
            <View>
              <Text style={styles.statValue}>{todayStats.total}</Text>
              <Text style={styles.statLabel}>Hoje</Text>
            </View>
          </View>
          <View style={styles.statBox}>
            <MaterialCommunityIcons name="check-decagram" size={14} color={colors.primary} />
            <View>
              <Text style={styles.statValue}>{todayStats.completed}</Text>
              <Text style={styles.statLabel}>Concluídos</Text>
            </View>
          </View>
          <View style={styles.statBox}>
            <MaterialCommunityIcons name="cash-multiple" size={14} color={colors.primary} />
            <View>
              <Text style={styles.statValue}>{formatCurrency(todayStats.revenue)}</Text>
              <Text style={styles.statLabel}>Receita</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.calendarCard}>
        <Calendar
          current={today}
          onDayPress={(d) => {
            setSelectedDate(d.dateString);
            setFilter('today');
          }}
          markingType="multi-dot"
          markedDates={markedDates}
          theme={{
            backgroundColor: colors.surface,
            calendarBackground: colors.surface,
            textSectionTitleColor: colors.textMuted,
            selectedDayBackgroundColor: colors.ink,
            selectedDayTextColor: '#fff',
            todayTextColor: colors.primary,
            dayTextColor: colors.textPrimary,
            textDisabledColor: colors.borderStrong,
            arrowColor: colors.ink,
            monthTextColor: colors.textPrimary,
            textDayFontWeight: '600',
            textMonthFontWeight: '800',
            textDayHeaderFontWeight: '700',
            textDayFontSize: 13,
            textMonthFontSize: 15,
            textDayHeaderFontSize: 11,
          }}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {([
          { id: 'today', label: format(new Date(selectedDate + 'T12:00:00'), "dd 'de' MMM", { locale: ptBR }) },
          { id: 'upcoming', label: 'Próximos' },
          { id: 'completed', label: 'Concluídos' },
          { id: 'all', label: 'Todos' },
        ] as const).map((f) => (
          <PressableScale
            key={f.id}
            haptic="light"
            onPress={() => setFilter(f.id)}
            style={[styles.filterChip, filter === f.id && styles.filterChipActive]}
            scale={0.94}
          >
            <Text
              style={[
                styles.filterText,
                filter === f.id && styles.filterTextActive,
              ]}
              numberOfLines={1}
            >
              {f.label}
            </Text>
          </PressableScale>
        ))}
      </ScrollView>

      <FlatList
        data={filteredAppointments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          filteredAppointments.length === 0 ? styles.emptyList : styles.list
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-blank-outline"
            title="Sem agendamentos"
            subtitle="Nenhum item para o filtro selecionado."
          />
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInRight.delay(index * 50).springify().damping(16)}>
            <ProAppointmentCard
              item={item}
              onPress={() => navigation.navigate('AppointmentDetail', { appointment: item })}
            />
          </Animated.View>
        )}
      />
    </View>
  );
}

function ProAppointmentCard({
  item,
  onPress,
}: {
  item: Appointment;
  onPress: () => void;
}) {
  const { data } = useAppContext();
  const services = data.services.filter((s) => item.serviceIds.includes(s.id));

  const isCompleted = item.status === 'completed';
  const isCancelled = item.status === 'cancelled' || item.status === 'no_show';

  return (
    <PressableScale onPress={onPress} style={[styles.apptCard, isCancelled && { opacity: 0.6 }]}>
      <LinearGradient
        colors={
          isCompleted ? colors.gradientSuccess : isCancelled ? ['#6B7280', '#4B5563'] : colors.gradientHero
        }
        style={styles.timeBar}
      >
        <Text style={styles.timeStart}>{item.startTime}</Text>
        <View style={styles.timeLine} />
        <Text style={styles.timeEnd}>{item.endTime}</Text>
      </LinearGradient>
      <View style={styles.apptBody}>
        <View style={styles.apptTopRow}>
          <Text style={styles.clientName} numberOfLines={1}>
            {item.clientName}
          </Text>
          <StatusBadge status={item.status} />
        </View>
        <Text style={styles.serviceNames} numberOfLines={1}>
          {services.map((s) => s.name).join(' • ')}
        </Text>
        <View style={styles.apptFooter}>
          <Text style={styles.dateInline}>{item.date.split('-').reverse().join('/')}</Text>
          <Text style={styles.apptValue}>{formatCurrency(item.totalValue)}</Text>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  hero: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  heroDecor: {
    position: 'absolute',
    top: -90,
    right: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(212, 162, 76, 0.1)',
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  heroName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
  },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  statBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statValue: { color: '#fff', fontWeight: '800', fontSize: 14 },
  statLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: '600' },

  calendarCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 0,
    marginTop: -spacing.sm,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
    ...(shadow.sm as any),
  },

  filterRow: {
    paddingHorizontal: spacing.md,
    gap: 8,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  filterText: { ...typography.smallBold, color: colors.textSecondary, textTransform: 'capitalize' },
  filterTextActive: { color: '#fff' },

  list: { padding: spacing.md, gap: 10, paddingBottom: 110 },
  emptyList: { flex: 1 },

  apptCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    flexDirection: 'row',
    overflow: 'hidden',
    ...(shadow.sm as any),
  },
  timeBar: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: 4,
  },
  timeStart: { fontSize: 13, fontWeight: '800', color: '#fff' },
  timeLine: { width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.3)' },
  timeEnd: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  apptBody: { flex: 1, padding: spacing.md },
  apptTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  clientName: { ...typography.h3, color: colors.textPrimary, flex: 1 },
  serviceNames: { ...typography.small, color: colors.textSecondary, marginBottom: 6 },
  apptFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateInline: { ...typography.small, color: colors.textMuted, fontWeight: '700' },
  apptValue: { ...typography.bodyBold, color: colors.success },
});

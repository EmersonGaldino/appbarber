import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, FlatList } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import Animated, { FadeInRight, FadeIn } from 'react-native-reanimated';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAppContext } from '../../context/AppContext';
import { formatCurrency } from '../../utils/helpers';
import { Appointment, ScheduleStackParamList } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { EmptyState } from '../../components/EmptyState';
import { PressableScale } from '../../components/PressableScale';
import { AnimatedFAB } from '../../components/AnimatedFAB';
import { colors, radius, shadow, spacing, typography } from '../../theme';

LocaleConfig.locales['pt-br'] = {
  monthNames: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  monthNamesShort: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
  dayNames: ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'],
  dayNamesShort: ['D','S','T','Q','Q','S','S'],
  today: 'Hoje',
};
LocaleConfig.defaultLocale = 'pt-br';

type Nav = StackNavigationProp<ScheduleStackParamList, 'ScheduleMain'>;

export function ScheduleMainScreen() {
  const { data } = useAppContext();
  const navigation = useNavigation<Nav>();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedProfessional, setSelectedProfessional] = useState<string | 'all'>('all');

  const activeProfessionals = data.professionals.filter((p) => p.active);

  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    data.appointments.forEach((a) => {
      if (!marks[a.date]) {
        marks[a.date] = { dots: [] };
      }
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
  }, [data.appointments, selectedDate]);

  const dayAppointments = useMemo(() => {
    return data.appointments
      .filter((a) => {
        const matchDate = a.date === selectedDate;
        const matchProf = selectedProfessional === 'all' || a.professionalId === selectedProfessional;
        return matchDate && matchProf;
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [data.appointments, selectedDate, selectedProfessional]);

  const dayLabel = useMemo(() => {
    try {
      return format(new Date(selectedDate + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const dayRevenue = useMemo(() => {
    return dayAppointments
      .filter((a) => a.status === 'completed')
      .reduce((s, a) => s + a.totalValue, 0);
  }, [dayAppointments]);

  return (
    <View style={styles.container}>
      <View style={styles.calendarWrap}>
        <Calendar
          current={today}
          onDayPress={(day) => setSelectedDate(day.dateString)}
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
            dotColor: colors.primary,
            arrowColor: colors.ink,
            monthTextColor: colors.textPrimary,
            textDayFontWeight: '600',
            textMonthFontWeight: '800',
            textDayHeaderFontWeight: '700',
            textDayFontSize: 14,
            textMonthFontSize: 16,
            textDayHeaderFontSize: 11,
          }}
        />
      </View>

      {activeProfessionals.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.profFilter} contentContainerStyle={styles.profFilterContent}>
          <PressableScale
            haptic="light"
            scale={0.94}
            onPress={() => setSelectedProfessional('all')}
            style={[styles.profChip, selectedProfessional === 'all' && styles.profChipActive]}
          >
            <Text style={[styles.profChipText, selectedProfessional === 'all' && styles.profChipTextActive]}>Todos</Text>
          </PressableScale>
          {activeProfessionals.map((p) => (
            <PressableScale
              key={p.id}
              haptic="light"
              scale={0.94}
              onPress={() => setSelectedProfessional(p.id)}
              style={[styles.profChip, selectedProfessional === p.id && styles.profChipActive]}
            >
              <Text style={[styles.profChipText, selectedProfessional === p.id && styles.profChipTextActive]}>{p.name.split(' ')[0]}</Text>
            </PressableScale>
          ))}
        </ScrollView>
      )}

      <View style={styles.dayHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.dayLabel} numberOfLines={1}>{dayLabel}</Text>
          <Text style={styles.dayCount}>
            {dayAppointments.length} agendamento{dayAppointments.length !== 1 ? 's' : ''}
            {dayRevenue > 0 && ` · ${formatCurrency(dayRevenue)} concluído`}
          </Text>
        </View>
      </View>

      <FlatList
        data={dayAppointments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={dayAppointments.length === 0 ? styles.emptyList : styles.apptList}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-blank-outline"
            title="Dia livre"
            subtitle="Toque no botão dourado para criar um agendamento"
          />
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInRight.delay(index * 60).springify().damping(16)}>
            <AppointmentCard
              item={item}
              onPress={() => navigation.navigate('AppointmentDetail', { appointment: item })}
            />
          </Animated.View>
        )}
      />

      <AnimatedFAB
        icon="calendar-plus"
        onPress={() =>
          navigation.navigate('AppointmentForm', {
            date: selectedDate,
            professionalId: selectedProfessional !== 'all' ? selectedProfessional : undefined,
          })
        }
      />
    </View>
  );
}

function AppointmentCard({ item, onPress }: { item: Appointment; onPress: () => void }) {
  const { data } = useAppContext();
  const professional = data.professionals.find((p) => p.id === item.professionalId);
  const services = data.services.filter((s) => item.serviceIds.includes(s.id));

  const isCompleted = item.status === 'completed';
  const isCancelled = item.status === 'cancelled' || item.status === 'no_show';

  return (
    <PressableScale onPress={onPress} style={[styles.apptCard, isCancelled && { opacity: 0.6 }]}>
      <LinearGradient
        colors={isCompleted ? colors.gradientSuccess : isCancelled ? ['#6B7280', '#4B5563'] : colors.gradientHero}
        style={styles.timeBar}
      >
        <Text style={styles.timeStart}>{item.startTime}</Text>
        <View style={styles.timeLine} />
        <Text style={styles.timeEnd}>{item.endTime}</Text>
      </LinearGradient>
      <View style={styles.apptBody}>
        <View style={styles.apptTopRow}>
          <Text style={styles.clientName} numberOfLines={1}>{item.clientName}</Text>
          <StatusBadge status={item.status} />
        </View>
        <Text style={styles.serviceNames} numberOfLines={1}>
          {services.map((s) => s.name).join(' • ')}
        </Text>
        <View style={styles.apptFooter}>
          {professional && (
            <View style={styles.profInline}>
              <MaterialCommunityIcons name="account-tie" size={11} color={colors.primary} />
              <Text style={styles.profName}>{professional.name}</Text>
            </View>
          )}
          <Text style={styles.apptValue}>{formatCurrency(item.totalValue)}</Text>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  calendarWrap: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    ...(shadow.sm as any),
  },
  profFilter: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  profFilterContent: { paddingHorizontal: spacing.md, paddingVertical: 10, gap: 8 },
  profChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.bg },
  profChipActive: { backgroundColor: colors.ink },
  profChipText: { ...typography.smallBold, color: colors.textSecondary },
  profChipTextActive: { color: '#fff' },
  dayHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayLabel: {
    ...typography.h3,
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  dayCount: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  apptList: { padding: spacing.md, gap: 10, paddingBottom: 110 },
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
  apptTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, gap: 8 },
  clientName: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
  },
  serviceNames: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  apptFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profInline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  profName: { ...typography.small, color: colors.primary, fontWeight: '700' },
  apptValue: { ...typography.bodyBold, color: colors.success },
});

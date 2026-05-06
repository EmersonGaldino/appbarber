import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { addMinutesToTime, formatCurrency, generateTimeSlots } from '../../utils/helpers';
import { colors, radius, shadow, spacing, typography } from '../../theme';
import { PressableScale } from '../../components/PressableScale';
import type { Appointment, ClientBookStackParamList, Service } from '../../types';

LocaleConfig.locales['pt-br'] = LocaleConfig.locales['pt-br'] ?? {
  monthNames: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  monthNamesShort: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
  dayNames: ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'],
  dayNamesShort: ['D','S','T','Q','Q','S','S'],
  today: 'Hoje',
};
LocaleConfig.defaultLocale = 'pt-br';

const DAY_KEYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'] as const;

type Nav = StackNavigationProp<ClientBookStackParamList, 'ClientBookingForm'>;
type Route = RouteProp<ClientBookStackParamList, 'ClientBookingForm'>;

export function ClientBookingFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { data, addAppointment } = useAppContext();
  const { user } = useAuth();

  const today = format(new Date(), 'yyyy-MM-dd');
  const [professionalId, setProfessionalId] = useState<string>(route.params?.professionalId ?? '');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const activeProfessionals = useMemo(
    () => data.professionals.filter((p) => p.active),
    [data.professionals]
  );
  const activeServices = useMemo(() => data.services.filter((s) => s.active), [data.services]);

  const selectedProfessional = activeProfessionals.find((p) => p.id === professionalId);
  const selectedServices: Service[] = activeServices.filter((s) =>
    selectedServiceIds.includes(s.id)
  );

  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
  const totalValue = selectedServices.reduce((sum, s) => sum + s.price, 0);

  /** Gera slots disponíveis para o dia/profissional considerando working hours e conflitos. */
  const availableSlots = useMemo(() => {
    if (!selectedProfessional || totalDuration === 0) return [];
    const dt = parseISO(selectedDate + 'T12:00:00');
    const dayKey = DAY_KEYS[dt.getDay()];
    const wh = selectedProfessional.workingHours?.[dayKey];
    if (!wh || !wh.active) return [];

    const baseSlots = generateTimeSlots(wh.start, wh.end, 30);
    const dayAppts = data.appointments.filter(
      (a) =>
        a.professionalId === selectedProfessional.id &&
        a.date === selectedDate &&
        a.status !== 'cancelled' &&
        a.status !== 'no_show'
    );

    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const endMin = toMin(wh.end);
    const nowMin = (() => {
      const n = new Date();
      return n.getHours() * 60 + n.getMinutes();
    })();
    const isToday = selectedDate === today;

    return baseSlots.filter((slot) => {
      const start = toMin(slot);
      const end = start + totalDuration;
      if (end > endMin) return false;
      if (isToday && start <= nowMin) return false;
      const overlaps = dayAppts.some((a) => {
        const aStart = toMin(a.startTime);
        const aEnd = toMin(a.endTime);
        return Math.max(aStart, start) < Math.min(aEnd, end);
      });
      return !overlaps;
    });
  }, [selectedProfessional, selectedDate, totalDuration, data.appointments, today]);

  function toggleService(id: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
    setSelectedTime(null);
  }

  async function handleConfirm() {
    if (!user) return;
    if (!selectedProfessional) {
      Alert.alert('Atenção', 'Selecione um profissional.');
      return;
    }
    if (selectedServices.length === 0) {
      Alert.alert('Atenção', 'Selecione pelo menos um serviço.');
      return;
    }
    if (!selectedTime) {
      Alert.alert('Atenção', 'Selecione um horário.');
      return;
    }

    const endTime = addMinutesToTime(selectedTime, totalDuration);
    const payload: Omit<Appointment, 'id' | 'createdAt'> = {
      professionalId: selectedProfessional.id,
      clientName: user.name,
      clientPhone: user.phone,
      clientUserId: user.id,
      serviceIds: selectedServiceIds,
      productIds: [],
      date: selectedDate,
      startTime: selectedTime,
      endTime,
      status: 'scheduled',
      totalValue,
    };

    setSubmitting(true);
    try {
      await addAppointment(payload);
      Alert.alert('Tudo certo!', 'Seu horário foi reservado com sucesso.', [
        {
          text: 'Ver meus agendamentos',
          onPress: () => {
            // Volta para a tela inicial da stack de booking e troca para a aba Início.
            navigation.popToTop();
            const parent = navigation.getParent();
            if (parent) parent.navigate('ClientHome' as never);
          },
        },
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível concluir o agendamento.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profissional */}
        <Text style={styles.sectionTitle}>1. Profissional</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.profRow}>
          {activeProfessionals.map((p) => {
            const selected = professionalId === p.id;
            return (
              <PressableScale
                key={p.id}
                onPress={() => {
                  setProfessionalId(p.id);
                  setSelectedTime(null);
                }}
                haptic="light"
                style={[styles.profChip, selected && styles.profChipActive]}
              >
                <View style={[styles.profChipBubble, selected && styles.profChipBubbleActive]}>
                  <Text style={[styles.profChipBubbleText, selected && { color: '#fff' }]}>
                    {p.name[0]?.toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.profChipName, selected && styles.profChipNameActive]} numberOfLines={1}>
                  {p.name.split(' ')[0]}
                </Text>
              </PressableScale>
            );
          })}
        </ScrollView>

        {/* Serviços */}
        <Text style={styles.sectionTitle}>2. Serviços</Text>
        <View style={styles.servicesWrap}>
          {activeServices.length === 0 ? (
            <Text style={styles.empty}>Nenhum serviço disponível.</Text>
          ) : (
            activeServices.map((s) => {
              const selected = selectedServiceIds.includes(s.id);
              return (
                <PressableScale
                  key={s.id}
                  onPress={() => toggleService(s.id)}
                  style={[styles.serviceCard, selected && styles.serviceCardActive]}
                  haptic="light"
                >
                  <View style={[styles.checkbox, selected && styles.checkboxActive]}>
                    {selected && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceName}>{s.name}</Text>
                    <Text style={styles.serviceMeta}>
                      {s.duration} min · {formatCurrency(s.price)}
                    </Text>
                  </View>
                  <Text style={[styles.servicePrice, selected && { color: colors.primary }]}>
                    {formatCurrency(s.price)}
                  </Text>
                </PressableScale>
              );
            })
          )}
        </View>

        {/* Data */}
        <Text style={styles.sectionTitle}>3. Data</Text>
        <View style={styles.calendarCard}>
          <Calendar
            current={selectedDate}
            minDate={today}
            onDayPress={(d) => {
              setSelectedDate(d.dateString);
              setSelectedTime(null);
            }}
            markedDates={{
              [selectedDate]: { selected: true, selectedColor: colors.ink },
            }}
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
            }}
          />
        </View>

        {/* Horário */}
        <Text style={styles.sectionTitle}>4. Horário</Text>
        {!selectedProfessional || selectedServices.length === 0 ? (
          <Text style={styles.empty}>
            {!selectedProfessional
              ? 'Selecione um profissional acima.'
              : 'Selecione ao menos um serviço.'}
          </Text>
        ) : availableSlots.length === 0 ? (
          <Text style={styles.empty}>Nenhum horário disponível neste dia. Escolha outra data.</Text>
        ) : (
          <View style={styles.slotsWrap}>
            {availableSlots.map((slot) => {
              const selected = selectedTime === slot;
              return (
                <PressableScale
                  key={slot}
                  onPress={() => setSelectedTime(slot)}
                  haptic="light"
                  scale={0.94}
                  style={[styles.slot, selected && styles.slotActive]}
                >
                  <Text style={[styles.slotText, selected && styles.slotTextActive]}>{slot}</Text>
                </PressableScale>
              );
            })}
          </View>
        )}
      </ScrollView>

      <LinearGradient colors={colors.gradientGold} style={styles.bottomBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bottomLabel}>Total</Text>
          <Text style={styles.bottomValue}>{formatCurrency(totalValue)}</Text>
          {selectedTime && (
            <Text style={styles.bottomMeta}>
              {format(parseISO(selectedDate + 'T12:00:00'), "dd/MM", { locale: ptBR })} · {selectedTime} → {addMinutesToTime(selectedTime, totalDuration)}
            </Text>
          )}
        </View>
        <PressableScale
          onPress={handleConfirm}
          haptic="medium"
          style={[styles.confirm, submitting && { opacity: 0.6 }]}
          disabled={submitting}
        >
          <Text style={styles.confirmText}>
            {submitting ? 'Reservando...' : 'Confirmar'}
          </Text>
          <MaterialCommunityIcons name="check-circle" size={18} color="#fff" />
        </PressableScale>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 140 },

  sectionTitle: {
    ...typography.overline,
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  profRow: { gap: spacing.md, paddingRight: spacing.md, paddingVertical: 4 },
  profChip: {
    alignItems: 'center',
    width: 78,
    paddingVertical: spacing.sm,
    gap: 6,
    borderRadius: radius.md,
  },
  profChipActive: { backgroundColor: colors.primarySoft },
  profChipBubble: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  profChipBubbleActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  profChipBubbleText: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
  profChipName: { ...typography.smallBold, color: colors.textSecondary },
  profChipNameActive: { color: colors.primaryDark },

  servicesWrap: { gap: spacing.sm },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  serviceCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  serviceName: { ...typography.bodyBold, color: colors.textPrimary, fontSize: 14 },
  serviceMeta: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  servicePrice: { ...typography.bodyBold, color: colors.success },

  calendarCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...(shadow.sm as any),
  },

  empty: { ...typography.small, color: colors.textMuted, paddingVertical: spacing.md },

  slotsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.lg,
  },
  slot: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  slotActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  slotText: { ...typography.smallBold, color: colors.textSecondary, fontSize: 13 },
  slotTextActive: { color: '#fff' },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  bottomLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '700', letterSpacing: 1.2 },
  bottomValue: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  bottomMeta: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 2 },

  confirm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  confirmText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});

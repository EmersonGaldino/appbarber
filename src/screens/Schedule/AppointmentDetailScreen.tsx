import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useAppContext } from '../../context/AppContext';
import { ScheduleStackParamList, Appointment, User } from '../../types';
import { appointmentProductQuantity, formatCurrency, formatDate, paymentMethodLabel } from '../../utils/helpers';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { CompleteAppointmentDialog } from '../../components/CompleteAppointmentDialog';
import { PressableScale } from '../../components/PressableScale';
import { sendAppointmentCompletedPush } from '../../services/pushNotifications';
import { colors, radius, shadow, spacing, typography } from '../../theme';

function normalizePhone(phone: string | null | undefined): string {
  return (phone ?? '').replace(/\D/g, '');
}

function findClientUser(users: User[], appt: Appointment): User | undefined {
  if (appt.clientUserId) {
    const direct = users.find((u) => u.id === appt.clientUserId);
    if (direct) return direct;
  }
  const phone = normalizePhone(appt.clientPhone);
  if (!phone) return undefined;
  return users.find(
    (u) => u.role === 'client' && normalizePhone(u.phone) === phone
  );
}

type Nav = StackNavigationProp<ScheduleStackParamList, 'AppointmentDetail'>;
type Route = RouteProp<ScheduleStackParamList, 'AppointmentDetail'>;

const STATUS_ACTIONS: { status: Appointment['status']; label: string; color: string; icon: string }[] = [
  { status: 'completed', label: 'Concluir', color: colors.success, icon: 'check-circle' },
  { status: 'cancelled', label: 'Cancelar', color: colors.danger, icon: 'close-circle' },
  { status: 'no_show', label: 'Faltou', color: colors.warning, icon: 'account-off' },
];

export function AppointmentDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { data, updateAppointment, deleteAppointment } = useAppContext();
  const [showDelete, setShowDelete] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [completing, setCompleting] = useState(false);

  const appt = data.appointments.find((a) => a.id === route.params.appointment.id) ?? route.params.appointment;
  const professional = data.professionals.find((p) => p.id === appt.professionalId);
  const services = data.services.filter((s) => appt.serviceIds.includes(s.id));
  const products = data.products.filter((p) => appt.productIds.includes(p.id));

  async function notifyClientOfCompletion(notes: string) {
    const client = findClientUser(data.users, appt);
    if (!client?.pushToken) return;

    const summary = services.map((s) => s.name).join(' + ') || undefined;
    const result = await sendAppointmentCompletedPush({
      token: client.pushToken,
      clientName: appt.clientName,
      professionalName: professional?.name,
      serviceSummary: summary,
      notes: notes || undefined,
    });
    if (!result.ok) {
      console.warn('Falha ao notificar cliente:', result.error);
    }
  }

  async function changeStatus(status: Appointment['status']) {
    if (status === 'completed') {
      if (!appt.paymentMethod) {
        Alert.alert('Atenção', 'Recomendamos informar a forma de pagamento antes de concluir.');
      }
      setShowComplete(true);
      return;
    }
    await updateAppointment(appt.id, { status });
  }

  async function handleConfirmComplete(notes: string) {
    if (completing) return;
    setCompleting(true);
    try {
      const patch: Partial<Appointment> = { status: 'completed' };
      if (notes && notes !== (appt.notes ?? '')) {
        patch.notes = notes;
      } else if (!notes && appt.notes) {
        patch.notes = appt.notes;
      }
      await updateAppointment(appt.id, patch);
      await notifyClientOfCompletion(notes);
      setShowComplete(false);
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível concluir o atendimento.');
    } finally {
      setCompleting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Animated.View entering={FadeIn.duration(300)}>
        <LinearGradient colors={colors.gradientHero} style={styles.hero}>
          <View style={styles.heroDecor} />
          <View style={styles.heroTopRow}>
            <Text style={styles.heroLabel}>CLIENTE</Text>
            <StatusBadge status={appt.status} />
          </View>
          <Text style={styles.clientName}>{appt.clientName}</Text>
          {appt.clientPhone ? (
            <View style={styles.phoneRow}>
              <MaterialCommunityIcons name="phone" size={13} color="rgba(255,255,255,0.6)" />
              <Text style={styles.clientPhone}>{appt.clientPhone}</Text>
            </View>
          ) : null}
        </LinearGradient>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).springify()}>
        <View style={styles.infoCard}>
          <InfoRow icon="calendar" label="Data" value={formatDate(appt.date)} />
          <View style={styles.divider} />
          <InfoRow icon="clock-outline" label="Horário" value={`${appt.startTime} – ${appt.endTime}`} />
          {professional && (
            <>
              <View style={styles.divider} />
              <InfoRow icon="account-tie" label="Profissional" value={professional.name} accent={colors.primary} />
            </>
          )}
          {appt.paymentMethod && (
            <>
              <View style={styles.divider} />
              <InfoRow icon="credit-card" label="Pagamento" value={paymentMethodLabel(appt.paymentMethod)} />
            </>
          )}
        </View>
      </Animated.View>

      {services.length > 0 && (
        <Animated.View entering={FadeInDown.delay(140).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Serviços</Text>
          {services.map((s) => (
            <View key={s.id} style={styles.lineItem}>
              <View style={styles.lineIcon}>
                <MaterialCommunityIcons name="scissors-cutting" size={14} color={colors.primary} />
              </View>
              <Text style={[styles.lineItemName, styles.lineItemNameGrow]}>{s.name}</Text>
              <Text style={styles.lineItemPrice}>{formatCurrency(s.price)}</Text>
            </View>
          ))}
        </Animated.View>
      )}

      {products.length > 0 && (
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Produtos</Text>
          {products.map((p) => {
            const qty = appointmentProductQuantity(appt, p.id);
            const lineTotal = p.price * qty;
            return (
              <View key={p.id} style={styles.lineItem}>
                <View style={[styles.lineIcon, { backgroundColor: '#EDE9FE' }]}>
                  <MaterialCommunityIcons name="shopping" size={14} color="#6D28D9" />
                </View>
                <View style={styles.lineItemTextCol}>
                  <Text style={styles.lineItemName}>{p.name}</Text>
                  <Text style={styles.lineItemMeta}>
                    {qty} × {formatCurrency(p.price)}
                  </Text>
                </View>
                <Text style={styles.lineItemPrice}>{formatCurrency(lineTotal)}</Text>
              </View>
            );
          })}
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.delay(260).springify()}>
        <LinearGradient colors={colors.gradientGold} style={styles.totalBox}>
          <View>
            <Text style={styles.totalLabel}>TOTAL DO ATENDIMENTO</Text>
            <Text style={styles.totalValue}>{formatCurrency(appt.totalValue)}</Text>
          </View>
          <MaterialCommunityIcons name="cash-multiple" size={48} color="rgba(255,255,255,0.25)" />
        </LinearGradient>
      </Animated.View>

      {appt.notes ? (
        <Animated.View entering={FadeInDown.delay(320).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Observações</Text>
          <Text style={styles.notesText}>{appt.notes}</Text>
        </Animated.View>
      ) : null}

      {appt.clientFeedback ? (
        <Animated.View entering={FadeInDown.delay(360).springify()} style={[styles.section, styles.feedbackSection]}>
          <View style={styles.feedbackHeader}>
            <MaterialCommunityIcons name="message-text" size={16} color={colors.primary} />
            <Text style={styles.feedbackTitle}>Feedback do cliente</Text>
          </View>
          <Text style={styles.notesText}>{appt.clientFeedback}</Text>
        </Animated.View>
      ) : null}

      {appt.status === 'scheduled' && (
        <Animated.View entering={FadeInDown.delay(380).springify()}>
          <Text style={styles.actionsTitle}>Atualizar status</Text>
          <View style={styles.actionsGrid}>
            {STATUS_ACTIONS.map((action) => (
              <PressableScale
                key={action.status}
                haptic="medium"
                onPress={() => changeStatus(action.status)}
                style={[styles.actionBtn, { borderColor: action.color }]}
              >
                <MaterialCommunityIcons name={action.icon as any} size={20} color={action.color} />
                <Text style={[styles.actionBtnText, { color: action.color }]}>{action.label}</Text>
              </PressableScale>
            ))}
          </View>
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.delay(440).springify()} style={styles.bottomActions}>
        <PressableScale
          onPress={() => navigation.navigate('AppointmentForm', { appointment: appt })}
          haptic="light"
          style={styles.editBtn}
        >
          <MaterialCommunityIcons name="pencil" size={18} color={colors.info} />
          <Text style={styles.editBtnText}>Editar</Text>
        </PressableScale>
        <PressableScale
          onPress={() => setShowDelete(true)}
          haptic="medium"
          style={styles.deleteBtn}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger} />
          <Text style={styles.deleteBtnText}>Excluir</Text>
        </PressableScale>
      </Animated.View>

      <ConfirmDialog
        visible={showDelete}
        title="Excluir agendamento"
        message="Deseja excluir este agendamento permanentemente?"
        onConfirm={async () => {
          await deleteAppointment(appt.id);
          setShowDelete(false);
          navigation.goBack();
        }}
        onCancel={() => setShowDelete(false)}
        confirmLabel="Excluir"
      />

      <CompleteAppointmentDialog
        visible={showComplete}
        initialNotes={appt.notes ?? ''}
        loading={completing}
        onCancel={() => {
          if (!completing) setShowComplete(false);
        }}
        onConfirm={handleConfirmComplete}
      />
    </ScrollView>
  );
}

function InfoRow({ icon, label, value, accent }: { icon: string; label: string; value: string; accent?: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIconWrap, accent && { backgroundColor: accent + '15' }]}>
        <MaterialCommunityIcons name={icon as any} size={16} color={accent ?? colors.textSecondary} />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 40, gap: spacing.md },
  hero: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    overflow: 'hidden',
  },
  heroDecor: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(212, 162, 76, 0.12)',
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.55)',
  },
  clientName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginTop: 6,
    letterSpacing: -0.5,
  },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  clientPhone: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },

  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...(shadow.sm as any),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 10,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  infoLabel: { ...typography.body, color: colors.textMuted, flex: 1 },
  infoValue: { ...typography.bodyBold, color: colors.textPrimary },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 44 },

  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...(shadow.sm as any),
  },
  sectionTitle: {
    ...typography.overline,
    color: colors.textMuted,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  lineIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineItemTextCol: { flex: 1, minWidth: 0 },
  lineItemName: { ...typography.body, color: colors.textPrimary },
  lineItemNameGrow: { flex: 1 },
  lineItemMeta: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  lineItemPrice: { ...typography.bodyBold, color: colors.success },

  totalBox: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
    ...(shadow.gold as any),
  },
  totalLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: 'rgba(255,255,255,0.85)' },
  totalValue: { fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 4, letterSpacing: -0.8 },

  notesText: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },

  feedbackSection: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(212,162,76,0.35)',
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  feedbackTitle: {
    ...typography.overline,
    color: colors.primary,
  },

  actionsTitle: { ...typography.overline, color: colors.textMuted, marginBottom: 10, paddingHorizontal: 4 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: {
    flex: 1,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: colors.surface,
  },
  actionBtnText: { ...typography.smallBold },

  bottomActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.infoSoft,
    borderRadius: radius.md,
    paddingVertical: 14,
  },
  editBtnText: { ...typography.bodyBold, color: colors.info },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    paddingVertical: 14,
  },
  deleteBtnText: { ...typography.bodyBold, color: colors.danger },
});

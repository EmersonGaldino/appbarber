import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAppContext } from '../../context/AppContext';
import { colors, radius, shadow, spacing, typography } from '../../theme';
import { PressableScale } from '../../components/PressableScale';
import { StatusBadge } from '../../components/StatusBadge';
import { NotesDialog } from '../../components/NotesDialog';
import { appointmentProductQuantity, formatCurrency, paymentMethodLabel } from '../../utils/helpers';
import type { ClientHomeStackParamList } from '../../types';

type Route = RouteProp<ClientHomeStackParamList, 'ClientAppointmentDetail'>;

export function ClientAppointmentDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { data, updateAppointment } = useAppContext();
  const [showFeedback, setShowFeedback] = useState(false);
  const [savingFeedback, setSavingFeedback] = useState(false);

  // Sempre busca dado fresco para refletir alterações.
  const appt = useMemo(
    () => data.appointments.find((a) => a.id === route.params.appointment.id) ?? route.params.appointment,
    [data.appointments, route.params.appointment]
  );
  const prof = data.professionals.find((p) => p.id === appt.professionalId);
  const services = data.services.filter((s) => appt.serviceIds.includes(s.id));
  const products = data.products.filter((p) => appt.productIds.includes(p.id));
  const canFeedback = appt.status === 'completed';
  const hasFeedback = !!(appt.clientFeedback && appt.clientFeedback.trim().length > 0);

  async function handleSaveFeedback(value: string) {
    if (savingFeedback) return;
    setSavingFeedback(true);
    try {
      await updateAppointment(appt.id, { clientFeedback: value });
      setShowFeedback(false);
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível salvar seu feedback.');
    } finally {
      setSavingFeedback(false);
    }
  }

  const dateLabel = (() => {
    try {
      return format(parseISO(appt.date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return appt.date;
    }
  })();

  const canCancel = appt.status === 'scheduled';

  function handleCancel() {
    Alert.alert(
      'Cancelar agendamento?',
      'Você poderá fazer um novo a qualquer momento.',
      [
        { text: 'Manter', style: 'cancel' },
        {
          text: 'Cancelar agendamento',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateAppointment(appt.id, { status: 'cancelled' });
              navigation.goBack();
            } catch (e) {
              console.error(e);
              Alert.alert('Erro', 'Não foi possível cancelar.');
            }
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 12) + 4 }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={colors.gradientHero} style={styles.hero}>
          <View style={styles.heroDecor} />
          <View style={styles.heroHeader}>
            <PressableScale
              onPress={() => navigation.goBack()}
              style={styles.heroBackBtn}
              haptic="light"
            >
              <MaterialCommunityIcons name="chevron-left" size={22} color="#fff" />
            </PressableScale>
            <Text style={styles.heroTitle}>Atendimento</Text>
            <View style={styles.heroBackBtnSpacer} />
          </View>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroDate}>{dateLabel}</Text>
            <StatusBadge status={appt.status} />
          </View>
          <Text style={styles.heroTime}>
            {appt.startTime} <Text style={styles.heroTimeMuted}>· {appt.endTime}</Text>
          </Text>
          {prof && (
            <View style={styles.heroProf}>
              <MaterialCommunityIcons name="account-tie" size={14} color={colors.primaryLight} />
              <Text style={styles.heroProfText}>{prof.name}</Text>
            </View>
          )}
        </LinearGradient>

        <Text style={styles.sectionTitle}>Serviços</Text>
        <View style={styles.card}>
          {services.length === 0 ? (
            <Text style={styles.emptyText}>Sem serviços</Text>
          ) : (
            services.map((s, i) => (
              <View
                key={s.id}
                style={[
                  styles.lineRow,
                  i < services.length - 1 && styles.lineRowDivider,
                ]}
              >
                <View style={styles.lineBullet}>
                  <MaterialCommunityIcons name="content-cut" size={14} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineName}>{s.name}</Text>
                  <Text style={styles.lineMeta}>{s.duration} min</Text>
                </View>
                <Text style={styles.linePrice}>{formatCurrency(s.price)}</Text>
              </View>
            ))
          )}
        </View>

        {products.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Produtos</Text>
            <View style={styles.card}>
              {products.map((p, i) => {
                const qty = appointmentProductQuantity(appt, p.id);
                const lineTotal = p.price * qty;
                return (
                  <View
                    key={p.id}
                    style={[
                      styles.lineRow,
                      i < products.length - 1 && styles.lineRowDivider,
                    ]}
                  >
                    <View style={[styles.lineBullet, { backgroundColor: '#F5F3FF' }]}>
                      <MaterialCommunityIcons name="shopping" size={14} color="#8B5CF6" />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.lineName}>{p.name}</Text>
                      <Text style={styles.lineMeta}>
                        {qty} × {formatCurrency(p.price)}
                      </Text>
                    </View>
                    <Text style={styles.linePrice}>{formatCurrency(lineTotal)}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Resumo</Text>
        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Valor total</Text>
            <Text style={styles.totalValue}>{formatCurrency(appt.totalValue)}</Text>
          </View>
          {appt.paymentMethod && (
            <View style={styles.totalRowSmall}>
              <Text style={styles.smallLabel}>Pagamento</Text>
              <Text style={styles.smallValue}>{paymentMethodLabel(appt.paymentMethod)}</Text>
            </View>
          )}
        </View>

        {appt.notes ? (
          <>
            <Text style={styles.sectionTitle}>Observações</Text>
            <View style={styles.card}>
              <Text style={styles.notesText}>{appt.notes}</Text>
            </View>
          </>
        ) : null}

        {canFeedback && (
          <>
            <Text style={styles.sectionTitle}>Seu feedback</Text>
            {hasFeedback ? (
              <View style={styles.card}>
                <Text style={styles.notesText}>{appt.clientFeedback}</Text>
                <PressableScale
                  onPress={() => setShowFeedback(true)}
                  style={styles.feedbackEditBtn}
                  haptic="light"
                >
                  <MaterialCommunityIcons name="pencil" size={14} color={colors.primary} />
                  <Text style={styles.feedbackEditText}>Editar feedback</Text>
                </PressableScale>
              </View>
            ) : (
              <PressableScale
                onPress={() => setShowFeedback(true)}
                style={styles.feedbackBtn}
                haptic="light"
              >
                <MaterialCommunityIcons name="message-text-outline" size={18} color={colors.primary} />
                <Text style={styles.feedbackBtnText}>Adicionar feedback</Text>
              </PressableScale>
            )}
          </>
        )}

        {canCancel && (
          <PressableScale onPress={handleCancel} style={styles.cancelBtn} haptic="medium">
            <MaterialCommunityIcons name="calendar-remove" size={18} color={colors.danger} />
            <Text style={styles.cancelText}>Cancelar agendamento</Text>
          </PressableScale>
        )}
      </ScrollView>

      <NotesDialog
        visible={showFeedback}
        title="Seu feedback"
        subtitle="Conte como foi o atendimento. Sua opinião nos ajuda a melhorar."
        inputLabel="Mensagem"
        placeholder="Ex.: Adorei o corte e o atendimento foi excelente."
        confirmLabel={hasFeedback ? 'Salvar' : 'Enviar'}
        iconName="message-text-outline"
        iconColor={colors.primary}
        iconBackground={colors.primarySoft}
        confirmBackground={colors.primary}
        initialValue={appt.clientFeedback ?? ''}
        loading={savingFeedback}
        onCancel={() => {
          if (!savingFeedback) setShowFeedback(false);
        }}
        onConfirm={handleSaveFeedback}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 40 },
  hero: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    ...(shadow.md as any),
  },
  heroDecor: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(212,162,76,0.1)',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  heroBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBackBtnSpacer: { width: 36, height: 36 },
  heroTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroDate: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12.5,
    fontWeight: '600',
    textTransform: 'capitalize',
    flex: 1,
    marginRight: 8,
  },
  heroTime: { color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: -0.6, marginTop: 8 },
  heroTimeMuted: { color: 'rgba(255,255,255,0.55)', fontSize: 16, fontWeight: '600' },
  heroProf: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  heroProfText: { color: colors.primaryLight, fontWeight: '700', fontSize: 13 },

  sectionTitle: {
    ...typography.overline,
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 4, ...(shadow.sm as any) },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  lineRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  lineBullet: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineName: { ...typography.bodyBold, color: colors.textPrimary },
  lineMeta: { ...typography.small, color: colors.textMuted, marginTop: 1 },
  linePrice: { ...typography.bodyBold, color: colors.success },
  emptyText: { ...typography.small, color: colors.textMuted, padding: spacing.md },

  totalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...(shadow.sm as any),
  },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalRowSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: { ...typography.small, color: colors.textMuted, fontWeight: '700' },
  totalValue: { fontSize: 24, fontWeight: '800', color: colors.success, letterSpacing: -0.5 },
  smallLabel: { ...typography.small, color: colors.textMuted },
  smallValue: { ...typography.smallBold, color: colors.textPrimary },

  notesText: { ...typography.body, color: colors.textPrimary, padding: spacing.md, lineHeight: 20 },

  feedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(212,162,76,0.35)',
  },
  feedbackBtnText: { color: colors.primary, fontWeight: '800' },
  feedbackEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  feedbackEditText: { color: colors.primary, fontSize: 12, fontWeight: '700' },

  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: 'rgba(225,29,72,0.25)',
    marginTop: spacing.xl,
  },
  cancelText: { color: colors.danger, fontWeight: '800' },
});

import React, { useState, useLayoutEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppContext } from '../../context/AppContext';
import { ScheduleStackParamList, PaymentMethod, Appointment, Product } from '../../types';
import { FormField } from '../../components/FormField';
import { PressableScale } from '../../components/PressableScale';
import {
  formatCurrency,
  PAYMENT_METHODS,
  addMinutesToTime,
  maskPhoneBR,
  PHONE_MASK_MAX_LENGTH,
  appointmentProductQuantity,
} from '../../utils/helpers';
import { colors, radius, shadow, spacing, typography } from '../../theme';

type Nav = StackNavigationProp<ScheduleStackParamList, 'AppointmentForm'>;
type Route = RouteProp<ScheduleStackParamList, 'AppointmentForm'>;

function initialProductQty(editing?: Appointment): Record<string, number> {
  if (!editing?.productIds?.length) return {};
  const out: Record<string, number> = {};
  for (const id of editing.productIds) {
    out[id] = appointmentProductQuantity(editing, id);
  }
  return out;
}

function maxQtyForProduct(p: Product): number {
  return p.stock > 0 ? p.stock : 9999;
}

export function AppointmentFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { data, addAppointment, updateAppointment } = useAppContext();
  const editing = route.params?.appointment;

  const [clientName, setClientName] = useState(editing?.clientName ?? '');
  const [clientPhone, setClientPhone] = useState(maskPhoneBR(editing?.clientPhone ?? ''));
  const [date, setDate] = useState(editing?.date ?? route.params?.date ?? new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(editing?.startTime ?? '09:00');
  const [professionalId, setProfessionalId] = useState(editing?.professionalId ?? route.params?.professionalId ?? '');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(editing?.serviceIds ?? []);
  const [productQty, setProductQty] = useState<Record<string, number>>(() => initialProductQty(editing));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | undefined>(editing?.paymentMethod);
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: editing ? 'Editar agendamento' : 'Novo agendamento' });
  }, [editing, navigation]);

  const activeProfessionals = data.professionals.filter((p) => p.active);
  const activeServices = data.services.filter((s) => s.active);
  const activeProducts = data.products.filter((p) => p.active);

  const serviceTotal = useMemo(() => {
    return selectedServiceIds.reduce((sum, id) => {
      const s = data.services.find((svc) => svc.id === id);
      return sum + (s?.price ?? 0);
    }, 0);
  }, [selectedServiceIds, data.services]);

  const productTotal = useMemo(() => {
    return Object.entries(productQty).reduce((sum, [id, qty]) => {
      if (!qty || qty <= 0) return sum;
      const p = data.products.find((prod) => prod.id === id);
      return sum + (p?.price ?? 0) * qty;
    }, 0);
  }, [productQty, data.products]);

  const totalValue = serviceTotal + productTotal;

  const totalDuration = useMemo(() => {
    return selectedServiceIds.reduce((sum, id) => {
      const s = data.services.find((svc) => svc.id === id);
      return sum + (s?.duration ?? 0);
    }, 0);
  }, [selectedServiceIds, data.services]);

  const endTime = useMemo(() => {
    if (!startTime || totalDuration === 0) return startTime;
    return addMinutesToTime(startTime, totalDuration);
  }, [startTime, totalDuration]);

  function toggle(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter((i) => i !== id) : [...list, id]);
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!clientName.trim()) errs.clientName = 'Nome do cliente é obrigatório';
    if (!professionalId) errs.professionalId = 'Selecione um profissional';
    if (selectedServiceIds.length === 0) errs.services = 'Selecione ao menos um serviço';
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) errs.date = 'Data inválida (AAAA-MM-DD)';
    if (!startTime.match(/^\d{2}:\d{2}$/)) errs.startTime = 'Hora inválida (HH:MM)';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        date,
        startTime,
        endTime,
        professionalId,
        serviceIds: selectedServiceIds,
        productIds: Object.keys(productQty).filter((id) => (productQty[id] ?? 0) > 0),
        productQuantities: Object.fromEntries(
          Object.entries(productQty).filter(([, q]) => q > 0)
        ),
        status: editing?.status ?? 'scheduled' as const,
        totalValue,
        paymentMethod,
        notes: notes.trim(),
      };
      if (editing) await updateAppointment(editing.id, payload);
      else await addAppointment(payload);
      navigation.goBack();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o agendamento.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <FormField label="Nome do cliente" required value={clientName} onChangeText={setClientName} placeholder="Nome completo" error={errors.clientName} autoFocus />
        <FormField
          label="Telefone / WhatsApp"
          value={clientPhone}
          onChangeText={(t) => setClientPhone(maskPhoneBR(t))}
          placeholder="(11) 99999-9999"
          keyboardType="phone-pad"
          maxLength={PHONE_MASK_MAX_LENGTH}
        />

        <View style={styles.row}>
          <View style={styles.half}>
            <FormField label="Data (AAAA-MM-DD)" required value={date} onChangeText={setDate} placeholder="2024-01-15" error={errors.date} />
          </View>
          <View style={styles.half}>
            <FormField label="Horário (HH:MM)" required value={startTime} onChangeText={setStartTime} placeholder="09:00" error={errors.startTime} />
          </View>
        </View>

        {endTime && endTime !== startTime && (
          <View style={styles.durationInfo}>
            <MaterialCommunityIcons name="clock-end" size={14} color={colors.info} />
            <Text style={styles.durationText}>Término previsto: {endTime} ({totalDuration} min)</Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>Profissional <Text style={styles.required}>*</Text></Text>
        {errors.professionalId && <Text style={styles.errorText}>{errors.professionalId}</Text>}
        {activeProfessionals.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum profissional ativo cadastrado</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {activeProfessionals.map((p) => (
              <PressableScale
                key={p.id}
                haptic="light"
                scale={0.94}
                onPress={() => setProfessionalId(p.id)}
                style={[styles.chip, professionalId === p.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, professionalId === p.id && styles.chipTextActive]}>{p.name.split(' ')[0]}</Text>
              </PressableScale>
            ))}
          </ScrollView>
        )}

        <Text style={styles.sectionLabel}>Serviços <Text style={styles.required}>*</Text></Text>
        {errors.services && <Text style={styles.errorText}>{errors.services}</Text>}
        {activeServices.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum serviço ativo cadastrado</Text>
        ) : (
          activeServices.map((s) => {
            const selected = selectedServiceIds.includes(s.id);
            return (
              <PressableScale
                key={s.id}
                haptic="light"
                onPress={() => toggle(selectedServiceIds, setSelectedServiceIds, s.id)}
                style={[styles.checkRow, selected && styles.checkRowActive]}
              >
                <View style={[styles.checkbox, selected && styles.checkboxActive]}>
                  {selected && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
                </View>
                <View style={styles.checkInfo}>
                  <Text style={styles.checkName}>{s.name}</Text>
                  <Text style={styles.checkMeta}>{s.duration} min</Text>
                </View>
                <Text style={styles.checkPrice}>{formatCurrency(s.price)}</Text>
              </PressableScale>
            );
          })
        )}

        {activeProducts.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Produtos (opcional)</Text>
            {activeProducts.map((p) => {
              const qty = productQty[p.id] ?? 0;
              const selected = qty > 0;
              const lineTotal = selected ? p.price * qty : p.price;
              const maxQ = maxQtyForProduct(p);
              return (
                <View
                  key={p.id}
                  style={[styles.checkRow, selected && styles.checkRowActiveProduct]}
                >
                  <PressableScale
                    haptic="light"
                    onPress={() => {
                      setProductQty((prev) => {
                        const cur = prev[p.id] ?? 0;
                        if (cur > 0) {
                          const { [p.id]: _, ...rest } = prev;
                          return rest;
                        }
                        return { ...prev, [p.id]: 1 };
                      });
                    }}
                  >
                    <View style={[styles.checkbox, styles.checkboxProduct, selected && styles.checkboxProductActive]}>
                      {selected && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
                    </View>
                  </PressableScale>
                  <PressableScale
                    haptic="light"
                    style={styles.checkInfo}
                    onPress={() => {
                      setProductQty((prev) => {
                        const cur = prev[p.id] ?? 0;
                        if (cur > 0) {
                          const { [p.id]: _, ...rest } = prev;
                          return rest;
                        }
                        return { ...prev, [p.id]: 1 };
                      });
                    }}
                  >
                    <Text style={styles.checkName}>{p.name}</Text>
                    <Text style={styles.checkMeta}>
                      Estoque: {p.stock}
                      {selected && p.stock > 0 ? ` · até ${maxQ} un.` : ''}
                    </Text>
                  </PressableScale>
                  {selected ? (
                    <View style={styles.qtyStepper}>
                      <PressableScale
                        haptic="light"
                        onPress={() =>
                          setProductQty((prev) => {
                            const cur = prev[p.id] ?? 1;
                            if (cur <= 1) {
                              const { [p.id]: _, ...rest } = prev;
                              return rest;
                            }
                            return { ...prev, [p.id]: cur - 1 };
                          })
                        }
                        style={styles.qtyStepBtn}
                      >
                        <MaterialCommunityIcons name="minus" size={18} color={colors.textPrimary} />
                      </PressableScale>
                      <Text style={styles.qtyStepValue}>{qty}</Text>
                      <PressableScale
                        haptic="light"
                        onPress={() =>
                          setProductQty((prev) => {
                            const cur = prev[p.id] ?? 1;
                            return { ...prev, [p.id]: Math.min(maxQ, cur + 1) };
                          })
                        }
                        style={styles.qtyStepBtn}
                      >
                        <MaterialCommunityIcons name="plus" size={18} color={colors.textPrimary} />
                      </PressableScale>
                    </View>
                  ) : null}
                  <Text style={styles.checkPrice}>
                    {formatCurrency(selected ? lineTotal : p.price)}
                  </Text>
                </View>
              );
            })}
          </>
        )}

        <Text style={styles.sectionLabel}>Forma de pagamento</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {PAYMENT_METHODS.map((pm) => (
            <PressableScale
              key={pm.value}
              haptic="light"
              scale={0.94}
              onPress={() => setPaymentMethod(paymentMethod === pm.value ? undefined : pm.value)}
              style={[styles.chip, paymentMethod === pm.value && styles.chipActive]}
            >
              <Text style={[styles.chipText, paymentMethod === pm.value && styles.chipTextActive]}>{pm.label}</Text>
            </PressableScale>
          ))}
        </ScrollView>

        <FormField label="Observações" value={notes} onChangeText={setNotes} placeholder="Anotações sobre o atendimento..." multiline numberOfLines={3} style={{ height: 80, textAlignVertical: 'top' }} />
      </ScrollView>

      <LinearGradient colors={colors.gradientGold} style={styles.bottomBar}>
        <View style={styles.totalInline}>
          <Text style={styles.totalLabel}>Total</Text>
          {(serviceTotal > 0 || productTotal > 0) && (
            <Text style={styles.totalBreakdown} numberOfLines={2}>
              Serviços {formatCurrency(serviceTotal)}
              {productTotal > 0 ? ` · Produtos ${formatCurrency(productTotal)}` : ''}
            </Text>
          )}
          <Text style={styles.totalValue}>{formatCurrency(totalValue)}</Text>
        </View>
        <PressableScale onPress={handleSave} haptic="medium" style={[styles.saveBtn, saving && { opacity: 0.6 }]}>
          <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
        </PressableScale>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 24 },
  row: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
  durationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.infoSoft,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: spacing.lg,
    marginTop: -spacing.sm,
  },
  durationText: { ...typography.smallBold, color: colors.info },
  sectionLabel: { ...typography.overline, color: colors.textMuted, marginBottom: 10, marginTop: 4 },
  required: { color: colors.danger },
  errorText: { ...typography.small, color: colors.danger, marginBottom: 8 },
  emptyText: { ...typography.small, color: colors.textMuted, marginBottom: 12 },
  chipRow: { gap: 8, paddingRight: 8, paddingVertical: 4, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { ...typography.smallBold, color: colors.textSecondary },
  chipTextActive: { color: '#fff' },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkRowActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  checkRowActiveProduct: { borderColor: '#8B5CF6', backgroundColor: '#F5F3FF' },
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
  checkboxProduct: { borderColor: colors.borderStrong, borderRadius: 11 },
  checkboxProductActive: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  checkInfo: { flex: 1 },
  checkName: { ...typography.bodyBold, color: colors.textPrimary, fontSize: 14 },
  checkMeta: { ...typography.small, color: colors.textMuted, marginTop: 1 },
  checkPrice: { ...typography.bodyBold, color: colors.success },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  totalInline: { flex: 1 },
  totalLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '700', letterSpacing: 1.2 },
  totalBreakdown: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.78)',
    fontWeight: '600',
    marginTop: 2,
  },
  totalValue: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  qtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderRadius: radius.pill,
    paddingHorizontal: 4,
    marginRight: 4,
  },
  qtyStepBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyStepValue: {
    minWidth: 22,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  saveBtn: {
    backgroundColor: colors.ink,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: 13,
    borderRadius: radius.md,
  },
  saveBtnText: { ...typography.bodyBold, color: '#fff' },
});

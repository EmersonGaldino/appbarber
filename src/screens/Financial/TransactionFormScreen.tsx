import React, { useState, useLayoutEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppContext } from '../../context/AppContext';
import { FinancialStackParamList, PaymentMethod, TransactionCategory } from '../../types';
import { FormField } from '../../components/FormField';
import { PressableScale } from '../../components/PressableScale';
import { PAYMENT_METHODS, TRANSACTION_CATEGORIES } from '../../utils/helpers';
import { colors, radius, shadow, spacing, typography } from '../../theme';

type Nav = StackNavigationProp<FinancialStackParamList, 'TransactionForm'>;
type Route = RouteProp<FinancialStackParamList, 'TransactionForm'>;

export function TransactionFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { addTransaction, updateTransaction } = useAppContext();
  const editing = route.params?.transaction;

  const [type, setType] = useState<'income' | 'expense'>(editing?.type ?? 'income');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [date, setDate] = useState(editing?.date ?? new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<TransactionCategory>(editing?.category ?? 'service');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | undefined>(editing?.paymentMethod);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: editing ? 'Editar transação' : 'Nova transação' });
  }, [editing, navigation]);

  const availableCategories = TRANSACTION_CATEGORIES.filter((c) => c.type === type || c.type === 'both');

  function validate() {
    const errs: Record<string, string> = {};
    if (!description.trim()) errs.description = 'Descrição é obrigatória';
    const a = parseFloat(amount.replace(',', '.'));
    if (isNaN(a) || a <= 0) errs.amount = 'Informe um valor válido';
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) errs.date = 'Data inválida';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        type,
        description: description.trim(),
        amount: parseFloat(amount.replace(',', '.')),
        date,
        category,
        paymentMethod,
      };
      if (editing) await updateTransaction(editing.id, payload);
      else await addTransaction(payload);
      navigation.goBack();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a transação.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>Tipo</Text>
        <View style={styles.typeRow}>
          <PressableScale
            haptic="light"
            scale={0.96}
            onPress={() => setType('income')}
            style={[styles.typeBtn, type === 'income' && styles.typeBtnIncome]}
          >
            <Text style={[styles.typeBtnText, type === 'income' && { color: '#fff' }]}>＋ Receita</Text>
          </PressableScale>
          <PressableScale
            haptic="light"
            scale={0.96}
            onPress={() => setType('expense')}
            style={[styles.typeBtn, type === 'expense' && styles.typeBtnExpense]}
          >
            <Text style={[styles.typeBtnText, type === 'expense' && { color: '#fff' }]}>− Despesa</Text>
          </PressableScale>
        </View>

        <FormField label="Descrição" required value={description} onChangeText={setDescription} placeholder="Ex: Corte do João" error={errors.description} autoFocus />
        <FormField label="Valor (R$)" required value={amount} onChangeText={setAmount} placeholder="0,00" keyboardType="decimal-pad" error={errors.amount} />
        <FormField label="Data (AAAA-MM-DD)" required value={date} onChangeText={setDate} placeholder="2024-01-15" error={errors.date} />

        <Text style={styles.sectionLabel}>Categoria</Text>
        <View style={styles.chipGrid}>
          {availableCategories.map((c) => (
            <PressableScale
              key={c.value}
              haptic="light"
              scale={0.94}
              onPress={() => setCategory(c.value)}
              style={[styles.chip, category === c.value && styles.chipActive]}
            >
              <Text style={[styles.chipText, category === c.value && styles.chipTextActive]}>{c.label}</Text>
            </PressableScale>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Forma de pagamento (opcional)</Text>
        <View style={styles.chipGrid}>
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
        </View>
      </ScrollView>
      <View style={styles.bottomBar}>
        <PressableScale
          onPress={handleSave}
          haptic="medium"
          style={[
            styles.saveBtn,
            { backgroundColor: type === 'income' ? colors.success : colors.danger },
            saving && { opacity: 0.6 },
          ]}
        >
          <Text style={styles.saveBtnText}>
            {saving ? 'Salvando...' : `Salvar ${type === 'income' ? 'receita' : 'despesa'}`}
          </Text>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing['4xl'] },
  sectionLabel: { ...typography.overline, color: colors.textMuted, marginBottom: 10, marginTop: 4 },
  typeRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  typeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  typeBtnIncome: { backgroundColor: colors.success, borderColor: colors.success },
  typeBtnExpense: { backgroundColor: colors.danger, borderColor: colors.danger },
  typeBtnText: { ...typography.bodyBold, color: colors.textSecondary, fontSize: 15 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.lg },
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
  bottomBar: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveBtn: {
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    ...(shadow.md as any),
  },
  saveBtnText: { ...typography.bodyBold, color: '#fff', fontSize: 15 },
});

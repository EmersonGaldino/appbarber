import React, { useState, useLayoutEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Switch } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppContext } from '../../context/AppContext';
import { ServicesStackParamList } from '../../types';
import { FormField } from '../../components/FormField';
import { PressableScale } from '../../components/PressableScale';
import { colors, radius, shadow, spacing, typography } from '../../theme';

type Nav = StackNavigationProp<ServicesStackParamList, 'ServiceForm'>;
type Route = RouteProp<ServicesStackParamList, 'ServiceForm'>;

export function ServiceFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { addService, updateService } = useAppContext();
  const editing = route.params?.service;

  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [price, setPrice] = useState(editing ? String(editing.price) : '');
  const [duration, setDuration] = useState(editing ? String(editing.duration) : '30');
  const [active, setActive] = useState(editing?.active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: editing ? 'Editar serviço' : 'Novo serviço' });
  }, [editing, navigation]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Nome é obrigatório';
    const p = parseFloat(price.replace(',', '.'));
    if (isNaN(p) || p <= 0) errs.price = 'Informe um preço válido';
    const d = parseInt(duration);
    if (isNaN(d) || d <= 0) errs.duration = 'Informe uma duração válida em minutos';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price.replace(',', '.')),
        duration: parseInt(duration),
        active,
      };
      if (editing) await updateService(editing.id, payload);
      else await addService(payload);
      navigation.goBack();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o serviço.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <FormField label="Nome do serviço" required value={name} onChangeText={setName} placeholder="Ex: Corte masculino" error={errors.name} autoFocus />
        <FormField
          label="Descrição"
          value={description}
          onChangeText={setDescription}
          placeholder="Descrição opcional"
          multiline
          numberOfLines={3}
          style={{ height: 80, textAlignVertical: 'top' }}
        />
        <View style={styles.row}>
          <View style={styles.half}>
            <FormField label="Preço (R$)" required value={price} onChangeText={setPrice} placeholder="0,00" keyboardType="decimal-pad" error={errors.price} />
          </View>
          <View style={styles.half}>
            <FormField label="Duração (min)" required value={duration} onChangeText={setDuration} placeholder="30" keyboardType="number-pad" error={errors.duration} />
          </View>
        </View>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Serviço ativo</Text>
            <Text style={styles.switchHint}>Aparece nos agendamentos quando ativado</Text>
          </View>
          <Switch
            value={active}
            onValueChange={setActive}
            trackColor={{ false: colors.borderStrong, true: colors.primaryLight }}
            thumbColor={active ? colors.primary : '#fff'}
            ios_backgroundColor={colors.borderStrong}
          />
        </View>
      </ScrollView>
      <View style={styles.bottomBar}>
        <PressableScale onPress={handleSave} haptic="medium" style={[styles.saveBtn, saving && { opacity: 0.6 }]}>
          <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar serviço'}</Text>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing['4xl'] },
  row: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: 4,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchLabel: { ...typography.bodyBold, color: colors.textPrimary },
  switchHint: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  bottomBar: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveBtn: {
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    ...(shadow.md as any),
  },
  saveBtnText: { ...typography.bodyBold, color: '#fff', fontSize: 15 },
});

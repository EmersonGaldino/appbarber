import React, { useState, useLayoutEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Switch } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppContext } from '../../context/AppContext';
import { ProductsStackParamList } from '../../types';
import { FormField } from '../../components/FormField';
import { PressableScale } from '../../components/PressableScale';
import { colors, radius, shadow, spacing, typography } from '../../theme';

type Nav = StackNavigationProp<ProductsStackParamList, 'ProductForm'>;
type Route = RouteProp<ProductsStackParamList, 'ProductForm'>;

export function ProductFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { addProduct, updateProduct } = useAppContext();
  const editing = route.params?.product;

  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [price, setPrice] = useState(editing ? String(editing.price) : '');
  const [costPrice, setCostPrice] = useState(editing ? String(editing.costPrice) : '');
  const [stock, setStock] = useState(editing ? String(editing.stock) : '0');
  const [category, setCategory] = useState(editing?.category ?? '');
  const [active, setActive] = useState(editing?.active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: editing ? 'Editar produto' : 'Novo produto' });
  }, [editing, navigation]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Nome é obrigatório';
    const p = parseFloat(price.replace(',', '.'));
    if (isNaN(p) || p < 0) errs.price = 'Informe um preço válido';
    const s = parseInt(stock);
    if (isNaN(s) || s < 0) errs.stock = 'Informe um estoque válido';
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
        costPrice: parseFloat(costPrice.replace(',', '.')) || 0,
        stock: parseInt(stock),
        category: category.trim(),
        active,
      };
      if (editing) await updateProduct(editing.id, payload);
      else await addProduct(payload);
      navigation.goBack();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o produto.');
    } finally {
      setSaving(false);
    }
  }

  const margin = price && costPrice
    ? ((parseFloat(price.replace(',', '.')) - parseFloat(costPrice.replace(',', '.'))) /
        parseFloat(price.replace(',', '.')) * 100)
    : null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <FormField label="Nome do produto" required value={name} onChangeText={setName} placeholder="Ex: Pomada modeladora" error={errors.name} autoFocus />
        <FormField label="Descrição" value={description} onChangeText={setDescription} placeholder="Descrição opcional" multiline numberOfLines={3} style={{ height: 80, textAlignVertical: 'top' }} />
        <FormField label="Categoria" value={category} onChangeText={setCategory} placeholder="Ex: Pomada, Shampoo, Perfume..." />

        <View style={styles.row}>
          <View style={styles.half}>
            <FormField label="Preço de venda (R$)" required value={price} onChangeText={setPrice} placeholder="0,00" keyboardType="decimal-pad" error={errors.price} />
          </View>
          <View style={styles.half}>
            <FormField label="Preço de custo (R$)" value={costPrice} onChangeText={setCostPrice} placeholder="0,00" keyboardType="decimal-pad" />
          </View>
        </View>

        {margin !== null && !isNaN(margin) && (
          <View style={[styles.marginInfo, margin < 20 && { backgroundColor: colors.warningSoft }]}>
            <Text style={[styles.marginText, margin < 20 && { color: colors.warning }]}>
              Margem de lucro: {margin.toFixed(1)}%
            </Text>
          </View>
        )}

        <FormField label="Estoque (unidades)" required value={stock} onChangeText={setStock} placeholder="0" keyboardType="number-pad" error={errors.stock} />

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Produto ativo</Text>
            <Text style={styles.switchHint}>Aparece para venda nos atendimentos</Text>
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
          <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar produto'}</Text>
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
  marginInfo: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: spacing.lg,
    marginTop: -spacing.sm,
  },
  marginText: { ...typography.smallBold, color: colors.success },
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

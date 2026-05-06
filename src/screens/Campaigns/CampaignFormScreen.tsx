import React, { useLayoutEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useAppContext } from '../../context/AppContext';
import { Campaign, CampaignsStackParamList, CampaignType } from '../../types';
import { FormField } from '../../components/FormField';
import { PressableScale } from '../../components/PressableScale';
import { colors, radius, shadow, spacing, typography } from '../../theme';
import {
  collectClientPushTokens,
  sendCampaignToTokens,
} from '../../services/pushNotifications';

type Nav = StackNavigationProp<CampaignsStackParamList, 'CampaignForm'>;
type Route = RouteProp<CampaignsStackParamList, 'CampaignForm'>;

const TYPES: Array<{
  id: CampaignType;
  label: string;
  icon: string;
  hint: string;
  color: string;
  bg: string;
}> = [
  { id: 'promo', label: 'Promoção', icon: 'tag-heart', color: '#E11D48', bg: '#FFE4E6', hint: 'Descontos e ofertas com prazo.' },
  { id: 'price_update', label: 'Preço', icon: 'cash-multiple', color: '#16A34A', bg: '#DCFCE7', hint: 'Mudança de tabela de valores.' },
  { id: 'news', label: 'Aviso', icon: 'bullhorn', color: '#2563EB', bg: '#DBEAFE', hint: 'Mensagem geral / novidades.' },
  { id: 'schedule', label: 'Horário', icon: 'calendar-clock', color: '#F59E0B', bg: '#FEF3C7', hint: 'Recesso, feriados, expediente.' },
  { id: 'new_service', label: 'Novidade', icon: 'star-shooting', color: '#7C3AED', bg: '#EDE9FE', hint: 'Novo serviço ou produto.' },
];

const MAX_TITLE_LEN = 80;
const MAX_MESSAGE_LEN = 240;

export function CampaignFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { data, addCampaign, updateCampaign } = useAppContext();
  const editing = route.params?.campaign;

  const [type, setType] = useState<CampaignType>(editing?.type ?? 'promo');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [message, setMessage] = useState(editing?.message ?? '');
  const [validUntil, setValidUntil] = useState(editing?.validUntil ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<null | 'draft' | 'send'>(null);

  const reachableTokens = useMemo(() => collectClientPushTokens(data.users), [data.users]);
  const reachable = reachableTokens.length;
  const alreadySent = editing?.status === 'sent';

  useLayoutEffect(() => {
    navigation.setOptions({
      title: editing ? (alreadySent ? 'Detalhes da campanha' : 'Editar campanha') : 'Nova campanha',
    });
  }, [editing, alreadySent, navigation]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Informe um título';
    else if (title.length > MAX_TITLE_LEN) errs.title = `Máx. ${MAX_TITLE_LEN} caracteres`;
    if (!message.trim()) errs.message = 'Informe a mensagem';
    else if (message.length > MAX_MESSAGE_LEN) errs.message = `Máx. ${MAX_MESSAGE_LEN} caracteres`;
    if (type === 'promo' && validUntil) {
      const re = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      if (!re.test(validUntil)) errs.validUntil = 'Use o formato dd/mm/aaaa';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function buildPayload(): Omit<Campaign, 'id' | 'createdAt'> {
    let validIso: string | undefined;
    if (type === 'promo' && validUntil) {
      const m = validUntil.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (m) {
        const [, dd, mm, yyyy] = m;
        validIso = `${yyyy}-${mm}-${dd}`;
      }
    }
    return {
      type,
      title: title.trim(),
      message: message.trim(),
      validUntil: validIso,
      status: editing?.status ?? 'draft',
      sentAt: editing?.sentAt,
      recipientsCount: editing?.recipientsCount,
      deliveredCount: editing?.deliveredCount,
      errorMessage: editing?.errorMessage,
    };
  }

  async function handleSaveDraft() {
    if (!validate() || busy) return;
    setBusy('draft');
    try {
      const payload = buildPayload();
      if (editing) await updateCampaign(editing.id, payload);
      else await addCampaign(payload);
      navigation.goBack();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o rascunho.');
    } finally {
      setBusy(null);
    }
  }

  async function handleSend() {
    if (!validate() || busy) return;
    if (reachable === 0) {
      Alert.alert(
        'Sem destinatários',
        'Nenhum cliente possui token de push registrado neste banco. Peça para que ao menos um cliente abra o app e aceite notificações.'
      );
      return;
    }
    Alert.alert(
      'Enviar campanha',
      `A notificação será enviada para ${reachable} cliente${reachable === 1 ? '' : 's'}. Confirmar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          style: 'default',
          onPress: async () => {
            setBusy('send');
            try {
              const result = await sendCampaignToTokens(
                { type, title: title.trim(), message: message.trim() },
                reachableTokens
              );
              const status = result.delivered > 0 ? 'sent' : 'failed';
              const payload: Omit<Campaign, 'id' | 'createdAt'> = {
                ...buildPayload(),
                status,
                sentAt: new Date().toISOString(),
                recipientsCount: result.recipients,
                deliveredCount: result.delivered,
                errorMessage: result.errors.slice(0, 3).join(' | ') || undefined,
              };
              if (editing) await updateCampaign(editing.id, payload);
              else await addCampaign(payload);

              if (status === 'sent') {
                Alert.alert(
                  'Enviada',
                  `${result.delivered} de ${result.recipients} notificações entregues à Expo.`
                );
              } else {
                Alert.alert(
                  'Falha no envio',
                  result.errors[0] ?? 'Tente novamente em alguns instantes.'
                );
              }
              navigation.goBack();
            } catch (e: any) {
              Alert.alert('Erro', e?.message ?? 'Não foi possível enviar.');
            } finally {
              setBusy(null);
            }
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Reach card */}
        <View style={styles.reachCard}>
          <View style={styles.reachIcon}>
            <MaterialCommunityIcons name="account-multiple-outline" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.reachTitle}>
              {reachable} cliente{reachable === 1 ? '' : 's'} alcançável{reachable === 1 ? '' : 'is'}
            </Text>
            <Text style={styles.reachHint}>
              Apenas clientes com token de push registrado no app receberão a notificação.
            </Text>
          </View>
        </View>

        {/* Tipo */}
        <Text style={styles.sectionTitle}>Tipo</Text>
        <View style={styles.typesGrid}>
          {TYPES.map((t) => {
            const active = t.id === type;
            return (
              <PressableScale
                key={t.id}
                onPress={() => setType(t.id)}
                disabled={alreadySent}
                style={[
                  styles.typeChip,
                  { backgroundColor: active ? t.bg : colors.surface, borderColor: active ? t.color : colors.border },
                ]}
                scale={0.97}
              >
                <MaterialCommunityIcons name={t.icon as any} size={16} color={active ? t.color : colors.textSecondary} />
                <Text style={[styles.typeChipText, { color: active ? t.color : colors.textSecondary }]}>
                  {t.label}
                </Text>
              </PressableScale>
            );
          })}
        </View>
        <Text style={styles.typeHint}>{TYPES.find((t) => t.id === type)?.hint}</Text>

        {/* Conteúdo */}
        <FormField
          label="Título"
          required
          value={title}
          onChangeText={setTitle}
          placeholder="Ex: Sexta de barba 30% off"
          error={errors.title}
          maxLength={MAX_TITLE_LEN}
          editable={!alreadySent}
        />
        <Text style={styles.counter}>{title.length}/{MAX_TITLE_LEN}</Text>

        <FormField
          label="Mensagem"
          required
          value={message}
          onChangeText={setMessage}
          placeholder="Corpo da notificação que aparece no celular do cliente."
          error={errors.message}
          multiline
          numberOfLines={4}
          style={{ height: 110, textAlignVertical: 'top' }}
          maxLength={MAX_MESSAGE_LEN}
          editable={!alreadySent}
        />
        <Text style={styles.counter}>{message.length}/{MAX_MESSAGE_LEN}</Text>

        {type === 'promo' && (
          <FormField
            label="Válida até (dd/mm/aaaa)"
            value={validUntil}
            onChangeText={setValidUntil}
            placeholder="31/12/2026"
            keyboardType="number-pad"
            error={errors.validUntil}
            maxLength={10}
            editable={!alreadySent}
          />
        )}

        {/* Preview */}
        <Text style={styles.sectionTitle}>Pré-visualização</Text>
        <View style={styles.preview}>
          <View style={styles.previewIcon}>
            <MaterialCommunityIcons name="content-cut" size={16} color={colors.surface} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.previewApp}>BARBEARIA · agora</Text>
            <Text style={styles.previewTitle} numberOfLines={1}>
              {title.trim() || 'Título da notificação'}
            </Text>
            <Text style={styles.previewBody} numberOfLines={3}>
              {message.trim() || 'Aqui aparece o corpo da notificação que o cliente vai receber.'}
            </Text>
          </View>
        </View>

        {/* Status (se já enviado/falhou) */}
        {editing?.status === 'sent' && (
          <View style={[styles.statusInfo, { backgroundColor: colors.successSoft }]}>
            <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
            <Text style={[styles.statusInfoText, { color: colors.success }]}>
              Enviada {editing.deliveredCount ?? 0}/{editing.recipientsCount ?? 0}
            </Text>
          </View>
        )}
        {editing?.status === 'failed' && (
          <View style={[styles.statusInfo, { backgroundColor: colors.dangerSoft }]}>
            <MaterialCommunityIcons name="alert-circle" size={16} color={colors.danger} />
            <Text style={[styles.statusInfoText, { color: colors.danger }]}>
              {editing.errorMessage ?? 'Falha ao enviar.'}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        {!alreadySent && (
          <PressableScale
            onPress={handleSaveDraft}
            haptic="light"
            disabled={!!busy}
            style={[styles.draftBtn, busy && { opacity: 0.5 }]}
          >
            {busy === 'draft' ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text style={styles.draftBtnText}>Salvar rascunho</Text>
            )}
          </PressableScale>
        )}
        <PressableScale
          onPress={handleSend}
          haptic="medium"
          disabled={!!busy || alreadySent}
          style={[styles.sendBtn, (busy || alreadySent) && { opacity: 0.5 }]}
        >
          {busy === 'send' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="send" size={16} color="#fff" />
              <Text style={styles.sendBtnText}>
                {alreadySent ? 'Já enviada' : `Enviar (${reachable})`}
              </Text>
            </>
          )}
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing['4xl'] },
  reachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  reachIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reachTitle: { ...typography.bodyBold, color: colors.textPrimary },
  reachHint: { ...typography.small, color: colors.textSecondary, marginTop: 2 },

  sectionTitle: {
    ...typography.smallBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  typeChipText: { fontSize: 12, fontWeight: '700' },
  typeHint: {
    ...typography.small,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  counter: {
    ...typography.small,
    color: colors.textMuted,
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: spacing.sm,
  },
  preview: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...(shadow.sm as any),
  },
  previewIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewApp: {
    ...typography.small,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  previewTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginTop: 1,
  },
  previewBody: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  statusInfoText: { ...typography.smallBold },

  bottomBar: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    gap: 10,
  },
  draftBtn: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  draftBtnText: { ...typography.bodyBold, color: colors.textPrimary, fontSize: 14 },
  sendBtn: {
    flex: 1.4,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    ...(shadow.md as any),
  },
  sendBtnText: { ...typography.bodyBold, color: '#fff', fontSize: 14 },
});

import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useAppContext } from '../../context/AppContext';
import { Campaign, CampaignsStackParamList, CampaignStatus, CampaignType } from '../../types';
import { EmptyState } from '../../components/EmptyState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PressableScale } from '../../components/PressableScale';
import { AnimatedFAB } from '../../components/AnimatedFAB';
import { colors, radius, shadow, spacing, typography } from '../../theme';
import { collectClientPushTokens } from '../../services/pushNotifications';

type Nav = StackNavigationProp<CampaignsStackParamList, 'CampaignsList'>;

const TYPE_META: Record<CampaignType, { label: string; icon: string; color: string; bg: string }> = {
  promo: { label: 'Promoção', icon: 'tag-heart', color: '#E11D48', bg: '#FFE4E6' },
  price_update: { label: 'Preço', icon: 'cash-multiple', color: '#16A34A', bg: '#DCFCE7' },
  news: { label: 'Aviso', icon: 'bullhorn', color: '#2563EB', bg: '#DBEAFE' },
  schedule: { label: 'Horário', icon: 'calendar-clock', color: '#F59E0B', bg: '#FEF3C7' },
  new_service: { label: 'Novidade', icon: 'star-shooting', color: '#7C3AED', bg: '#EDE9FE' },
};

const STATUS_META: Record<CampaignStatus, { label: string; bg: string; color: string }> = {
  draft: { label: 'Rascunho', bg: colors.border, color: colors.textSecondary },
  sent: { label: 'Enviada', bg: colors.successSoft, color: colors.success },
  failed: { label: 'Falhou', bg: colors.dangerSoft, color: colors.danger },
};

function relativeTime(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min atrás`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d atrás`;
  return date.toLocaleDateString('pt-BR');
}

export function CampaignsListScreen() {
  const { data, deleteCampaign } = useAppContext();
  const navigation = useNavigation<Nav>();
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);

  const items = useMemo(() => {
    return [...(data.campaigns ?? [])].sort((a, b) => {
      const aTime = a.sentAt ?? a.createdAt;
      const bTime = b.sentAt ?? b.createdAt;
      return bTime.localeCompare(aTime);
    });
  }, [data.campaigns]);

  const reachable = useMemo(() => collectClientPushTokens(data.users).length, [data.users]);

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={items.length === 0 ? styles.empty : styles.list}
        ListHeaderComponent={
          items.length > 0 ? (
            <View style={styles.summary}>
              <View style={styles.summaryIcon}>
                <MaterialCommunityIcons name="account-multiple" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryTitle}>{reachable} cliente{reachable === 1 ? '' : 's'} alcançável{reachable === 1 ? '' : 'is'}</Text>
                <Text style={styles.summaryHint}>
                  Clientes com app aberto ao menos uma vez e que aceitaram receber notificações.
                </Text>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="bullhorn"
            title="Nenhuma campanha ainda"
            subtitle="Toque no botão dourado para criar sua primeira promoção, novidade ou aviso."
          />
        }
        renderItem={({ item, index }) => {
          const tMeta = TYPE_META[item.type];
          const sMeta = STATUS_META[item.status];
          return (
            <Animated.View entering={FadeInDown.delay(index * 50).springify().damping(16)}>
              <PressableScale
                onPress={() => navigation.navigate('CampaignForm', { campaign: item })}
                style={styles.card}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.typeChip, { backgroundColor: tMeta.bg }]}>
                    <MaterialCommunityIcons name={tMeta.icon as any} size={13} color={tMeta.color} />
                    <Text style={[styles.typeText, { color: tMeta.color }]}>{tMeta.label}</Text>
                  </View>
                  <View style={[styles.statusChip, { backgroundColor: sMeta.bg }]}>
                    <Text style={[styles.statusText, { color: sMeta.color }]}>{sMeta.label}</Text>
                  </View>
                </View>

                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.message} numberOfLines={2}>{item.message}</Text>

                <View style={styles.footer}>
                  <View style={styles.footerItem}>
                    <MaterialCommunityIcons name="clock-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.footerText}>
                      {item.status === 'sent' && item.sentAt
                        ? `Enviada ${relativeTime(item.sentAt)}`
                        : `Criada ${relativeTime(item.createdAt)}`}
                    </Text>
                  </View>
                  {item.status === 'sent' && (
                    <>
                      <View style={styles.footerDot} />
                      <View style={styles.footerItem}>
                        <MaterialCommunityIcons name="send-check" size={12} color={colors.textMuted} />
                        <Text style={styles.footerText}>
                          {item.deliveredCount ?? 0}/{item.recipientsCount ?? 0}
                        </Text>
                      </View>
                    </>
                  )}
                  <View style={{ flex: 1 }} />
                  <PressableScale onPress={() => setDeleteTarget(item)} haptic="light" style={styles.trashBtn}>
                    <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.danger} />
                  </PressableScale>
                </View>
              </PressableScale>
            </Animated.View>
          );
        }}
      />

      <AnimatedFAB onPress={() => navigation.navigate('CampaignForm', {})} />

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Excluir campanha"
        message={`Deseja remover "${deleteTarget?.title}"? Esta ação não pode ser desfeita.`}
        onConfirm={async () => {
          if (deleteTarget) await deleteCampaign(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
        confirmLabel="Excluir"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: 110 },
  empty: { flex: 1 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: { ...typography.bodyBold, color: colors.textPrimary },
  summaryHint: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 8,
    ...(shadow.sm as any),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  typeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  title: { ...typography.h3, color: colors.textPrimary },
  message: { ...typography.body, color: colors.textSecondary },
  footer: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { ...typography.small, color: colors.textMuted },
  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.borderStrong,
  },
  trashBtn: {
    padding: 6,
    borderRadius: 8,
  },
});

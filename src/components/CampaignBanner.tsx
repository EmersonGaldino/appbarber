import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Campaign, CampaignType } from '../types';
import { colors, radius, shadow, spacing, typography } from '../theme';
import { PressableScale } from './PressableScale';

const SCREEN_W = Dimensions.get('window').width;
const CARD_W = SCREEN_W - spacing.lg * 2;

const TYPE_META: Record<CampaignType, { icon: string; color: string; bg: string; label: string }> = {
  promo: { icon: 'tag-heart', color: '#E11D48', bg: '#FFE4E6', label: 'Promoção' },
  price_update: { icon: 'cash-multiple', color: '#16A34A', bg: '#DCFCE7', label: 'Preços' },
  news: { icon: 'bullhorn', color: '#2563EB', bg: '#DBEAFE', label: 'Aviso' },
  schedule: { icon: 'calendar-clock', color: '#F59E0B', bg: '#FEF3C7', label: 'Horário' },
  new_service: { icon: 'star-shooting', color: '#7C3AED', bg: '#EDE9FE', label: 'Novidade' },
};

const STORAGE_PREFIX = '@appBarber:dismissedCampaigns:';

function isStillValid(c: Campaign): boolean {
  if (c.status !== 'sent') return false;
  if (c.type !== 'promo') return true;
  if (!c.validUntil) return true;
  const limit = new Date(`${c.validUntil}T23:59:59`);
  return Date.now() <= limit.getTime();
}

interface Props {
  campaigns: Campaign[];
  userId: string;
}

export function CampaignBanner({ campaigns, userId }: Props) {
  const [dismissed, setDismissed] = useState<Set<string> | null>(null);
  const storageKey = `${STORAGE_PREFIX}${userId}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        const arr = raw ? (JSON.parse(raw) as string[]) : [];
        if (!cancelled) setDismissed(new Set(arr));
      } catch {
        if (!cancelled) setDismissed(new Set());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  const visible = useMemo(() => {
    if (!dismissed) return [];
    return campaigns
      .filter(isStillValid)
      .filter((c) => !dismissed.has(c.id))
      .sort((a, b) => (b.sentAt ?? b.createdAt).localeCompare(a.sentAt ?? a.createdAt))
      .slice(0, 5);
  }, [campaigns, dismissed]);

  async function dismiss(id: string) {
    if (!dismissed) return;
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify([...next]));
    } catch {
      // ignore
    }
  }

  if (!dismissed || visible.length === 0) return null;

  return (
    <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(180)}>
      <FlatList
        data={visible}
        keyExtractor={(c) => c.id}
        horizontal
        pagingEnabled
        snapToInterval={CARD_W + spacing.md}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
        renderItem={({ item }) => <CampaignCard campaign={item} onDismiss={() => dismiss(item.id)} />}
      />
    </Animated.View>
  );
}

function CampaignCard({ campaign, onDismiss }: { campaign: Campaign; onDismiss: () => void }) {
  const meta = TYPE_META[campaign.type];
  const validLabel = (() => {
    if (campaign.type !== 'promo' || !campaign.validUntil) return null;
    const [y, m, d] = campaign.validUntil.split('-');
    return `Válida até ${d}/${m}/${y}`;
  })();

  return (
    <View style={[styles.card, { width: CARD_W }]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
          <MaterialCommunityIcons name={meta.icon as any} size={18} color={meta.color} />
        </View>
        <View style={[styles.typeChip, { backgroundColor: meta.bg }]}>
          <Text style={[styles.typeChipText, { color: meta.color }]}>{meta.label}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <PressableScale haptic="light" onPress={onDismiss} style={styles.closeBtn} scale={0.85}>
          <MaterialCommunityIcons name="close" size={14} color={colors.textMuted} />
        </PressableScale>
      </View>

      <Text style={styles.title} numberOfLines={2}>{campaign.title}</Text>
      <Text style={styles.message} numberOfLines={3}>{campaign.message}</Text>

      {validLabel && (
        <View style={styles.validBox}>
          <MaterialCommunityIcons name="clock-outline" size={12} color={meta.color} />
          <Text style={[styles.validText, { color: meta.color }]}>{validLabel}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    ...(shadow.sm as any),
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  typeChipText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  closeBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.bg,
  },
  title: { ...typography.h3, color: colors.textPrimary },
  message: { ...typography.body, color: colors.textSecondary, lineHeight: 20 },
  validBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  validText: { fontSize: 12, fontWeight: '700' },
});

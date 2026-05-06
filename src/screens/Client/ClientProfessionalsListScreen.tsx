import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppContext } from '../../context/AppContext';
import { colors, radius, shadow, spacing, typography } from '../../theme';
import { PressableScale } from '../../components/PressableScale';
import { FadeInView } from '../../components/FadeInView';
import { EmptyState } from '../../components/EmptyState';
import type { ClientBookStackParamList, Professional } from '../../types';

type Nav = StackNavigationProp<ClientBookStackParamList, 'ClientProfessionalsList'>;

export function ClientProfessionalsListScreen() {
  const { data } = useAppContext();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const list = data.professionals.filter((p) => p.active);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.specialties.some((s) => s.toLowerCase().includes(q))
    );
  }, [data.professionals, search]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.gradientHero}
        style={[styles.hero, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.heroDecor} />
        <Text style={styles.heroTitle}>Escolha seu profissional</Text>
        <Text style={styles.heroSubtitle}>
          Selecione abaixo quem vai te atender e siga para reservar seu horário.
        </Text>

        <View style={styles.searchWrap}>
          <MaterialCommunityIcons name="magnify" size={18} color="rgba(255,255,255,0.6)" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nome ou especialidade"
            placeholderTextColor="rgba(255,255,255,0.45)"
            style={styles.searchInput}
          />
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon="account-search-outline"
            title="Nenhum profissional"
            subtitle="Tente outra busca ou volte mais tarde."
          />
        ) : (
          filtered.map((p, i) => (
            <FadeInView key={p.id} delay={i * 60}>
              <ProfessionalCard
                professional={p}
                onPress={() =>
                  navigation.navigate('ClientBookingForm', { professionalId: p.id })
                }
              />
            </FadeInView>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function ProfessionalCard({
  professional,
  onPress,
}: {
  professional: Professional;
  onPress: () => void;
}) {
  const initials = professional.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

  return (
    <PressableScale onPress={onPress} style={styles.card} haptic="light">
      <LinearGradient
        colors={colors.gradientGold}
        style={styles.avatar}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.avatarText}>{initials}</Text>
      </LinearGradient>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>
          {professional.name}
        </Text>
        {professional.specialties.length > 0 && (
          <View style={styles.tagRow}>
            {professional.specialties.slice(0, 3).map((s) => (
              <View key={s} style={styles.tag}>
                <Text style={styles.tagText}>{s}</Text>
              </View>
            ))}
            {professional.specialties.length > 3 && (
              <Text style={styles.tagMore}>+{professional.specialties.length - 3}</Text>
            )}
          </View>
        )}
      </View>
      <View style={styles.bookBtn}>
        <Text style={styles.bookBtnText}>Agendar</Text>
        <MaterialCommunityIcons name="arrow-right" size={16} color="#fff" />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  hero: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  heroDecor: {
    position: 'absolute',
    top: -90,
    right: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(212,162,76,0.1)',
  },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
    lineHeight: 19,
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 44,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },

  content: { padding: spacing.lg, paddingBottom: 100, gap: spacing.md },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    ...(shadow.sm as any),
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  cardInfo: { flex: 1 },
  cardName: { ...typography.h3, color: colors.textPrimary },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 6 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  tagText: { color: colors.primaryDark, fontSize: 10.5, fontWeight: '700' },
  tagMore: { color: colors.textMuted, fontSize: 10.5, fontWeight: '700' },

  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
  },
  bookBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});

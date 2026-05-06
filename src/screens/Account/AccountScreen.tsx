import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';
import { colors, radius, shadow, spacing, typography } from '../../theme';
import { PressableScale } from '../../components/PressableScale';
import { FadeInView } from '../../components/FadeInView';
import { decodeTokenUnsafe } from '../../utils/token';
import { maskPhoneBR } from '../../utils/helpers';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  professional: 'Profissional',
  client: 'Cliente',
};

const ROLE_ICON: Record<string, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  admin: 'shield-crown',
  professional: 'content-cut',
  client: 'account-heart',
};

export function AccountScreen() {
  const { user, role, token, logout } = useAuth();
  const { data, clearAllData } = useAppContext();
  const insets = useSafeAreaInsets();

  const tokenInfo = useMemo(() => decodeTokenUnsafe(token), [token]);

  const stats = useMemo(() => {
    if (!user) return null;
    if (user.role === 'professional' && user.professionalId) {
      const myAppts = data.appointments.filter((a) => a.professionalId === user.professionalId);
      const completed = myAppts.filter((a) => a.status === 'completed');
      const upcoming = myAppts.filter((a) => a.status === 'scheduled');
      const revenue = completed.reduce((s, a) => s + a.totalValue, 0);
      return [
        { icon: 'calendar-check', label: 'Atendimentos', value: completed.length.toString() },
        { icon: 'calendar-clock', label: 'Agendados', value: upcoming.length.toString() },
        { icon: 'cash-multiple', label: 'Faturamento', value: `R$ ${revenue.toFixed(0)}` },
      ];
    }
    if (user.role === 'client') {
      const myAppts = data.appointments.filter(
        (a) => a.clientUserId === user.id || normalize(a.clientPhone) === normalize(user.phone)
      );
      const completed = myAppts.filter((a) => a.status === 'completed');
      const totalSpent = completed.reduce((s, a) => s + a.totalValue, 0);
      return [
        { icon: 'check-decagram', label: 'Concluídos', value: completed.length.toString() },
        { icon: 'calendar-clock', label: 'Em aberto', value: myAppts.filter((a) => a.status === 'scheduled').length.toString() },
        { icon: 'cash-100', label: 'Total gasto', value: `R$ ${totalSpent.toFixed(0)}` },
      ];
    }
    if (user.role === 'admin') {
      return [
        { icon: 'account-group', label: 'Usuários', value: data.users.length.toString() },
        { icon: 'account-tie', label: 'Profissionais', value: data.professionals.filter((p) => p.active).length.toString() },
        { icon: 'calendar-month', label: 'Agendamentos', value: data.appointments.length.toString() },
      ];
    }
    return null;
  }, [user, data]);

  function handleLogout() {
    Alert.alert('Sair da conta?', 'Você precisará entrar novamente com seu nome e telefone.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          logout().catch((e) => console.error(e));
        },
      },
    ]);
  }

  function handleClearAll() {
    Alert.alert(
      'Limpar todos os dados?',
      'Isso vai apagar usuários, agenda e tudo mais deste dispositivo. Você será deslogado.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar tudo',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData();
              await logout();
            } catch (e) {
              console.error(e);
              Alert.alert('Erro', 'Não foi possível limpar os dados.');
            }
          },
        },
      ]
    );
  }

  if (!user) return null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.gradientHero}
        style={[styles.hero, { paddingTop: insets.top + 24 }]}
      >
        <View style={styles.heroDecor} />
        <FadeInView>
          <View style={styles.avatarWrap}>
            <LinearGradient colors={colors.gradientGold} style={styles.avatar}>
              <MaterialCommunityIcons
                name={ROLE_ICON[user.role] ?? 'account'}
                size={36}
                color="#fff"
              />
            </LinearGradient>
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <View style={styles.roleChip}>
            <MaterialCommunityIcons
              name={ROLE_ICON[user.role] ?? 'account'}
              size={13}
              color={colors.primary}
            />
            <Text style={styles.roleText}>{ROLE_LABEL[user.role] ?? user.role}</Text>
          </View>
          <Text style={styles.phone}>{maskPhoneBR(user.phone)}</Text>
        </FadeInView>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {stats && (
          <FadeInView delay={120}>
            <View style={styles.statsRow}>
              {stats.map((s) => (
                <View key={s.label} style={styles.statCard}>
                  <View style={styles.statIcon}>
                    <MaterialCommunityIcons name={s.icon as any} size={18} color={colors.primary} />
                  </View>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </FadeInView>
        )}

        <Text style={styles.sectionTitle}>Sessão</Text>
        <FadeInView delay={180}>
          <View style={styles.infoCard}>
            <InfoRow icon="identifier" label="ID do usuário" value={user.id.slice(0, 12) + '…'} />
            <InfoRow
              icon="key-variant"
              label="Token de acesso"
              value={token ? `${token.split('.')[0]}.${token.split('.')[1].slice(0, 8)}…` : '—'}
            />
            {tokenInfo && (
              <InfoRow
                icon="clock-outline"
                label="Expira em"
                value={new Date(tokenInfo.exp).toLocaleDateString('pt-BR')}
              />
            )}
            <InfoRow icon="shield-account" label="Perfil" value={ROLE_LABEL[role ?? ''] ?? '—'} />
          </View>
        </FadeInView>

        {role === 'admin' && (
          <>
            <Text style={styles.sectionTitle}>Administração</Text>
            <FadeInView delay={240}>
              <PressableScale onPress={handleClearAll} style={styles.adminBtn} haptic="medium">
                <View style={[styles.adminBtnIcon, { backgroundColor: colors.dangerSoft }]}>
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.adminBtnTitle}>Limpar todos os dados</Text>
                  <Text style={styles.adminBtnSub}>
                    Remove usuários, agenda, serviços e tudo mais deste dispositivo.
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
              </PressableScale>
            </FadeInView>
          </>
        )}

        <FadeInView delay={300}>
          <PressableScale onPress={handleLogout} style={styles.logoutBtn} haptic="medium">
            <MaterialCommunityIcons name="logout" size={18} color={colors.danger} />
            <Text style={styles.logoutText}>Sair da conta</Text>
          </PressableScale>
        </FadeInView>

        <Text style={styles.footer}>
          Os dados ficam apenas neste dispositivo. {'\n'}Versão 1.0
        </Text>
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons name={icon} size={16} color={colors.textMuted} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function normalize(s: string) {
  return (s ?? '').replace(/\D/g, '');
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hero: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
  },
  heroDecor: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(212, 162, 76, 0.12)',
  },
  avatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  avatar: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  name: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 14,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(212,162,76,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(212,162,76,0.4)',
  },
  roleText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  phone: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },

  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: 60 },

  statsRow: { flexDirection: 'row', gap: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'flex-start',
    ...(shadow.sm as any),
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.3 },
  statLabel: { ...typography.small, color: colors.textMuted, marginTop: 2 },

  sectionTitle: {
    ...typography.overline,
    color: colors.textMuted,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },

  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...(shadow.sm as any),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: { ...typography.small, color: colors.textSecondary, fontWeight: '600' },
  infoValue: { flex: 1, textAlign: 'right', ...typography.smallBold, color: colors.textPrimary },

  adminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...(shadow.sm as any),
  },
  adminBtnIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBtnTitle: { ...typography.bodyBold, color: colors.textPrimary },
  adminBtnSub: { ...typography.small, color: colors.textMuted, marginTop: 2 },

  logoutBtn: {
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
  logoutText: { color: colors.danger, fontWeight: '800', fontSize: 14 },

  footer: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});

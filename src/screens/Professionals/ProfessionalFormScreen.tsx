import React, { useState, useLayoutEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Switch } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { ProfessionalsStackParamList, User, WorkingHours } from '../../types';
import { FormField } from '../../components/FormField';
import { PasswordField } from '../../components/PasswordField';
import { PressableScale } from '../../components/PressableScale';
import { DAYS_OF_WEEK, maskPhoneBR, PHONE_MASK_MAX_LENGTH } from '../../utils/helpers';
import { hashPassword } from '../../utils/token';
import { buildUsernameFromName } from '../../database/seed';
import { colors, radius, shadow, spacing, typography } from '../../theme';

type Nav = StackNavigationProp<ProfessionalsStackParamList, 'ProfessionalForm'>;
type Route = RouteProp<ProfessionalsStackParamList, 'ProfessionalForm'>;

const DEFAULT_WORKING_HOURS: WorkingHours = Object.fromEntries(
  DAYS_OF_WEEK.map((d) => [
    d.key,
    { start: '09:00', end: '18:00', active: !['saturday', 'sunday'].includes(d.key) },
  ])
);

export function ProfessionalFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { data, addProfessional, updateProfessional, addUser, updateUser } = useAppContext();
  const editing = route.params?.professional;

  const linkedUser: User | undefined = useMemo(
    () => (editing ? data.users.find((u) => u.professionalId === editing.id) : undefined),
    [data.users, editing]
  );

  const [name, setName] = useState(editing?.name ?? '');
  const [phone, setPhone] = useState(maskPhoneBR(editing?.phone ?? ''));
  const [email, setEmail] = useState(editing?.email ?? '');
  const [specialtiesText, setSpecialtiesText] = useState(editing?.specialties.join(', ') ?? '');
  const [active, setActive] = useState(editing?.active ?? true);
  const [workingHours, setWorkingHours] = useState<WorkingHours>(editing?.workingHours ?? DEFAULT_WORKING_HOURS);
  const [username, setUsername] = useState(linkedUser?.username ?? '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: editing ? 'Editar profissional' : 'Novo profissional' });
  }, [editing, navigation]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Nome é obrigatório';

    const usernameNorm = username.trim().toLowerCase();
    if (!usernameNorm) {
      errs.username = 'Usuário é obrigatório';
    } else if (!/^[a-z0-9._-]{3,}$/.test(usernameNorm)) {
      errs.username = 'Use 3+ caracteres: letras, números, ponto, hífen ou underline';
    } else {
      const conflict = data.users.find(
        (u) => (u.username ?? '').toLowerCase() === usernameNorm && u.id !== linkedUser?.id
      );
      if (conflict) errs.username = 'Esse usuário já está em uso';
    }

    if (!editing) {
      if (!password.trim()) errs.password = 'Senha é obrigatória';
      else if (password.trim().length < 4) errs.password = 'Senha deve ter pelo menos 4 caracteres';
    } else if (password.trim().length > 0 && password.trim().length < 4) {
      errs.password = 'Senha deve ter pelo menos 4 caracteres';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function toggleDay(day: string) {
    setWorkingHours((prev) => ({ ...prev, [day]: { ...prev[day], active: !prev[day].active } }));
  }

  function setDayTime(day: string, field: 'start' | 'end', value: string) {
    setWorkingHours((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const specialties = specialtiesText.split(',').map((s) => s.trim()).filter(Boolean);
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        specialties,
        active,
        workingHours,
      };
      const usernameNorm = username.trim().toLowerCase();

      if (editing) {
        await updateProfessional(editing.id, payload);

        if (linkedUser) {
          const userPatch: Partial<User> = {
            name: payload.name,
            phone: payload.phone,
            username: usernameNorm,
          };
          if (password.trim().length > 0) {
            userPatch.passwordHash = hashPassword(password.trim());
          }
          await updateUser(linkedUser.id, userPatch);
        } else {
          await addUser({
            name: payload.name,
            phone: payload.phone,
            role: 'professional',
            professionalId: editing.id,
            username: usernameNorm,
            passwordHash: hashPassword(password.trim() || 'barber123'),
          });
        }
      } else {
        const created = await addProfessional(payload);
        await addUser({
          name: payload.name,
          phone: payload.phone,
          role: 'professional',
          professionalId: created.id,
          username: usernameNorm,
          passwordHash: hashPassword(password.trim()),
        });
      }
      navigation.goBack();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o profissional.');
    } finally {
      setSaving(false);
    }
  }

  function suggestUsername() {
    const taken = new Set(
      data.users
        .filter((u) => u.id !== linkedUser?.id)
        .map((u) => (u.username ?? '').toLowerCase())
        .filter(Boolean)
    );
    const suggestion = buildUsernameFromName(name, taken);
    setUsername(suggestion);
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <FormField label="Nome" required value={name} onChangeText={setName} placeholder="Nome completo" error={errors.name} autoFocus />
        <FormField
          label="Telefone / WhatsApp"
          value={phone}
          onChangeText={(t) => setPhone(maskPhoneBR(t))}
          placeholder="(11) 99999-9999"
          keyboardType="phone-pad"
          maxLength={PHONE_MASK_MAX_LENGTH}
        />
        <FormField label="E-mail" value={email} onChangeText={setEmail} placeholder="email@exemplo.com" keyboardType="email-address" autoCapitalize="none" />
        <FormField
          label="Especialidades (separadas por vírgula)"
          value={specialtiesText}
          onChangeText={setSpecialtiesText}
          placeholder="Ex: Corte, Barba, Coloração"
        />

        <View style={styles.credentialsHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.credentialsTitle}>Credenciais de acesso</Text>
            <Text style={styles.credentialsHint}>
              Usados pelo profissional para entrar no app (aba "Funcionário").
            </Text>
          </View>
          {!editing && (
            <PressableScale haptic="light" onPress={suggestUsername} style={styles.suggestBtn} scale={0.95}>
              <MaterialCommunityIcons name="auto-fix" size={14} color={colors.primary} />
              <Text style={styles.suggestText}>Sugerir</Text>
            </PressableScale>
          )}
        </View>
        <FormField
          label="Usuário"
          required
          value={username}
          onChangeText={setUsername}
          placeholder="ex: joaosilva"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="none"
          autoComplete="off"
          importantForAutofill="no"
          error={errors.username}
        />
        <PasswordField
          label={editing ? 'Nova senha (opcional)' : 'Senha'}
          required={!editing}
          value={password}
          onChangeText={setPassword}
          placeholder={editing ? 'Deixe em branco para manter a atual' : 'Mínimo 4 caracteres'}
          error={errors.password}
        />

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Profissional ativo</Text>
            <Text style={styles.switchHint}>Disponível para receber agendamentos</Text>
          </View>
          <Switch
            value={active}
            onValueChange={setActive}
            trackColor={{ false: colors.borderStrong, true: colors.primaryLight }}
            thumbColor={active ? colors.primary : '#fff'}
            ios_backgroundColor={colors.borderStrong}
          />
        </View>

        <Text style={styles.sectionTitle}>Horários de trabalho</Text>
        {DAYS_OF_WEEK.map((day) => {
          const wh = workingHours[day.key] ?? { start: '09:00', end: '18:00', active: false };
          return (
            <View key={day.key} style={styles.dayRow}>
              <View style={styles.dayHeader}>
                <Switch
                  value={wh.active}
                  onValueChange={() => toggleDay(day.key)}
                  trackColor={{ false: colors.borderStrong, true: colors.primaryLight }}
                  thumbColor={wh.active ? colors.primary : '#fff'}
                  ios_backgroundColor={colors.borderStrong}
                />
                <Text style={[styles.dayLabel, !wh.active && styles.dayInactive]}>{day.label}</Text>
              </View>
              {wh.active && (
                <View style={styles.timeInputs}>
                  <FormField label="" value={wh.start} onChangeText={(v) => setDayTime(day.key, 'start', v)} placeholder="09:00" style={styles.timeInput} />
                  <MaterialCommunityIcons name="arrow-right" size={14} color={colors.textMuted} />
                  <FormField label="" value={wh.end} onChangeText={(v) => setDayTime(day.key, 'end', v)} placeholder="18:00" style={styles.timeInput} />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.bottomBar}>
        <PressableScale onPress={handleSave} haptic="medium" style={[styles.saveBtn, saving && { opacity: 0.6 }]}>
          <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar profissional'}</Text>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing['4xl'] },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchLabel: { ...typography.bodyBold, color: colors.textPrimary },
  switchHint: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  sectionTitle: { ...typography.overline, color: colors.textMuted, marginBottom: 10, marginTop: 4, paddingHorizontal: 4 },
  credentialsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  credentialsTitle: {
    ...typography.smallBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  credentialsHint: {
    ...typography.small,
    color: colors.textMuted,
    lineHeight: 16,
  },
  suggestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  suggestText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  dayRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayLabel: { ...typography.bodyBold, color: colors.textPrimary, flex: 1 },
  dayInactive: { color: colors.textMuted },
  timeInputs: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  timeInput: { width: 80, marginBottom: 0 },
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

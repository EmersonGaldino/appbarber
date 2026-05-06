import type { AppData, User } from '../types';
import { defaultData, loadData as loadFromAsyncStorage, STORAGE_KEY } from '../utils/storage';
import { loadAllFromSqlite, saveAllToSqlite } from './sqlite';
import { buildExampleData, buildUsersForExistingData, ensureStaffCredentials } from './seed';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SEEDED_FLAG_KEY = '@appBarber:seeded_v3';
const LEGACY_SEED_FLAG_KEYS = ['@appBarber:seeded_v1', '@appBarber:seeded_v2'];

function hasAnyRecords(d: AppData): boolean {
  return (
    (d.users?.length ?? 0) > 0 ||
    d.services.length > 0 ||
    d.professionals.length > 0 ||
    d.products.length > 0 ||
    d.appointments.length > 0 ||
    d.transactions.length > 0 ||
    (d.campaigns?.length ?? 0) > 0
  );
}

/**
 * Carrega todos os dados do SQLite. Se o banco estiver vazio:
 *  1) tenta migrar do AsyncStorage (versão antiga do app);
 *  2) caso ainda esteja vazio e o seed nunca tenha sido carregado neste dispositivo,
 *     popula com dados de exemplo automaticamente.
 */
export async function loadAppData(): Promise<AppData> {
  try {
    const fromDb = await loadAllFromSqlite();

    const alreadySeeded = await AsyncStorage.getItem(SEEDED_FLAG_KEY);
    const hasLegacySeedFlag = await Promise.all(
      LEGACY_SEED_FLAG_KEYS.map((k) => AsyncStorage.getItem(k))
    ).then((vals) => vals.some(Boolean));

    if (hasLegacySeedFlag && !alreadySeeded) {
      const seed = buildExampleData();
      await saveAllToSqlite(seed);
      await AsyncStorage.setItem(SEEDED_FLAG_KEY, '1');
      await Promise.all(LEGACY_SEED_FLAG_KEYS.map((k) => AsyncStorage.removeItem(k)));
      return seed;
    }

    if (hasAnyRecords(fromDb)) {
      // Migração suave: se o banco já tem dados mas ainda não criamos usuários
      // (cenário de upgrade do schema antigo), gera admin/profissionais a partir
      // dos profissionais existentes + clientes de exemplo.
      if ((fromDb.users?.length ?? 0) === 0) {
        const generatedUsers: User[] = buildUsersForExistingData(fromDb);
        const migrated: AppData = { ...fromDb, users: generatedUsers };
        await saveAllToSqlite(migrated);
        await AsyncStorage.setItem(SEEDED_FLAG_KEY, '1');
        return migrated;
      }

      // Migração de credenciais: garante que admin/profissionais antigos
      // tenham username/senha (para a feature de login com usuário+senha).
      const withCreds = ensureStaffCredentials(fromDb.users);
      const someUserChanged = withCreds.some((u, i) => u !== fromDb.users[i]);
      if (someUserChanged) {
        const migrated: AppData = { ...fromDb, users: withCreds };
        await saveAllToSqlite(migrated);
        return migrated;
      }
      return fromDb;
    }

    const legacy = await loadFromAsyncStorage();
    if (hasAnyRecords(legacy)) {
      const normalized: AppData = {
        ...legacy,
        users: legacy.users ?? [],
        campaigns: legacy.campaigns ?? [],
      };
      await saveAllToSqlite(normalized);
      await AsyncStorage.removeItem(STORAGE_KEY);
      return normalized;
    }

    if (!alreadySeeded) {
      const seed = buildExampleData();
      await saveAllToSqlite(seed);
      await AsyncStorage.setItem(SEEDED_FLAG_KEY, '1');
      return seed;
    }

    return defaultData;
  } catch (e) {
    console.error('loadAppData:', e);
    try {
      const fallback = await loadFromAsyncStorage();
      return hasAnyRecords(fallback) ? fallback : defaultData;
    } catch {
      return defaultData;
    }
  }
}

/**
 * Marca a flag de seed para evitar que o exemplo seja recarregado automaticamente
 * após o usuário limpar os dados manualmente.
 */
export async function markSeededFlag(): Promise<void> {
  await AsyncStorage.setItem(SEEDED_FLAG_KEY, '1');
  await Promise.all(LEGACY_SEED_FLAG_KEYS.map((k) => AsyncStorage.removeItem(k)));
}

/**
 * Persiste o estado completo no SQLite (transação única).
 */
export async function persistAppData(data: AppData): Promise<void> {
  await saveAllToSqlite(data);
}

export { defaultData };

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, UserRole } from '../types';
import { signToken, verifyToken, verifyPassword } from '../utils/token';
import { useAppContext } from './AppContext';
import { registerForPushNotificationsAsync } from '../services/pushNotifications';

const TOKEN_STORAGE_KEY = '@appBarber:authToken';

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated';

type AuthResult =
  | { ok: true; user: User }
  | { ok: false; reason: string };

interface AuthContextType {
  status: AuthStatus;
  token: string | null;
  user: User | null;
  role: UserRole | null;

  loginClient: (params: { name: string; phone: string }) => Promise<AuthResult>;
  loginStaff: (params: { username: string; password: string }) => Promise<AuthResult>;
  registerClient: (params: { name: string; phone: string }) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function normalizePhone(s: string): string {
  return (s ?? '').replace(/\D/g, '').trim();
}

function normalizeName(s: string): string {
  return (s ?? '').trim().toLowerCase();
}

function normalizeUsername(s: string): string {
  return (s ?? '').trim().toLowerCase();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data, loading: appLoading, addUser, updateUser } = useAppContext();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  // Restaura sessão do AsyncStorage assim que os dados do app carregarem.
  useEffect(() => {
    if (appLoading) return;
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        const payload = verifyToken(stored);
        if (payload) {
          const matched = data.users.find((u) => u.id === payload.sub);
          if (matched) {
            if (!cancelled) {
              setToken(stored);
              setUser(matched);
            }
          } else {
            await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
          }
        } else if (stored) {
          await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      } catch (e) {
        console.warn('Falha ao restaurar sessão:', e);
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Só roda quando o app terminar o load inicial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appLoading]);

  const issueSession = useCallback(async (matched: User) => {
    const newToken = signToken({
      sub: matched.id,
      name: matched.name,
      phone: matched.phone,
      role: matched.role,
      professionalId: matched.professionalId,
    });
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    setToken(newToken);
    setUser(matched);
  }, []);

  const loginClient = useCallback<AuthContextType['loginClient']>(
    async ({ name, phone }) => {
      const phoneDigits = normalizePhone(phone);
      const nameNorm = normalizeName(name);

      if (!phoneDigits) return { ok: false, reason: 'Informe seu telefone.' };
      if (!nameNorm) return { ok: false, reason: 'Informe seu nome.' };

      const matched = data.users.find(
        (u) =>
          u.role === 'client' &&
          normalizePhone(u.phone) === phoneDigits &&
          normalizeName(u.name) === nameNorm
      );

      if (!matched) {
        // Existe usuário com este telefone mas é staff? Avisa para usar a outra aba.
        const staff = data.users.find(
          (u) =>
            (u.role === 'admin' || u.role === 'professional') &&
            normalizePhone(u.phone) === phoneDigits
        );
        if (staff) {
          return {
            ok: false,
            reason: 'Esta conta é de funcionário. Entre na aba "Funcionário" com usuário e senha.',
          };
        }

        // Telefone de cliente existe mas o nome não bate? Mensagem específica.
        const sameByPhone = data.users.find(
          (u) => u.role === 'client' && normalizePhone(u.phone) === phoneDigits
        );
        if (sameByPhone) {
          return {
            ok: false,
            reason: 'Telefone encontrado, mas o nome não confere com o cadastro.',
          };
        }
        return {
          ok: false,
          reason: 'Não encontramos uma conta com esse telefone. Cadastre-se para continuar.',
        };
      }

      await issueSession(matched);
      return { ok: true, user: matched };
    },
    [data.users, issueSession]
  );

  const loginStaff = useCallback<AuthContextType['loginStaff']>(
    async ({ username, password }) => {
      const usernameNorm = normalizeUsername(username);
      const passwordTrim = (password ?? '').trim();

      if (!usernameNorm) return { ok: false, reason: 'Informe seu usuário.' };
      if (!passwordTrim) return { ok: false, reason: 'Informe sua senha.' };

      const matched = data.users.find(
        (u) =>
          (u.role === 'admin' || u.role === 'professional') &&
          (u.username ?? '').toLowerCase() === usernameNorm
      );

      if (!matched) {
        return { ok: false, reason: 'Usuário ou senha inválidos.' };
      }
      if (!verifyPassword(passwordTrim, matched.passwordHash)) {
        return { ok: false, reason: 'Usuário ou senha inválidos.' };
      }

      await issueSession(matched);
      return { ok: true, user: matched };
    },
    [data.users, issueSession]
  );

  const registerClient = useCallback<AuthContextType['registerClient']>(
    async ({ name, phone }) => {
      const phoneDigits = normalizePhone(phone);
      const nameTrim = (name ?? '').trim();

      if (!nameTrim) return { ok: false, reason: 'Informe seu nome completo.' };
      if (phoneDigits.length < 10) {
        return { ok: false, reason: 'Telefone inválido. Use DDD + número.' };
      }

      const exists = data.users.some(
        (u) => u.role === 'client' && normalizePhone(u.phone) === phoneDigits
      );
      if (exists) {
        return {
          ok: false,
          reason: 'Já existe uma conta com esse telefone. Faça login.',
        };
      }

      const created = await addUser({
        name: nameTrim,
        phone: phone.trim(),
        role: 'client',
      });
      await issueSession(created);
      return { ok: true, user: created };
    },
    [data.users, addUser, issueSession]
  );

  const logout = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    } finally {
      setToken(null);
      setUser(null);
    }
  }, []);

  // Mantém o objeto `user` em sincronia caso ele seja editado em outro lugar.
  useEffect(() => {
    if (!user) return;
    const fresh = data.users.find((u) => u.id === user.id);
    if (fresh && fresh !== user) setUser(fresh);
    if (!fresh) {
      // Usuário foi removido — derruba sessão.
      logout().catch(() => {});
    }
  }, [data.users, user, logout]);

  // Após autenticar, garante que o usuário tenha um Expo Push Token salvo no perfil.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const pushToken = await registerForPushNotificationsAsync();
        if (cancelled) return;
        if (pushToken && pushToken !== user.pushToken) {
          await updateUser(user.id, { pushToken });
        }
      } catch (e) {
        console.warn('Push registration failed:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, updateUser]);

  const status: AuthStatus = useMemo(() => {
    if (appLoading || bootstrapping) return 'loading';
    return user && token ? 'authenticated' : 'unauthenticated';
  }, [appLoading, bootstrapping, user, token]);

  const value = useMemo<AuthContextType>(
    () => ({
      status,
      token,
      user,
      role: user?.role ?? null,
      loginClient,
      loginStaff,
      registerClient,
      logout,
    }),
    [status, token, user, loginClient, loginStaff, registerClient, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

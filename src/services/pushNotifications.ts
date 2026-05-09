import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

import type { Campaign, User } from '../types';

/** Expo Push exige projectId (EAS); tenta várias fontes + env público. */
function resolveExpoProjectId(): string | undefined {
  const fromEnv =
    typeof process.env.EXPO_PUBLIC_EAS_PROJECT_ID === 'string'
      ? process.env.EXPO_PUBLIC_EAS_PROJECT_ID.trim()
      : '';
  if (fromEnv) return fromEnv;

  const ex = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  const fromExtra = ex?.eas?.projectId?.trim();
  if (fromExtra) return fromExtra;

  const easCfg = (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId?.trim();
  if (easCfg) return easCfg;

  const m1 = (Constants.manifest as { extra?: { eas?: { projectId?: string } } } | null)?.extra?.eas
    ?.projectId;
  if (m1) return String(m1).trim();

  const m2 = (
    Constants.manifest2 as { extra?: { expoClient?: { extra?: { eas?: { projectId?: string } } } } }
  )?.extra?.expoClient?.extra?.eas?.projectId;
  if (m2) return String(m2).trim();

  return undefined;
}

/**
 * Configuração do handler global de notificações.
 * Faz com que notificações recebidas em foreground também apareçam como banner/som.
 */
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Cria o canal padrão no Android (necessário para notificações aparecerem).
 */
export async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Avisos da Barbearia',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D4A453',
      sound: 'default',
    });
  } catch (e) {
    console.warn('Falha ao criar canal Android:', e);
  }
}

/**
 * Pede permissão e devolve o Expo Push Token deste dispositivo.
 * Retorna `null` se rodando em simulador, web ou sem permissão.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return null;
    if (!Device.isDevice) {
      console.info('Push: precisa de aparelho físico para tokens reais.');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.info('Push: permissão negada ou não concedida.');
      return null;
    }

    await ensureAndroidChannel();

    const projectId = resolveExpoProjectId();
    if (!projectId) {
      console.warn(
        'Push: sem EAS projectId. Defina EXPO_PUBLIC_EAS_PROJECT_ID no .env (Project ID em expo.dev) ou rode `eas init` e reinicie o Metro com -c.'
      );
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data ?? null;
  } catch (e) {
    console.warn('registerForPushNotificationsAsync:', e);
    return null;
  }
}

// ===================== Envio (Expo Push API) =====================

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

/** Mensagem aceita pela Expo Push API. */
export interface ExpoPushMessage {
  to: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
}

export interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: Record<string, unknown>;
}

export interface SendCampaignResult {
  recipients: number;
  delivered: number;
  failed: number;
  errors: string[];
}

/**
 * Verifica se um token tem o formato de Expo Push Token.
 * Aceita ExponentPushToken[...] e ExpoPushToken[...].
 */
export function isExpoPushToken(token: string | null | undefined): token is string {
  if (!token) return false;
  return /^Expo(nent)?PushToken\[.+\]$/.test(token);
}

/**
 * Envia uma campanha para uma lista de tokens via Expo Push API.
 * Faz batches de 100 mensagens (limite recomendado pela Expo).
 */
export async function sendCampaignToTokens(
  campaign: Pick<Campaign, 'title' | 'message' | 'type'>,
  tokens: string[]
): Promise<SendCampaignResult> {
  const validTokens = Array.from(new Set(tokens.filter(isExpoPushToken)));
  const result: SendCampaignResult = {
    recipients: validTokens.length,
    delivered: 0,
    failed: 0,
    errors: [],
  };
  if (validTokens.length === 0) return result;

  const messages: ExpoPushMessage[] = validTokens.map((to) => ({
    to,
    title: campaign.title,
    body: campaign.message,
    data: { campaignType: campaign.type, kind: 'campaign' },
    sound: 'default',
    channelId: 'default',
    priority: 'high',
  }));

  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    try {
      const res = await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });
      const json = (await res.json()) as { data?: ExpoPushTicket[]; errors?: any[] };
      if (Array.isArray(json?.data)) {
        for (const ticket of json.data) {
          if (ticket.status === 'ok') result.delivered += 1;
          else {
            result.failed += 1;
            if (ticket.message) result.errors.push(ticket.message);
          }
        }
      } else if (json?.errors?.length) {
        result.failed += batch.length;
        result.errors.push(json.errors.map((e: any) => e?.message ?? String(e)).join('; '));
      }
    } catch (e: any) {
      result.failed += batch.length;
      result.errors.push(e?.message ?? String(e));
    }
  }

  return result;
}

/**
 * Filtra usuários "alvo" de uma campanha: clientes ativos com push token válido.
 *
 * Importante: como o app é offline-first, esta função olha apenas os tokens armazenados
 * no SQLite local. Em um cenário com backend real, esta função iria buscar os tokens no
 * servidor — basta substituir esta implementação.
 */
export function collectClientPushTokens(users: User[]): string[] {
  return users
    .filter((u) => u.role === 'client' && isExpoPushToken(u.pushToken))
    .map((u) => u.pushToken as string);
}

export interface AppointmentCompletedPushPayload {
  token: string;
  clientName: string;
  professionalName?: string;
  serviceSummary?: string;
  notes?: string;
}

/**
 * Envia notificação para o cliente avisando que o atendimento foi concluído.
 * Retorna `{ ok: true }` quando a Expo Push API aceitou a entrega.
 */
export async function sendAppointmentCompletedPush(
  payload: AppointmentCompletedPushPayload
): Promise<{ ok: boolean; error?: string }> {
  if (!isExpoPushToken(payload.token)) {
    return { ok: false, error: 'Cliente sem token de push registrado.' };
  }

  const titleParts = ['Atendimento concluído'];
  if (payload.professionalName) titleParts.push(`com ${payload.professionalName}`);

  const bodyLines: string[] = [];
  if (payload.serviceSummary) bodyLines.push(payload.serviceSummary);
  if (payload.notes) bodyLines.push(`Obs.: ${payload.notes}`);
  if (bodyLines.length === 0) {
    bodyLines.push('Obrigado pela preferência! Volte sempre.');
  }

  const message: ExpoPushMessage = {
    to: payload.token,
    title: titleParts.join(' '),
    body: bodyLines.join('\n'),
    sound: 'default',
    channelId: 'default',
    priority: 'high',
    data: { kind: 'appointment_completed', clientName: payload.clientName },
  };

  try {
    const res = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([message]),
    });
    const json = (await res.json()) as { data?: ExpoPushTicket[]; errors?: any[] };
    const ticket = json?.data?.[0];
    if (ticket?.status === 'ok') return { ok: true };
    if (ticket?.message) return { ok: false, error: ticket.message };
    if (json?.errors?.length) return { ok: false, error: json.errors.map((e: any) => e?.message ?? String(e)).join('; ') };
    return { ok: false, error: 'Resposta inesperada da Expo Push API.' };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

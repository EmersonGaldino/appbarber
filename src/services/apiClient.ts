import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL?.trim();

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function extractExpoHost(): string | null {
  const hostUriCandidates = [
    (Constants.expoConfig as any)?.hostUri,
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri,
    (Constants as any)?.manifest?.debuggerHost,
  ];

  for (const hostUri of hostUriCandidates) {
    if (typeof hostUri !== 'string' || hostUri.length === 0) continue;
    const hostWithPort = hostUri.split('/')[0];
    const host = hostWithPort.split(':')[0];
    if (host) return host;
  }
  return null;
}

function buildApiBaseCandidates(): string[] {
  const candidates: string[] = [];
  const push = (url: string | null | undefined) => {
    if (!url) return;
    const normalized = normalizeBaseUrl(url);
    if (!normalized) return;
    if (!candidates.includes(normalized)) candidates.push(normalized);
  };

  push(ENV_API_URL);

  const expoHost = extractExpoHost();
  if (Device.isDevice && expoHost) {
    // Em dispositivo físico, usa o mesmo IP de LAN do Metro para alcançar a API no Mac.
    push(`http://${expoHost}:3333`);
  }

  if (Platform.OS === 'android') {
    // Emulador Android padrão do Android Studio.
    push('http://10.0.2.2:3333');
  }

  // Simulador iOS e fallback local.
  push('http://127.0.0.1:3333');
  push('http://localhost:3333');

  // Último fallback: host do Expo também no simulador.
  if (expoHost) push(`http://${expoHost}:3333`);

  return candidates;
}

export const API_BASE_CANDIDATES = buildApiBaseCandidates();

export class ApiError extends Error {
  status: number;
  responseBody: string;

  constructor(message: string, status: number, responseBody: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.responseBody = responseBody;
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let lastNetworkError: unknown = null;

  for (const baseUrl of API_BASE_CANDIDATES) {
    const url = `${baseUrl}${path}`;
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
        },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new ApiError(`Falha na API (${response.status}) em ${baseUrl}`, response.status, text);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      lastNetworkError = error;
    }
  }

  const details =
    lastNetworkError instanceof Error ? lastNetworkError.message : String(lastNetworkError);
  throw new Error(
    `Nao foi possivel conectar na API. Hosts testados: ${API_BASE_CANDIDATES.join(', ')}. Detalhe: ${details}`
  );
}

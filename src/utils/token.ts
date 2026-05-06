import type { UserRole } from '../types';

/**
 * Token "JWT-like" simples para sessão local/offline.
 *
 * Estrutura: header.payload.signature (mesmo formato visual de JWT).
 * Como o app não tem backend, a assinatura é apenas um hash determinístico
 * do payload + segredo — serve para detectar adulteração/corrupção do
 * AsyncStorage, não para segurança real (a base de dados também é local).
 *
 * O role do usuário viaja dentro do payload, então qualquer tela pode pedir
 * ao AuthContext o `role` decodificado.
 */

const SECRET = 'appbarber.secret.local.v1';
/** Validade da sessão em ms (30 dias). */
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface TokenPayload {
  sub: string; // user id
  name: string;
  phone: string;
  role: UserRole;
  professionalId?: string;
  iat: number; // ms epoch
  exp: number; // ms epoch
}

const TOKEN_HEADER = { alg: 'HS-LOCAL', typ: 'JWT' } as const;

// ---------- Base64 URL-safe (puro JS, lida com utf-8) ----------

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function utf8ToBytes(str: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 0x80) {
      out.push(c);
    } else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
      const c2 = str.charCodeAt(++i);
      const cp = 0x10000 + (((c & 0x3ff) << 10) | (c2 & 0x3ff));
      out.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f)
      );
    } else {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return out;
}

function bytesToUtf8(bytes: number[]): string {
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b1 = bytes[i++];
    if (b1 < 0x80) {
      out += String.fromCharCode(b1);
    } else if (b1 < 0xe0) {
      const b2 = bytes[i++];
      out += String.fromCharCode(((b1 & 0x1f) << 6) | (b2 & 0x3f));
    } else if (b1 < 0xf0) {
      const b2 = bytes[i++];
      const b3 = bytes[i++];
      out += String.fromCharCode(
        ((b1 & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f)
      );
    } else {
      const b2 = bytes[i++];
      const b3 = bytes[i++];
      const b4 = bytes[i++];
      const cp =
        ((b1 & 0x07) << 18) |
        ((b2 & 0x3f) << 12) |
        ((b3 & 0x3f) << 6) |
        (b4 & 0x3f);
      const cp2 = cp - 0x10000;
      out += String.fromCharCode(
        0xd800 | (cp2 >> 10),
        0xdc00 | (cp2 & 0x3ff)
      );
    }
  }
  return out;
}

function base64UrlEncodeBytes(bytes: number[]): string {
  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const b1 = bytes[i++] ?? 0;
    const b2 = i <= bytes.length ? bytes[i++] : NaN;
    const b3 = i <= bytes.length ? bytes[i++] : NaN;
    const has2 = !isNaN(b2 as number);
    const has3 = !isNaN(b3 as number);
    out += B64_CHARS[b1 >> 2];
    out += B64_CHARS[((b1 & 0x03) << 4) | ((has2 ? (b2 as number) : 0) >> 4)];
    if (has2) {
      out +=
        B64_CHARS[
          (((b2 as number) & 0x0f) << 2) | ((has3 ? (b3 as number) : 0) >> 6)
        ];
    }
    if (has3) {
      out += B64_CHARS[(b3 as number) & 0x3f];
    }
  }
  return out;
}

function base64UrlDecodeToBytes(str: string): number[] {
  const bytes: number[] = [];
  let i = 0;
  while (i < str.length) {
    const c1 = B64_CHARS.indexOf(str[i++]);
    const c2 = B64_CHARS.indexOf(str[i++]);
    const c3 = i < str.length ? B64_CHARS.indexOf(str[i++]) : -1;
    const c4 = i < str.length ? B64_CHARS.indexOf(str[i++]) : -1;
    if (c1 < 0 || c2 < 0) break;
    bytes.push((c1 << 2) | (c2 >> 4));
    if (c3 >= 0) bytes.push(((c2 & 0x0f) << 4) | (c3 >> 2));
    if (c4 >= 0) bytes.push(((c3 & 0x03) << 6) | c4);
  }
  return bytes;
}

function base64UrlEncodeStr(str: string): string {
  return base64UrlEncodeBytes(utf8ToBytes(str));
}

function base64UrlDecodeStr(str: string): string {
  return bytesToUtf8(base64UrlDecodeToBytes(str));
}

// ---------- Hash determinístico (não-cripto, suficiente p/ uso local) ----------

function localHash(s: string): string {
  // Variação estendida do "cyrb53" — 64 bits em hex.
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (
    (h2 >>> 0).toString(16).padStart(8, '0') +
    (h1 >>> 0).toString(16).padStart(8, '0')
  );
}

// ---------- API pública ----------

export function signToken(
  payload: Omit<TokenPayload, 'iat' | 'exp'>
): string {
  const now = Date.now();
  const fullPayload: TokenPayload = {
    ...payload,
    iat: now,
    exp: now + TOKEN_TTL_MS,
  };

  const header = base64UrlEncodeStr(JSON.stringify(TOKEN_HEADER));
  const body = base64UrlEncodeStr(JSON.stringify(fullPayload));
  const signature = localHash(`${header}.${body}.${SECRET}`);
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string | null | undefined): TokenPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;

  const expected = localHash(`${header}.${body}.${SECRET}`);
  if (expected !== signature) return null;

  try {
    const payload = JSON.parse(base64UrlDecodeStr(body)) as TokenPayload;
    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
    if (!payload.sub || !payload.role) return null;
    return payload;
  } catch {
    return null;
  }
}

export function decodeTokenUnsafe(token: string | null | undefined): TokenPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(base64UrlDecodeStr(parts[1])) as TokenPayload;
  } catch {
    return null;
  }
}

// ---------- Hash de senha (admin/profissional) ----------

const PASSWORD_PEPPER = 'appbarber.pwd.pepper.v1';

/**
 * Hash determinístico para senha de funcionário (admin/profissional).
 * Não é cripto-segura — o banco é local. Serve para evitar guardar a senha em texto puro.
 */
export function hashPassword(plain: string): string {
  return localHash(`${PASSWORD_PEPPER}.${plain}`);
}

export function verifyPassword(plain: string, hash: string | null | undefined): boolean {
  if (!hash) return false;
  return hashPassword(plain) === hash;
}

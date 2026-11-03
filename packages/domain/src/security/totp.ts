/**
 * TOTP (RFC 6238) — 2FA por aplicativo autenticador, usado para
 * proteger a equipe do backoffice (regra do plano: 2FA obrigatório no admin).
 *
 * Implementação pura e determinística (sem clock embutido) para
 * ser 100% testável e reutilizável nos SDKs nativos.
 */
import { createHmac, randomBytes } from 'node:crypto';
import { decodeBase32, encodeBase32 } from './base32';

const HMAC_SHA1 = 'sha1';
const DIGITS = 6;
const STEP_SECONDS = 30;

/** Gera segredo TOTP aleatório (20 bytes, ~32 chars base32 como o padrão). */
export function generateTotpSecret(byteLength = 20): string {
  return encodeBase32(randomBytes(byteLength));
}

/** Concatenação do contador em 8 bytes big-endian (RFC 4226 §5.2). */
function counterBytes(counter: number): Buffer {
  const buffer = Buffer.alloc(8);
  // Contador nunca é negativo (clamp em 0): evita BigInt fora do uint64
  // quando a janela de verificação recua antes do primeiro passo de tempo.
  buffer.writeBigUInt64BE(BigInt(Math.max(0, counter)));
  return buffer;
}

/**
 * Truncamento dinâmico (RFC 4226 §5.3): pega nibble de 4 bytes
 * sinalizado pelo último byte do HMAC.
 */
function dynamicTruncate(hmac: Buffer): number {
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const bin =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return bin;
}

/** Calcula o OTP de 6 dígitos para um segredo + timestamp (ms). */
export function computeTotp(
  secretBase32: string,
  timestampMs: number,
  stepSeconds = STEP_SECONDS,
): string {
  const counter = Math.floor(timestampMs / 1000 / stepSeconds);
  const hmac = createHmac(HMAC_SHA1, decodeBase32(secretBase32)).update(counterBytes(counter)).digest();
  const code = (dynamicTruncate(hmac) % 10 ** DIGITS).toString().padStart(DIGITS, '0');
  return code;
}

/**
 * Verifica um token considerando janela (± window passos de tempo)
 * para compensar relógios dessincronizados (recomendação RFC 6238 §5.3).
 */
export function verifyTotp(
  secretBase32: string,
  token: string,
  timestampMs: number,
  window = 1,
  stepSeconds = STEP_SECONDS,
): boolean {
  if (!/^\d{6}$/.test(token)) {
    return false;
  }
  const currentCounter = Math.floor(timestampMs / 1000 / stepSeconds);
  for (let drift = -window; drift <= window; drift++) {
    if (computeTotp(secretBase32, (currentCounter + drift) * stepSeconds * 1000, stepSeconds) === token) {
      return true;
    }
  }
  return false;
}

/**
 * URI otpauth:// compatível com Google Authenticator / Authy / Aegis.
 */
export function buildOtpauthUri(
  secretBase32: string,
  label: string,
  issuer: string,
): string {
  // Rótulo canônico "issuer:account" com o conjunto todo percent-encodado
  // (inclusive o `:`), como o Google Authenticator gera ao exportar contas.
  return (
    `otpauth://totp/${encodeURIComponent(`${issuer}:${label}`)}` +
    `?secret=${secretBase32}&issuer=${encodeURIComponent(issuer)}&digits=${DIGITS}&period=${STEP_SECONDS}&algorithm=SHA1`
  );
}

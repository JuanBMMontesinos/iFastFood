/**
 * Base32 (RFC 4648, alfabeto A–Z + 2–7) — necessário para segredos TOTP
 * (Google Authenticator usa base32 sem padding).
 */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Converte buffer para base32 canônico (sem padding). */
export function encodeBase32(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

/** Decodifica base32 (tolera espaços, lowercase e padding '='). */
export function decodeBase32(input: string): Buffer {
  const clean = input
    .toLowerCase()
    .replace(/[\s=-]/g, '')
    .split('');

  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of clean) {
    const index = ALPHABET.indexOf(char.toUpperCase());
    if (index === -1) {
      throw new RangeError(`Caractere base32 inválido: ${char}`);
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

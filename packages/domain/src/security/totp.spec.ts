import { describe, expect, it } from 'vitest';
import { decodeBase32, encodeBase32 } from './base32';
import { buildOtpauthUri, computeTotp, generateTotpSecret, verifyTotp } from './totp';

/**
 * Vetores oficiais do RFC 6238 (apêndice B) — HMAC-SHA1, secret ASCII
 * "12345678901234567890" (0x31 repetido), T0=0, step=30s, 8 dígitos.
 * Nossa implementação gera 6 dígitos → os 6 últimos do vetor de 8
 * (matematicamente: S mod 10^6 = (S mod 10^8) mod 10^6).
 */
const SECRET_B32 = encodeBase32(Buffer.from('12345678901234567890', 'ascii'));

const RFC_VECTORS: Array<[number, string]> = [
  [59, '94287082'],
  [1111111109, '07081804'],
  [1111111111, '14050471'],
  [1234567890, '89005924'],
  [2000000000, '69279037'],
  [20000000000, '65353130'],
];

describe('TOTP (RFC 6238, SHA-1, 6 dígitos)', () => {
  it('código conhecido: 287082 @ T=59s (6 dígitos do vetor RFC)', () => {
    expect(computeTotp(SECRET_B32, 59_000)).toBe('287082');
  });

  it('cada vetor do RFC 6238 casa nos últimos 6 dígitos', () => {
    for (const [t, code8] of RFC_VECTORS) {
      expect(computeTotp(SECRET_B32, t * 1000)).toBe(code8.slice(-6)!);
    }
  });

  it('verificação aceita ±1 passo de tempo (relógio dessincronizado)', () => {
    const emittedAt = 1_111_111_109_000;
    const token = computeTotp(SECRET_B32, emittedAt); // 081804
    expect(verifyTotp(SECRET_B32, token, emittedAt)).toBe(true);
    // Emissor atrasado 1 passo: quem verifica está 1 contador à frente
    expect(verifyTotp(SECRET_B32, token, emittedAt + 30_000)).toBe(true);
    // Emissor adiantado 1 passo
    expect(verifyTotp(SECRET_B32, token, emittedAt - 30_000)).toBe(true);
    // Fora da janela: 3 passos de diferença → recusado
    expect(verifyTotp(SECRET_B32, token, emittedAt + 3 * 30_000)).toBe(false);
    expect(verifyTotp(SECRET_B32, token, emittedAt - 3 * 30_000)).toBe(false);
  });

  it('recusa token com formato inválido sem gastar HMAC', () => {
    expect(verifyTotp(SECRET_B32, '28708', 59_000)).toBe(false);
    expect(verifyTotp(SECRET_B32, '2870822', 59_000)).toBe(false);
    expect(verifyTotp(SECRET_B32, 'abcdef', 59_000)).toBe(false);
    expect(verifyTotp(SECRET_B32, '', 59_000)).toBe(false);
  });

  it('segredo errado não valida', () => {
    const otherSecret = encodeBase32(Buffer.from('98765432109876543210', 'ascii'));
    const token = computeTotp(SECRET_B32, 59_000);
    expect(verifyTotp(otherSecret, token, 59_000, 3)).toBe(false);
  });

  it('generateTotpSecret gera base32 com 32 chars (20 bytes) verificável', () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    const code = computeTotp(secret, Date.now());
    expect(code).toMatch(/^\d{6}$/);
    expect(verifyTotp(secret, code, Date.now(), 1)).toBe(true);
    expect(decodeBase32(secret).length).toBe(20);
  });

  it('URI otpauth:// compatível com Google Authenticator', () => {
    const uri = buildOtpauthUri('ABC234DEF', 'ops@ifastfood.com', 'iFastFood');
    expect(uri).toBe(
      'otpauth://totp/iFastFood%3Aops%40ifastfood.com' +
        '?secret=ABC234DEF&issuer=iFastFood&digits=6&period=30&algorithm=SHA1',
    );
  });
});

import { describe, expect, it } from 'vitest';
import { decodeBase32, encodeBase32 } from './base32';

// RFC 4648 §10 (test vectors, base32)
const RFC_VECTORS: Array<[string, string]> = [
  ['', ''],
  ['f', 'MY'],
  ['fo', 'MZXQ'],
  ['foo', 'MZXW6'],
  ['foob', 'MZXW6YQ'],
  ['fooba', 'MZXW6YTB'],
  ['foobar', 'MZXW6YTBOI'],
];

describe('encodeBase32 / decodeBase32 (RFC 4648)', () => {
  it('compatibiliza com os vetores do RFC 4648', () => {
    for (const [ascii, expected] of RFC_VECTORS) {
      expect(encodeBase32(Buffer.from(ascii, 'ascii'))).toBe(expected);
      expect(decodeBase32(expected).toString('ascii')).toBe(ascii);
    }
  });

  it('roundtrip em bytes aleatórios de todos os tamanhos 1..35', () => {
    for (let size = 1; size <= 35; size++) {
      const buffer = Buffer.from(
        Array.from({ length: size }, () => Math.floor(Math.random() * 256)),
      );
      const encoded = encodeBase32(buffer);
      // Múltiplo de 5 bytes → sem digito parcial
      expect(encoded.length).toBe(Math.ceil((size * 8) / 5));
      expect(decodeBase32(encoded).equals(buffer)).toBe(true);
    }
  });

  it('decodifica com lowercase, espaços e padding "=" (aplicativos móveis)', () => {
    const strict = encodeBase32(Buffer.from('foo', 'ascii')); // MZXW6
    const padded = `${strict}====`; // 8 chars: Google Authenticator estilo
    expect(decodeBase32(padded.toLowerCase())).toEqual(Buffer.from('foo', 'ascii'));
    expect(decodeBase32(`${padded.slice(0, 3)} ${padded.slice(3)}`)).toEqual(
      Buffer.from('foo', 'ascii'),
    );
  });

  it('rejeita caractere fora do alfabeto (0/1/8/9 e símbolos)', () => {
    for (const bad of ['MZXW60', 'MZXW61', 'MZXW68', 'MZXW69', 'MZXW6+']) {
      expect(() => decodeBase32(bad as string)).toThrow(RangeError);
    }
  });
});

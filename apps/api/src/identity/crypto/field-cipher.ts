import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * Criptografia de campo (AES-256-GCM) para PII em repouso:
 * segredo TOTP, documento do cliente (`documentEncrypted`) etc.
 *
 * Formato do payload armazenado: `v1.<b64url(iv).12B>.<b64url(tag).16B>.<b64url(ct)>`
 *
 * Chave (plano §7.4 — "criptografia de campo p/ PII"):
 *  - `IDENTITY_FIELD_KEY`: hex de 32 bytes (64 chars) — via vault/config em produção;
 *  - sem env: chave efêmera por boot (DEV) — dados não sobrevivem ao restart,
 *    evitando chaves fracas/commitadas por engano.
 */
const PREFIX = 'v1';
const IV_BYTES = 12;
const TAG_BYTES = 16;

export class FieldCipherError extends Error {}

@Injectable()
export class FieldCipher {
  private readonly key: Buffer;
  private readonly ephemeral: boolean;

  constructor() {
    const hex = process.env.IDENTITY_FIELD_KEY?.trim();
    if (hex && /^[0-9a-fA-F]{64}$/.test(hex)) {
      this.key = Buffer.from(hex, 'hex');
      this.ephemeral = false;
    } else if (hex) {
      // Chave presente porém inválida: falhar rápido em vez de logar PII com ela.
      throw new Error('IDENTITY_FIELD_KEY inválida: esperado hex de 32 bytes (64 chars)');
    } else {
      this.key = randomBytes(32);
      this.ephemeral = true;
      // eslint-disable-next-line no-console
      console.warn('[FieldCipher] IDENTITY_FIELD_KEY ausente: chave efêmera DEV. ' +
        'Campos criptografados não sobrevivem ao restart — configure em produção.');
    }
  }

  get isEphemeralKey(): boolean {
    return this.ephemeral;
  }

  encrypt(plain: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(Buffer.from(plain, 'utf8')), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [PREFIX, b64u(iv), b64u(tag), b64u(ciphertext)].join('.');
  }

  /** Rejeita payload adulterado (auth tag) com erro tipado — nunca texto parciais. */
  decrypt(payload: string): string {
    const parts = payload.split('.');
    if (parts.length !== 4 || parts[0] !== PREFIX) {
      throw new FieldCipherError('Formato de payload desconhecido');
    }
    let iv: Buffer;
    let tag: Buffer;
    let ciphertext: Buffer;
    try {
      iv = unb64u(parts[1]!);
      tag = unb64u(parts[2]!);
      ciphertext = unb64u(parts[3]!);
      if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
        throw new Error('comprimento');
      }
    } catch {
      throw new FieldCipherError('Payload corrompido');
    }
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    try {
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    } catch {
      throw new FieldCipherError('Falha de autenticidade (payload adulterado ou chave incorreta)');
    }
  }
}

/** Derivação estável para testes/dev-tools: SHA-256 de semente (não usar em produção). */
export function fieldKeyFromSeed(seed: string): Buffer {
  if (seed.length < 32) throw new FieldCipherError('Semente muito curta (>=32)');
  return createHash('sha256').update(seed).digest();
}

function b64u(buffer: Buffer): string {
  return buffer.toString('base64url');
}

function unb64u(text: string): Buffer {
  return Buffer.from(text, 'base64url');
}

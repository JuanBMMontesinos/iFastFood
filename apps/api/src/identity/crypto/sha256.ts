import { createHash } from 'node:crypto';

/** SHA-256 hex canônico — integridade de tokens/OTP (NUNCA para senhas). */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

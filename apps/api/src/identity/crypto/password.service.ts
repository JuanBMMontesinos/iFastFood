import { Injectable } from '@nestjs/common';
import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2';

/**
 * Hash de senha com Argon2id — vencedor da Password Hashing Competition;
 * parâmetros OWASP 2024 (m=19456 KiB, t=2, p=1). Escolhido no lugar de
 * bcrypt/pbkdf2 pela resistência a ataques de memória (plano §7.2).
 */
@Injectable()
export class PasswordService {
  async hash(plain: string): Promise<string> {
    return argon2Hash(Buffer.from(plain, 'utf8'), {
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  /** Hash corrompido/legacy nunca lança — apenas "não bate". */
  async isMatch(hashed: string, plain: string): Promise<boolean> {
    try {
      return await argon2Verify(hashed, Buffer.from(plain, 'utf8'));
    } catch {
      return false;
    }
  }
}

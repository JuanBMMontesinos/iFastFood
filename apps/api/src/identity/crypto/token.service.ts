import { Injectable, Logger } from '@nestjs/common';
import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  type KeyObject,
} from 'node:crypto';
import { readFileSync } from 'node:fs';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { ApiError } from '../../common/api-error';
import { MFA_TTL_SECONDS } from '../config';

const ISSUER = 'ifastfood';

export type JwtKind = 'access' | 'mfa';

/** Claims do access token de sessão. */
export interface AccessClaims {
  sub: string;
  sid: string;
  fam: string;
}

/**
 * JWT RS256 (plano §7.1):
 *  - access token assinado com chave privada; verificação com chave pública;
 *  - `kid` no header permite rotação futura de chaves (F5);
 *  - sem env: par RSA efêmero por boot (dev only, com aviso) — tokens
 *    morrem a cada redeploy, evitando chaves fracas acidentais.
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly privateSigningKey: KeyObject;
  private readonly publicVerifyKey: KeyObject;
  readonly kid: string;

  constructor() {
    let privatePem = this.pemFromEnv('JWT_PRIVATE_KEY');
    const publicPem = this.pemFromEnv('JWT_PUBLIC_KEY');

    if (privatePem) {
      this.privateSigningKey = createPrivateKey(privatePem!);
      this.publicVerifyKey = createPublicKey(publicPem ?? this.privateSigningKey);
      this.kid = process.env.JWT_KEY_ID ?? 'primary';
      if (!publicPem) {
        this.logger.warn('JWT_PUBLIC_KEY ausente — chave de verificação derivada da privada.');
      }
      privatePem = null;
    } else {
      const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
      this.privateSigningKey = pair.privateKey;
      this.publicVerifyKey = pair.publicKey;
      this.kid = `ephemeral-${Date.now().toString(36)}`;
      this.logger.warn(
        'JWT_PRIVATE_KEY ausente: chave RSA efêmera gerada para este boot (DEV). ' +
          'Tokens são invalidados a cada reinício — forneça JWT_PRIVATE_KEY/JWT_PUBLIC_KEY em produção.',
      );
    }
  }

  async createAccessToken(claims: AccessClaims, ttlSeconds: number): Promise<string> {
    return this.buildSigner({ typ: 'access', sid: claims.sid, fam: claims.fam }, claims.sub, ttlSeconds).sign(
      this.privateSigningKey,
    );
  }

  async createMfaToken(userId: string, ttlSeconds = MFA_TTL_SECONDS): Promise<string> {
    return this.buildSigner({ typ: 'mfa' }, userId, ttlSeconds).sign(this.privateSigningKey);
  }

  async verifyAccess(token: string): Promise<AccessClaims> {
    const payload = await this.verify(token, 'access');
    return { sub: payload.sub as string, sid: payload.sid as string, fam: payload.fam as string };
  }

  async verifyMfa(token: string): Promise<string> {
    const payload = await this.verify(token, 'mfa');
    return payload.sub as string;
  }

  private buildSigner(claims: Record<string, unknown>, sub: string, ttlSeconds: number): SignJWT {
    return new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: this.kid, typ: 'JWT' })
      .setIssuer(ISSUER)
      .setSubject(sub)
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds);
  }

  private async verify(token: string, kind: JwtKind): Promise<JWTPayload> {
    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(token, this.publicVerifyKey, {
        issuer: ISSUER,
        algorithms: ['RS256'],
      }));
    } catch {
      throw ApiError.unauthorized('Token inválido ou expirado', 'TOKEN_INVALIDO');
    }
    if (payload.typ !== kind || typeof payload.sub !== 'string') {
      throw ApiError.unauthorized('Token com tipo incompatível', 'TOKEN_INVALIDO');
    }
    return payload;
  }

  private pemFromEnv(name: 'JWT_PRIVATE_KEY' | 'JWT_PUBLIC_KEY'): string | null {
    const inline = process.env[name];
    if (inline) return inline.replace(/\\n/g, '\n');
    const path = process.env[`${name}_PATH`];
    if (path) {
      try {
        return readFileSync(path, 'utf8');
      } catch {
        this.logger.error(`Falha ao ler ${name} em ${path}`);
      }
    }
    return null;
  }
}

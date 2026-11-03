import { decodeProtectedHeader } from 'jose';
import { TokenService } from './token.service';

/**
 * Sem JWT_PRIVATE_KEY → par RSA efêmero por instância (default de dev/CI).
 * Cobre roundtrip RS256, kid/alg no header, expiração e separação access|mfa.
 */
describe('TokenService (JWT RS256)', () => {
  const tokens = new TokenService();

  it('roundtrip do access token preserva claims e usa RS256+kid', async () => {
    const token = await tokens.createAccessToken({ sub: 'u1', sid: 's1', fam: 'f1' }, 900);
    const header = decodeProtectedHeader(token);

    expect(header.alg).toBe('RS256');
    expect(header.kid).toBeTruthy();
    expect(header.typ).toBe('JWT');

    const claims = await tokens.verifyAccess(token);
    expect(claims).toEqual({ sub: 'u1', sid: 's1', fam: 'f1' });
  });

  it('token mfa tem tipo próprio e não serve como access', async () => {
    const mfa = await tokens.createMfaToken('u9');
    await expect(tokens.verifyMfa(mfa)).resolves.toBe('u9');
    await expect(tokens.verifyAccess(mfa)).rejects.toMatchObject({
      status: 401,
      code: 'TOKEN_INVALIDO',
    });
  });

  it('access não serve como mfa', async () => {
    const access = await tokens.createAccessToken({ sub: 'u1', sid: 's1', fam: 'f1' }, 900);
    await expect(tokens.verifyMfa(access)).rejects.toMatchObject({ status: 401 });
  });

  it('token expirado é rejeitado', async () => {
    const expired = await tokens.createAccessToken({ sub: 'u1', sid: 's1', fam: 'f1' }, -10);
    await expect(tokens.verifyAccess(expired)).rejects.toMatchObject({
      status: 401,
      code: 'TOKEN_INVALIDO',
    });
  });

  it('token adulterado é rejeitado (assinatura quebra)', async () => {
    const token = await tokens.createAccessToken({ sub: 'u1', sid: 's1', fam: 'f1' }, 900);
    const tampered = `${token.slice(0, -2)}xx`;
    await expect(tokens.verifyAccess(tampered)).rejects.toMatchObject({ status: 401 });
  });
});

import { PermissionsGuard } from './permissions.guard';

interface UserFixture {
  roles: Array<{ name: string; permissions: Array<{ code: string }> }>;
}

const ADMIN_USER: UserFixture = { roles: [{ name: 'ADMIN', permissions: [] }] };

const OPS_USER: UserFixture = {
  roles: [
    {
      name: 'OPS',
      permissions: [{ code: 'users.read' }, { code: 'users.write' }],
    },
  ],
};

/**
 * Contexto/execução fake: o guard chama context.getHandler()/getClass() e
 * switchToHttp().getRequest() — os mesmos pontos do Nest, sem dependência
 * de pipeline HTTP real.
 */
function makeGuard(required: string[] | undefined, user: UserFixture | null) {
  const reflector = { getAllAndOverride: (_key: string) => required } as never;
  const prisma = {
    user: {
      findUnique: async () => user,
    },
  } as never;
  const request: { principal?: { userId: string; sessionId: string; familyId: string } } = {
    principal: user ? { userId: 'u1', sessionId: 's1', familyId: 'f1' } : undefined,
  };
  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as never;
  return { guard: new PermissionsGuard(reflector, prisma), context };
}

describe(PermissionsGuard, () => {
  it('sem metadado de permissão passa direto (não consulta banco)', async () => {
    const { guard, context } = makeGuard(undefined, null);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('ADMIN tem bypass do catálogo', async () => {
    const { guard, context } = makeGuard(['admin.write'], ADMIN_USER);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('usuário com a permissão exigida passa', async () => {
    const { guard, context } = makeGuard(['users.write'], OPS_USER);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('sem a permissão nega 403 listando o que falta', async () => {
    const { guard, context } = makeGuard(['users.read', 'finance.write'], OPS_USER);
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: 403,
      code: 'PERMISSAO_NEGADA',
      details: { missing: ['finance.write'] },
    });
  });

  it('sem principal autenticado nega antes de consultar banco', async () => {
    // usuário válido no banco, mas request SEM principal (token ausente):
    const { guard, context } = makeGuard(['users.read'], OPS_USER);
    (context as { switchToHttp: () => { getRequest: () => unknown } }).switchToHttp = () => ({
      getRequest: () => ({}),
    }) as never;
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: 401,
      code: 'TOKEN_AUSENTE',
    });
  });
});

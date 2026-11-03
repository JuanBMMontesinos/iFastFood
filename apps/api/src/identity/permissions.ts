/**
 * Catálogo de permissões (RBAC fino) e matriz de papéis do backoffice.
 * Fonte de verdade para o seed de RBAC e para o PermissionsGuard;
 * codificação alinhada aos módulos da F1–F6 do plano.
 */
export interface PermissionDefinition {
  code: string;
  description: string;
}

const def = (code: string, description: string): PermissionDefinition => ({ code, description });

export const PERMISSION_CATALOG: PermissionDefinition[] = [
  def('users.read', 'Consultar usuários da plataforma e da própria equipe'),
  def('users.write', 'Criar/atualizar usuários da própria equipe'),
  def('merchants.read', 'Consultar restaurantes parceiros'),
  def('merchants.write', 'Criar/atualizar restaurantes e contratos'),
  def('merchants.block', 'Bloquear/reativar restaurantes'),
  def('couriers.read', 'Consultar entregadores'),
  def('couriers.write', 'Criar/atualizar entregadores e documentos'),
  def('catalog.read', 'Consultar catálogos'),
  def('catalog.write', 'Editar catálogos'),
  def('orders.read', 'Consultar pedidos'),
  def('orders.write', 'Intervir em pedidos (cancelamento, reembolso)'),
  def('finance.read', 'Consultar financeiro e conciliação'),
  def('finance.write', 'Aprovar pagamentos/payouts e ajustes'),
  def('marketing.read', 'Consultar campanhas/cupons'),
  def('marketing.write', 'Criar/atualizar campanhas e cupons'),
  def('support.read', 'Consultar tickets'),
  def('support.write', 'Responder tickets e solicitar dados'),
  def('dsar.read', 'Consultar solicitações LGPD'),
  def('dsar.write', 'Executar exportações/anonimizações LGPD'),
  def('admin.read', 'Consultar configurações da plataforma'),
  def('admin.write', 'Alterar configurações da plataforma'),
];

export const ALL_PERMISSION_CODES: string[] = PERMISSION_CATALOG.map((p) => p.code);

/** Matriz papel → códigos de permissão (ADMIN recebe o catálogo completo). */
export const ROLE_MATRIX: Record<string, string[]> = {
  ADMIN: ALL_PERMISSION_CODES,
  OPS: [
    'users.read',
    'orders.read',
    'orders.write',
    'merchants.read',
    'merchants.write',
    'couriers.read',
    'couriers.write',
    'catalog.read',
    'catalog.write',
    'support.read',
  ],
  FINANCE: ['users.read', 'merchants.read', 'finance.read', 'finance.write', 'orders.read'],
  SUPPORT_N1: ['users.read', 'orders.read', 'merchants.read', 'couriers.read', 'support.read', 'support.write'],
  SUPPORT_N2: [
    'users.read',
    'orders.read',
    'merchants.read',
    'couriers.read',
    'support.read',
    'support.write',
    'dsar.read',
  ],
  MARKETING: ['marketing.read', 'marketing.write', 'orders.read', 'merchants.read'],
};

/** Descrições dos papéis system (portal admin renderiza esta lista). */
export const ROLE_DESCRIPTIONS: Record<string, string> = {
  ADMIN: 'Acesso total ao backoffice',
  OPS: 'Operações de pedidos, parceiros, frotas e catálogo',
  FINANCE: 'Financeiro, conciliação e payouts',
  SUPPORT_N1: 'Suporte de primeiro nível (tickets + leitura)',
  SUPPORT_N2: 'Recorrências e solicitações LGPD',
  MARKETING: 'Campanhas, cupons e merchandising',
};

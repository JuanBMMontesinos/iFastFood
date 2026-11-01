/**
 * Regras de taxas do marketplace — espelho parametrizável do modelo iFood:
 *
 *  Plano Básico:  comissão 12%, taxa de pagamento online 3,2%,
 *                 mensalidade R$ 110 (somente faturamento > R$ 1.800/mês).
 *  Plano Entrega: comissão 23%, taxa de pagamento online 3,2%,
 *                 mensalidade R$ 150 (mesma regra de faturamento).
 *
 * Todos os valores vêm do contrato do parceiro (MerchantContractRates),
 * que é configurável no backoffice — nada está fixo em código.
 */
import { clamp, MoneyCents } from '../money';

export type MerchantPlan = 'BASIC' | 'DELIVERY';

/** Base que sofre comissão: itens ou itens + entrega (configurável por contrato). */
export type CommissionBasis = 'ITEMS' | 'ITEMS_AND_DELIVERY';

/** PLATFORM = pago via app (gateway) | STORE = pago direto na loja/dinheiro. */
export type PaymentMode = 'PLATFORM' | 'STORE';

export interface MerchantContractRates {
  plan: MerchantPlan;
  /** Comissão do marketplace, em basis points (1200 = 12%). */
  commissionBps: number;
  /** Taxa de processamento de pagamento online (320 = 3,2%). */
  onlinePaymentFeeBps: number;
  /** Mensalidade cobrada quando o faturamento mensal supera o limite isento. */
  monthlyFeeCents: number;
  /** Limite de faturamento isento de mensalidade: só acima dele cobra (180000 = R$ 1.800). */
  feeFreeThresholdCents: number;
  commissionBasis: CommissionBasis;
}

export interface ServiceFeeConfig {
  minCents: number;
  maxCents: number;
  defaultCents: number;
}

/** Piso/teto do iFood: R$ 0,99 – R$ 2,49. */
export const DEFAULT_SERVICE_FEE: ServiceFeeConfig = {
  minCents: 99,
  maxCents: 249,
  defaultCents: 199,
};

/** Espelho dos planos públicos do iFood — ponto de partida configurável. */
export const DEFAULT_CONTRACT_RATES: Record<
  MerchantPlan,
  Omit<MerchantContractRates, 'plan' | 'commissionBasis' | 'monthlyFeeCents' | 'feeFreeThresholdCents'> & {
    monthlyFeeCents: number;
    feeFreeThresholdCents: number;
  }
> = {
  BASIC: {
    commissionBps: 1200,
    onlinePaymentFeeBps: 320,
    monthlyFeeCents: 11_000,
    feeFreeThresholdCents: 180_000,
  },
  DELIVERY: {
    commissionBps: 2300,
    onlinePaymentFeeBps: 320,
    monthlyFeeCents: 15_000,
    feeFreeThresholdCents: 180_000,
  },
};

export interface OrderFeeInput {
  /** Total dos itens do pedido (sem entrega), em centavos. */
  itemsTotalCents: MoneyCents;
  /** Taxa de entrega cobrada ao cliente, em centavos. */
  deliveryFeeCents: MoneyCents;
  paymentMode: PaymentMode;
  contract: MerchantContractRates;
  serviceFee?: ServiceFeeConfig;
}

export interface OrderFeeBreakdown {
  /** Base sobre a qual a comissão incide. */
  commissionableBaseCents: MoneyCents;
  /** Comissão do marketplace (retida). */
  commissionCents: MoneyCents;
  /** Taxa de processamento online (retida; 0 quando pago na loja). */
  paymentProcessingFeeCents: MoneyCents;
  /** Taxa de serviço paga PELO CLIENTE (não é desconto do parceiro). */
  customerServiceFeeCents: MoneyCents;
  /** Valor líquido a repassar ao parceiro por este pedido. */
  merchantNetCents: MoneyCents;
  /** Valor total pago pelo cliente. */
  customerTotalCents: MoneyCents;
}

/**
 * Cálculo das tarifas de um pedido individual + repasse líquido do parceiro.
 * Exemplo do mercado (plano Básico, pagamento plataforma):
 *   R$ 50,00 de itens, R$ 10,00 de entrega → comissão R$ 6,00,
 *   taxa online R$ 1,92, repasse líquido R$ 52,08.
 */
export function computeOrderFees(input: OrderFeeInput): OrderFeeBreakdown {
  const { itemsTotalCents, deliveryFeeCents, paymentMode, contract } = input;

  assertNonNegative(itemsTotalCents, 'itemsTotalCents');
  assertNonNegative(deliveryFeeCents, 'deliveryFeeCents');

  const orderTotalCents = itemsTotalCents + deliveryFeeCents;

  const commissionableBaseCents =
    contract.commissionBasis === 'ITEMS_AND_DELIVERY' ? orderTotalCents : itemsTotalCents;

  const commissionCents = Math.round((commissionableBaseCents * contract.commissionBps) / 10_000);

  const paymentProcessingFeeCents =
    paymentMode === 'PLATFORM'
      ? Math.round((orderTotalCents * contract.onlinePaymentFeeBps) / 10_000)
      : 0;

  const customerServiceFeeCents = computeCustomerServiceFee(input.serviceFee ?? DEFAULT_SERVICE_FEE);

  return {
    commissionableBaseCents,
    commissionCents,
    paymentProcessingFeeCents,
    customerServiceFeeCents,
    merchantNetCents: orderTotalCents - commissionCents - paymentProcessingFeeCents,
    customerTotalCents: orderTotalCents + customerServiceFeeCents,
  };
}

/** Taxa de serviço cobrada do cliente, sempre dentro do intervalo [min, max]. */
export function computeCustomerServiceFee(config: ServiceFeeConfig): MoneyCents {
  if (config.minCents > config.maxCents) {
    throw new RangeError('ServiceFeeConfig inválida: minCents > maxCents');
  }
  return clamp(config.defaultCents, config.minCents, config.maxCents);
}

export interface MonthlyBillingInput {
  /** Faturamento bruto de pedidos do mês (base de cobrança), em centavos. */
  monthlyGrossCents: MoneyCents;
  monthlyFeeCents: MoneyCents;
  feeFreeThresholdCents: MoneyCents;
}

/**
 * Mensalidade do plano: cobrada SOMENTE quando o faturamento do mês ultrapassa
 * o limite isento (regra do mercado: "> R$ 1.800,00 no mês", estritamente maior).
 */
export function computeMonthlyFee(input: MonthlyBillingInput): MoneyCents {
  assertNonNegative(input.monthlyGrossCents, 'monthlyGrossCents');
  if (input.monthlyGrossCents > input.feeFreeThresholdCents) {
    return input.monthlyFeeCents;
  }
  return 0;
}

function assertNonNegative(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${field} deve ser um inteiro em centavos ≥ 0 (recebido: ${value})`);
  }
}

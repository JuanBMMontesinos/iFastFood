/**
 * Dinheiro é SEMPRE representado em centavos inteiros (MoneyCents).
 * Nenhuma regra de negócio usa float — isso é regra do projeto (ADR-0001).
 */

/** Quantia em centavos (pode representar débito/crédito com sinal). */
export type MoneyCents = number;

/** Converte reais (float de entrada de usuário) para centavos inteiros. */
export function toCents(reais: number): MoneyCents {
  if (!Number.isFinite(reais)) {
    throw new RangeError(`toCents: valor inválido: ${reais}`);
  }
  return Math.round(reais * 100);
}

/** Converte centavos para reais (float, apenas para exibição/serialização). */
export function fromCents(cents: MoneyCents): number {
  return cents / 100;
}

/** 
 * Aplica uma taxa em basis points (1 bps = 0,01%) com arredondamento
 * matemático (half-up) — mesmo comportamento dos extratos do gateway.
 */
export function applyBps(amountCents: MoneyCents, bps: number): MoneyCents {
  return Math.round((amountCents * bps) / 10_000);
}

/** Converte porcentagem legível ("12") para basis points ("1200"). */
export function percentToBps(percent: number): number {
  return Math.round(percent * 100);
}

/**
 * Formata centavos como BRL legível: 110000 → "R$ 1.100,00".
 * Implementação manual (sem Intl) para garantir resultado idêntico
 * entre Windows/Linux/CI e dentro dos aplicativos nativos.
 */
export function formatBRL(cents: MoneyCents): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.trunc(cents));
  const reais = Math.floor(abs / 100).toString();
  const centavos = (abs % 100).toString().padStart(2, '0');
  const grouped = reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}R$ ${grouped},${centavos}`;
}

/** Limita um valor entre mínimo e máximo (inclusive). */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

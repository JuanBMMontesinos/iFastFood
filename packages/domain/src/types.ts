/**
 * Convenções do projeto (contrato do plano):
 * - Dinheiro em centavos inteiros (MoneyCents) —nunca float em regras.
 * - Taxas em basis points (bps) — legível e sem erro de ponto flutuante.
 */
export type { MoneyCents } from './money';
export { percentToBps } from './money';

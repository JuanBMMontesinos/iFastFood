// iFastFood — Regras de negócio puras (consumo: apps/*, SDKs gerados espelham os cálculos).
export * from './domain-error';
export * from './money';
export * from './types';
export * from './finance/tax-rules';
export * from './order/state-machine';
export * from './delivery/state-machine';
export * from './geo/haversine';
export * from './logistics/delivery-fee';
export * from './marketing/coupon';
export * from './partner/state-machine';
export * from './partner/hours';
export * from './security/base32';
export * from './security/totp';
export * from './security/rate-limit';

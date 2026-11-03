/**
 * Rate limiting de janela fixa, PURA (store injetado) — sem dependência de
 * Redis/infra nos testes. Uso imediato na F1: OTP e login. Em produção será
 * transportado para Redis (F3), mantendo a mesma função.
 */

export interface FixedWindowBucket {
  /** Início da janela corrente (ms). */
  windowStart: number;
  /** Requisições já consumidas na janela corrente. */
  count: number;
}

export interface FixedWindowStore {
  buckets: Map<string, FixedWindowBucket>;
}

export interface FixedWindowResult {
  allowed: boolean;
  /** Créditos restantes na janela corrente (0 quando negado). */
  remaining: number;
  /** Quando negado: espera até a próxima janela (ms) — para Retry-After. */
  retryAfterMs: number;
}

/**
 * Consome 1 crédito da janela corrente para `key`.
 * Contador cresce até `limit`; nova janela reinicia o bucket.
 */
export function consumeFixedWindow(
  store: FixedWindowStore,
  key: string,
  nowMs: number,
  limit: number,
  windowMs: number,
): FixedWindowResult {
  const bucket = store.buckets.get(key);

  if (bucket === undefined || nowMs - bucket.windowStart >= windowMs) {
    store.buckets.set(key, { windowStart: nowMs, count: 1 });
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: bucket.windowStart + windowMs - nowMs,
    };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count, retryAfterMs: 0 };
}

/** Buckets in-memory (dev / F1). Produção: substituir store por binding Redis. */
export function createFixedWindowStore(): FixedWindowStore {
  return { buckets: new Map() };
}

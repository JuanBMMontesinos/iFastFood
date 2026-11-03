import { describe, expect, it } from 'vitest';
import { consumeFixedWindow, createFixedWindowStore, type FixedWindowStore } from './rate-limit';

const WINDOW_MS = 60_000;
const NOW = 1_700_000_000_000;

describe('consumeFixedWindow', () => {
  it('permite até o limite e nega o excedente com Retry-After', () => {
    const store: FixedWindowStore = createFixedWindowStore();
    for (let i = 1; i <= 3; i++) {
      expect(consumeFixedWindow(store, 'k', NOW, 3, WINDOW_MS)).toEqual({
        allowed: true,
        remaining: 3 - i,
        retryAfterMs: 0,
      });
    }
    const denied = consumeFixedWindow(store, 'k', NOW + 1, 3, WINDOW_MS);
    expect(denied.allowed).toBe(false);
    expect(denied.remaining).toBe(0);
    expect(denied.retryAfterMs).toBe(WINDOW_MS - 1);
  });

  it('nova janela reinicia o contador', () => {
    const store = createFixedWindowStore();
    for (let i = 0; i < 3; i++) {
      consumeFixedWindow(store, 'k', NOW, 3, WINDOW_MS);
    }
    expect(consumeFixedWindow(store, 'k', NOW, 3, WINDOW_MS).allowed).toBe(false);
    const next = consumeFixedWindow(store, 'k', NOW + WINDOW_MS, 3, WINDOW_MS);
    expect(next.allowed).toBe(true);
    expect(next.remaining).toBe(2);
  });

  it('chaves diferentes não compartilham bucket', () => {
    const store = createFixedWindowStore();
    for (let i = 0; i < 3; i++) {
      consumeFixedWindow(store, 'a', NOW, 3, WINDOW_MS);
    }
    expect(consumeFixedWindow(store, 'a', NOW, 3, WINDOW_MS).allowed).toBe(false);
    const other = consumeFixedWindow(store, 'b', NOW, 3, WINDOW_MS);
    expect(other.allowed).toBe(true);
  });

  it('janela parcial: negado próximo do fim tem espera correta', () => {
    const store = createFixedWindowStore();
    consumeFixedWindow(store, 'k', NOW, 1, WINDOW_MS); // bucket aberto
    const denied = consumeFixedWindow(store, 'k', NOW + 20_000, 1, WINDOW_MS);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterMs).toBe(WINDOW_MS - 20_000);
  });
});

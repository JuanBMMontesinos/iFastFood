import { Injectable } from '@nestjs/common';
import { consumeFixedWindow, createFixedWindowStore } from '@ifastfood/domain';
import { ApiError } from '../../common/api-error';

/**
 * Rate limit por processo (janela fixa pura do domínio). Cobertura F1:
 * login, signup e OTP. Na F3 troca-se o store por Redis mantendo a função
 * pura — cumpre plano §7.8 sem dependência de infra nos testes.
 */
@Injectable()
export class RateLimiterService {
  private readonly store = createFixedWindowStore();

  consume(key: string, limit: number, windowMs: number): void {
    const result = consumeFixedWindow(this.store, key, Date.now(), limit, windowMs);
    if (!result.allowed) {
      throw ApiError.tooManyRequests('Muitas requisições — aguarde antes de tentar novamente', {
        retryAfterMs: result.retryAfterMs,
      });
    }
  }
}

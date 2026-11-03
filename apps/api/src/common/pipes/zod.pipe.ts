import { PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';
import { ApiError } from '../api-error';

/**
 * Validação por contrato: cada rota recebe o schema Zod de `@ifastfood/contracts`
 * e rejeita payloads fora do formato com código `PAYLOAD_INVALIDO` e detalhes
 * dos campos ofensores (primeiro erro como mensagem principal).
 */
export class ZodValidationPipe implements PipeTransform<unknown, unknown> {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown): unknown {
    const parsed = this.schema.safeParse(value ?? {});
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ApiError(400, 'PAYLOAD_INVALIDO', first?.message ?? 'Payload inválido', {
        issues: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || '(raiz)',
          message: issue.message,
        })),
      });
    }
    return parsed.data;
  }
}

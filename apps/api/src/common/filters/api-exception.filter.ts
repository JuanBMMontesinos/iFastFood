import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiError } from '../api-error';

interface ErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Único formato de erro da API (F1 §7): `{ error: { code, message, details? } }`.
 * ApiError/explicito → status/código indicado; HttpException do Nest → status
 * original; qualquer coisa não mapeada → 500 sem vazar stack nem SQL.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, body } = this.normalize(exception);
    response.status(status).json({
      timestamp: new Date().toISOString(),
      path: request?.originalUrl ?? null,
      error: body,
    });
  }

  private normalize(exception: unknown): { status: number; body: ErrorBody } {
    if (exception instanceof ApiError) {
      return {
        status: exception.status,
        body: { code: exception.code, message: exception.message, details: exception.details },
      };
    }

    if (exception instanceof HttpException) {
      const data = exception.getResponse();
      const raw = typeof data === 'string' ? data : (data as { message?: unknown }).message;
      const message = Array.isArray(raw) && raw.length > 0 ? String(raw[0]) : typeof raw === 'string' ? raw : exception.message;
      return {
        status: exception.getStatus(),
        body: { code: `HTTP_${exception.getStatus()}`, message: message ?? 'Requisição inválida' },
      };
    }

    this.logger.error(
      'Erro não tratado',
      exception instanceof Error ? exception.stack : String(exception),
    );
    return { status: 500, body: { code: 'ERRO_INTERNO', message: 'Erro interno — tente novamente mais tarde' } };
  }
}

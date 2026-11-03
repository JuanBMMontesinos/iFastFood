/**
 * Erro de aplicação portável: status HTTP + código estável + mensagem
 * para o cliente. Sempre mapeado pelo ApiExceptionFilter.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(code: string, message: string, details?: unknown): ApiError {
    return new ApiError(400, code, message, details);
  }

  static unauthorized(message = 'Credenciais inválidas', code = 'CREDENCIAIS_INVALIDAS'): ApiError {
    return new ApiError(401, code, message);
  }

  static forbidden(message = 'Acesso negado', code = 'ACESSO_NEGADO', details?: unknown): ApiError {
    return new ApiError(403, code, message, details);
  }

  static conflict(code: string, message: string, details?: unknown): ApiError {
    return new ApiError(409, code, message, details);
  }

  static tooManyRequests(message: string, details?: unknown): ApiError {
    return new ApiError(429, 'MUITAS_REQUISICOES', message, details);
  }

  static notFound(code: string, message: string, details?: unknown): ApiError {
    return new ApiError(404, code, message, details);
  }
}

/**
 * Erro base de violação de regra de negócio.
 * A camada de aplicação (NestJS) mapeia este erro para respostas 400/409.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

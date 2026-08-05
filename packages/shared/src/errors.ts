// Erros de domínio. Quem instancia services lança estes; o filter global
// mapeia pra HTTP via toHttpError().

export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
  readonly statusCode = 404;
}

export class UnauthorizedError extends DomainError {
  readonly code = 'UNAUTHORIZED';
  readonly statusCode = 401;
}

export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN';
  readonly statusCode = 403;
}

export class ConflictError extends DomainError {
  readonly code = 'CONFLICT';
  readonly statusCode = 409;
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION';
  readonly statusCode = 400;
}

export interface HttpLikeError {
  statusCode: number;
  body: { error: { code: string; message: string } };
}

export function toHttpError(err: DomainError): HttpLikeError {
  return { statusCode: err.statusCode, body: { error: { code: err.code, message: err.message } } };
}

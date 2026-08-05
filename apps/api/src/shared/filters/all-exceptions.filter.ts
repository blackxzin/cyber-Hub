import {
  Catch,
  ArgumentsHost,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { DomainError, toHttpError } from '@cyberhub/shared';
import { createLogger } from '@cyberhub/shared';

const log = createLogger('api.filter');

// Filtro global: mapeia DomainError → DTO de erro padronizado; Zod → 422;
// HttpException do Nest → seu status preservado; resto → 500.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<{ status: (c: number) => any; send: (b: any) => void }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: any = { error: { code: 'INTERNAL', message: 'Erro interno do servidor' } };

    if (exception instanceof DomainError) {
      const mapped = toHttpError(exception);
      status = mapped.statusCode;
      body = mapped.body;
    } else if (exception instanceof ZodError) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
      body = { error: { code: 'VALIDATION', message: 'Validation failed', details: exception.issues } };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp = exception.getResponse();
      body =
        typeof resp === 'string'
          ? { error: { code: 'HttpException', message: resp } }
          : (resp as any);
    } else if (exception instanceof Error) {
      log.error({ err: exception.message, stack: exception.stack }, 'unhandled exception');
    }

    res.status(status).send(body);
  }
}

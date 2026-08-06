import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { prisma } from '@cyberhub/database';
import { createLogger } from '@cyberhub/shared';
import { SKIP_AUDIT_KEY } from '../decorators/decorators';
import { botUserId } from '../bot-user';

const log = createLogger('api.audit');

// Grava AuditLog pós-handler em mutações (POST/PUT/PATCH/DELETE).
// Fire-and-forget (não bloqueia resposta). Filtra headers sensíveis (nenhum logado).
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  async intercept(ctx: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (skip) return next.handle();

    const http = ctx.switchToHttp();
    const req = http.getRequest<{
      method: string;
      url: string;
      ip: string;
      headers: Record<string, string>;
      user?: { id?: string };
    }>();

    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    const userId = req.user?.id ?? (isMutation ? await botUserId() : undefined);
    if (!isMutation || !userId) return next.handle();

    return next.handle().pipe(
      tap(() => {
        prisma.auditLog
          .create({
            data: {
              userId,
              action: `${req.method} ${req.url}`,
              target: req.url,
              ip: req.ip,
              userAgent: req.headers['user-agent'] ?? null,
              meta: {},
            },
          })
          .catch((e: unknown) => log.error({ err: (e as Error).message }, 'falha ao gravar auditLog'));
      }),
    );
  }
}

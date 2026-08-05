import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RoleName } from '@cyberhub/database';
import { ForbiddenError, UnauthorizedError } from '@cyberhub/shared';
import { ROLES_KEY } from '../decorators/decorators';

// Lê @Roles(...) da rota e compara com req.user.role.
// Sem @Roles → só exige que esteja autenticado (ou seja, a Jwt/ApiKey guard já passou).
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RoleName[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = ctx.switchToHttp().getRequest<{ user?: { role?: RoleName } }>();
    const user = request.user;
    if (!user || !user.role) throw new UnauthorizedError('não autenticado');
    if (!required.includes(user.role)) throw new ForbiddenError('role insuficiente');
    return true;
  }
}


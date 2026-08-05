import { SetMetadata, type CustomDecorator } from '@nestjs/common';
import type { RoleName } from '@cyberhub/database';

// @Roles('ADMIN', 'ANALYST') — lido pelo RolesGuard.
export const ROLES_KEY = 'roles';
export const Roles = (...roles: RoleName[]): CustomDecorator<string> =>
  SetMetadata(ROLES_KEY, roles);

// @Public() — pula JwtAuthGuard (rotas abertas: health, login, register).
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = (): CustomDecorator<string> => SetMetadata(IS_PUBLIC_KEY, true);

// @SkipAudit() — o AuditInterceptor ignora a rota marcada.
export const SKIP_AUDIT_KEY = 'skipAudit';
export const SkipAudit = (): CustomDecorator<string> => SetMetadata(SKIP_AUDIT_KEY, true);

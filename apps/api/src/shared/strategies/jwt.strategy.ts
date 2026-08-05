import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { config } from '@cyberhub/shared';
import type { RoleName } from '@cyberhub/database';
import { prisma } from '@cyberhub/database';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  role: RoleName;
  type: 'access' | 'refresh';
}

// Extrai o access JWT do cookie httpOnly 'cyhub_access', com fallback
// pro header Authorization: Bearer (uso em testes / bot alternativo).
function fromCookieOrBearer(req: any): string | null {
  const cookie = req?.cookies?.['cyhub_access'];
  if (cookie) return cookie;
  const auth: string | undefined = req?.headers?.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    const cfg = config();
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([fromCookieOrBearer]),
      secretOrKey: cfg.JWT_ACCESS_SECRET,
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload): Promise<{ id: string; email: string; role: RoleName }> {
    // Confirma que o usuário existe e o role não mudou desde a emissão do token.
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true },
    });
    if (!user) throw new UnauthorizedException('usuário não encontrado');
    return { id: user.id, email: user.email, role: user.role };
  }
}

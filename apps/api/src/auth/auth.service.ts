import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { config } from '@cyberhub/shared';
import { ConflictError, UnauthorizedError } from '@cyberhub/shared';
import { hashPassword, verifyPassword } from '@cyberhub/utils';
import type { RegisterDto, LoginDto } from '@cyberhub/types';
import type { RoleName } from '@cyberhub/database';
import { UserRepository } from '../users/repositories/user.repository';
import { RefreshTokenService } from './refresh-token.service';
import type { JwtPayload } from '../shared/strategies/jwt.strategy';
import type { AuthedUser } from './auth.types';

// Orquestra registro/login/refresh/logout. Nunca toca Prisma diretamente —
// passa pelo UserRepository. Tokens assinados via JwtService.
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly jwt: JwtService,
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: AuthedUser; accessToken: string; refreshToken: string }> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) throw new ConflictError('email já cadastrado');

    const passwordHash = await hashPassword(dto.password);
    // Lookups do role default (VIEWER) — pega o Role correspondente se existir.
    const user = await this.users.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
      role: 'VIEWER',
    });
    return this.issueTokens(user.id, user.email, 'VIEWER');
  }

  async login(dto: LoginDto): Promise<{ user: AuthedUser; accessToken: string; refreshToken: string }> {
    const user = await this.users.findByEmail(dto.email);
    if (!user) throw new UnauthorizedError('credenciais inválidas');
    const ok = await verifyPassword(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedError('credenciais inválidas');
    return this.issueTokens(user.id, user.email, user.role);
  }

  async refresh(refreshToken: string): Promise<{ user: AuthedUser; accessToken: string; refreshToken: string }> {
    // Decodifica sem validar exp 1º (Redis é fonte de verdade do "ativo").
    let payload: JwtPayload;
    try {
      payload = this.jwt.verify(refreshToken, {
        secret: config().JWT_REFRESH_SECRET,
      }) as JwtPayload;
    } catch {
      throw new UnauthorizedError('refresh token inválido');
    }
    if (payload.type !== 'refresh' || !payload.sub) {
      throw new UnauthorizedError('refresh token inválido');
    }
    const valid = await this.refreshTokens.verify(payload.sub, refreshToken);
    if (!valid) throw new UnauthorizedError('refresh token revogado/expirado');

    // Rotaciona: revoga antigo, emite novo par.
    await this.refreshTokens.revoke(payload.sub, refreshToken);
    return this.issueTokens(payload.sub, payload.email, payload.role);
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    await this.refreshTokens.revoke(userId, refreshToken);
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: RoleName,
  ): Promise<{ user: AuthedUser; accessToken: string; refreshToken: string }> {
    const cfg = config();
    const user: AuthedUser = { id: userId, email, role };
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, role, type: 'access' } satisfies JwtPayload,
      { secret: cfg.JWT_ACCESS_SECRET, expiresIn: cfg.JWT_ACCESS_TTL },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, email, role, type: 'refresh' } satisfies JwtPayload,
      { secret: cfg.JWT_REFRESH_SECRET, expiresIn: cfg.JWT_REFRESH_TTL },
    );
    await this.refreshTokens.store(userId, refreshToken);
    return { user, accessToken, refreshToken };
  }
}

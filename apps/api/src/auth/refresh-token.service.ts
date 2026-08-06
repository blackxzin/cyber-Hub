import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { createHash } from 'crypto';
import { config } from '@cyberhub/shared';
import { PrismaService } from '../database/prisma.service';

// Estado "ativo/revogado" do refresh token fica em Redis (auto-expira via TTL),
// e a linha de auditoria na tabela RefreshToken (AD-11).
//  - store(): grava nos dois
//  - verify(): exige existir no Redis E não revogado no DB
//  - revoke(): remove do Redis + marca DB revoked
const REFRESH_TTL_SECONDS = (): number => ttlSeconds(config().JWT_REFRESH_TTL);

function ttlSeconds(human: string): number {
  // "7d" | "15m" | "3600s" | "3600"
  const m = /^(\d+)([smhd])?$/.exec(human.trim());
  if (!m) return 7 * 24 * 3600;
  const n = Number(m[1]);
  const unit = m[2] ?? 's';
  const mult: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return n * (mult[unit] ?? 1);
}

function tokenHashOf(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class RefreshTokenService implements OnModuleInit, OnModuleDestroy {
  private redis!: Redis;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    const cfg = config();
    this.redis = new Redis({
      host: cfg.REDIS_HOST,
      port: cfg.REDIS_PORT,
      password: cfg.REDIS_PASSWORD,
      keyPrefix: 'refresh:',
    });
  }

  onModuleDestroy(): void {
    this.redis?.disconnect();
  }

  private key(userId: string, hash: string): string {
    return `${userId}:${hash}`;
  }

  async store(userId: string, token: string): Promise<void> {
    const hash = tokenHashOf(token);
    const ttl = REFRESH_TTL_SECONDS();
    await this.redis.set(this.key(userId, hash), '1', 'EX', ttl);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + ttl * 1000),
      },
    });
  }

  async verify(userId: string, token: string): Promise<boolean> {
    const hash = tokenHashOf(token);
    const inRedis = await this.redis.exists(this.key(userId, hash));
    if (!inRedis) return false;
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
    return row !== null && row.revoked === false;
  }

  async revoke(userId: string, token: string): Promise<void> {
    const hash = tokenHashOf(token);
    await this.redis.del(this.key(userId, hash));
    await this.prisma.refreshToken
      .updateMany({ where: { tokenHash: hash }, data: { revoked: true } })
      .catch(() => {
        /* linha pode não existir; tolerável */
      });
  }
}

import { Injectable } from '@nestjs/common';
import type { User } from '@cyberhub/database';
import { PrismaService } from '../../database/prisma.service';

// Único repositório desta fase (Auth + Users consomem).
// ponytail: quando surgir 2º consumidor fora destes módulos, extrair
// IUserRepository e implementar em packages/database.
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: {
    email: string;
    passwordHash: string;
    name?: string | undefined;
    role: 'ADMIN' | 'ANALYST' | 'VIEWER' | 'BOT';
    roleId?: string | null;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name ?? null,
        role: data.role,
        roleId: data.roleId ?? null,
      },
    });
  }

  updateProfile(
    id: string,
    data: { name?: string | undefined; email?: string | undefined },
  ): Promise<User> {
    // Prisma interpreta undefined como "não tocar este campo"; com
    // exactOptionalPropertyTypes não podemos passar undefined explícito,
    // então só repassamos o que estiver definido.
    const update: { name?: string; email?: string } = {};
    if (data.email !== undefined) update.email = data.email;
    if (data.name !== undefined) update.name = data.name;
    return this.prisma.user.update({ where: { id }, data: update });
  }
}

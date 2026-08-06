import { Injectable } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { NotFoundError } from '@cyberhub/shared';
import type { UpdateUserDto } from '@cyberhub/types';

@Injectable()
export class UsersService {
  constructor(private readonly users: UserRepository) {}

  async getMe(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError('usuário não encontrado');
    return { user: this.toDto(user) };
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    const user = await this.users.updateProfile(userId, dto);
    return { user: this.toDto(user) };
  }

  private toDto(u: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    };
  }
}

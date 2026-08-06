import { prisma } from '@cyberhub/database';

// Resolve o usuário dono das entidades criadas por rotas públicas (sem auth).
// Prefere o bot; fallback p/ qualquer usuário. Cacheia em módulo (estável em runtime).
let cached: string | null = null;

export async function botUserId(): Promise<string> {
  if (cached) return cached;
  const bot = await prisma.user.findFirst({ where: { role: 'BOT' }, select: { id: true } });
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
  cached = bot?.id ?? admin?.id ?? '00000000-0000-0000-0000-000000000000';
  return cached;
}
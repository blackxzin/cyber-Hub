/* eslint-disable no-console */
// Seed: roles + permissions por role + usuário admin (dev) + usuário bot (x-api-key).
// Idempotente (upsert). Rode via `pnpm db:seed` (tsx).
//
// AVISO: admin@cyberhub.ai / Cyberhub@dev123 é senha de DEV. Troque em prod.

import { PrismaClient, type RoleName } from '@prisma/client';
import { hashPassword, hashApiKey } from '@cyberhub/utils';

const prisma = new PrismaClient();

// Permissões base do sistema. Cada role recebe um subconjunto.
const ALL_PERMISSIONS = [
  'user:read',
  'user:write',
  'log:read',
  'config:write',
  'intel:read',
  'intel:write',
  'report:read',
  'report:write',
  'alert:read',
  'alert:write',
  'news:read',
  'cve:read',
  'cve:write',
  'ai:chat',
] as const;

const ROLE_PERMISSIONS: Record<RoleName, readonly string[]> = {
  ADMIN: ALL_PERMISSIONS,
  ANALYST: [
    'user:read',
    'intel:read',
    'intel:write',
    'report:read',
    'report:write',
    'alert:read',
    'alert:write',
    'news:read',
    'cve:read',
    'ai:chat',
  ],
  VIEWER: ['user:read', 'intel:read', 'report:read', 'alert:read', 'news:read', 'cve:read', 'ai:chat'],
  BOT: ['intel:read', 'intel:write', 'report:read', 'report:write', 'news:read', 'cve:read'],
};

async function seedRolesAndPermissions(): Promise<Record<RoleName, string>> {
  const roleIds = {} as Record<RoleName, string>;
  for (const name of Object.keys(ROLE_PERMISSIONS) as RoleName[]) {
    const role = await prisma.role.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    roleIds[name] = role.id;

    // Recria permissões do role de forma idempotente.
    const wanted = ROLE_PERMISSIONS[name];
    await prisma.permission.deleteMany({ where: { roleId: role.id } });
    if (wanted.length > 0) {
      await prisma.permission.createMany({
        data: wanted.map((p) => ({ name: p, roleId: role.id })),
      });
    }
  }
  return roleIds;
}

async function seedAdmin(roleId: string): Promise<void> {
  const email = 'admin@cyberhub.ai';
  const passwordHash = await hashPassword('Cyberhub@dev123');
  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      name: 'CyberHub Admin',
      role: 'ADMIN',
      roleId,
    },
    update: { passwordHash, role: 'ADMIN', roleId },
  });
  console.log('  ✓ admin user (admin@cyberhub.ai / Cyberhub@dev123)');
}

async function seedBot(roleId: string): Promise<void> {
  // API key do bot vem de CYBERHUB_API_KEY (.env). Se ausente, pula o bot
  // (o ApiKeyAuthGuard simplesmente rejeita até o seed rodar com key definida).
  const apiKey = process.env.CYBERHUB_API_KEY;
  if (!apiKey || apiKey.length < 16) {
    console.log('  · bot user skipped (CYBERHUB_API_KEY ausente/curta — defina no .env)');
    return;
  }
  const email = 'bot@cyberhub.internal';
  const apiKeyHash = await hashApiKey(apiKey);
  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash: await hashPassword(apiKey), // placeholder nunca usado p/ login
      name: 'Discord Bot',
      role: 'BOT',
      roleId,
      apiKeyHash,
    },
    update: { apiKeyHash, role: 'BOT', roleId },
  });
  console.log('  ✓ bot user (hash da CYBERHUB_API_KEY armazenado)');
}

async function main(): Promise<void> {
  console.log('Seeding CyberHub AI…');
  const roleIds = await seedRolesAndPermissions();
  await seedAdmin(roleIds.ADMIN);
  await seedBot(roleIds.BOT);
  console.log('Seed concluído.');
}

main()
  .catch((e) => {
    console.error('Seed falhou:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

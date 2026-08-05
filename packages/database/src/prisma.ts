import { PrismaClient } from '@prisma/client';

// Singleton com guard global — evita esgotar pool de conexões em hot-reload
// (nest --watch / tsx watch). Cada reload reusaria a mesma instância.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['warn', 'error'] : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

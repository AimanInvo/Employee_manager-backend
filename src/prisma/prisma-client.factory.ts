import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to initialize Prisma.');
  }

  return databaseUrl;
}

export function createPrismaAdapter(): PrismaPg {
  const pool = new Pool({
    connectionString: getDatabaseUrl(),
  });

  return new PrismaPg(pool);
}

export function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    adapter: createPrismaAdapter(),
  });
}

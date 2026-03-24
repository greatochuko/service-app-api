import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { env } from "./env";
import { logger } from "../utils/logger";

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL!,
});

export const prisma = new PrismaClient({
  adapter,
  log: ["error", "warn"],
});

async function initializeDb() {
  try {
    // 1. Try to connect
    await prisma.$connect();

    // 2. Perform a "Live" check (The 'Deep' Check)
    // This forces the driver to actually talk to the DB
    await prisma.$executeRawUnsafe("SELECT 1");

    logger.info("✅ Database connected and verified successfully");
  } catch (err) {
    logger.error(`✗ Database connection failed: ${(err as Error).message}`);
    // In many cases, you want the app to crash here so you know it's broken
    // process.exit(1);
  }
}

initializeDb();

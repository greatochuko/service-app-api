import dotenv from "dotenv";
import { logger } from "../utils/logger";

dotenv.config();

export const env = {
  PORT: process.env.PORT || 8080,
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
};

const missingEnvs = Object.entries(env)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingEnvs.length > 0) {
  missingEnvs.forEach((key) => {
    logger.error(`❌ Missing environment variable: ${key}`);
  });
} else {
  logger.info("✅ Environment variables loaded successfully");
}

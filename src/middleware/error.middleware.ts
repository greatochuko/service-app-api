import { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger";
import { ZodError } from "zod/v3";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

export const errorHandler = (
  err: unknown,
  _: Request,
  res: Response,
  __: NextFunction,
) => {
  // Log the stack trace for internal errors, or just the message for AppErrors

  // 1. Handle our custom operational errors
  if (err instanceof AppError) {
    logger.error(err.message);
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // 2. Handle Zod validation errors globally
  if (err instanceof ZodError) {
    logger.error(err.errors.map((e) => e.message).join("\n"));
    return res.status(400).json({
      success: false,
      message: err.errors[0].message, // Returns the first validation message
      errors: err.errors, // Optional: send full array for frontend mapping
    });
  }

  // 3. Handle generic Javascript errors
  if (err instanceof Error) {
    logger.error(err.message);
    return res.status(500).json({
      success: false,
      message:
        env.NODE_ENV === "development" ? err.message : "Internal Server Error",
    });
  }

  logger.error((err as Error).message);

  // 4. Fallback for anything else
  return res.status(500).json({
    success: false,
    message: "An unexpected error occurred",
  });
};

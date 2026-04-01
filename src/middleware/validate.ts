import { Request, Response, NextFunction } from "express";
import { ZodError, ZodObject } from "zod"; // Change this line
import { logger } from "../utils/logger";

export const validate =
  (schema: ZodObject) => (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.error(error.issues.map((e) => e.message).join("\n"));
        return res.status(400).json({
          success: false,
          message: error.issues[0]?.message || "Validation Error",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

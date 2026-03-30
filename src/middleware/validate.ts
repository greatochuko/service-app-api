import { Request, Response, NextFunction } from "express";
import { ZodObject, ZodError } from "zod"; // Change this line

export const validate =
  (schema: ZodObject) => (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      console.log(error);
      if (error instanceof ZodError) {
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

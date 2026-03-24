import { Request, Response, NextFunction, RequestHandler } from "express";

export const asyncHandler =
  <T extends RequestHandler>(fn: T) =>
  (req: Request, res: Response, next: NextFunction) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };

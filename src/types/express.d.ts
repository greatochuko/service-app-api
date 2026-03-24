import { Request, Response } from "express";
import { AuthTokenPayload } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export interface TypedRequest<T> extends Request {
  body: T;
}

export type TypedResponse<T> = Response<
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      message: string;
    }
>;

export {};

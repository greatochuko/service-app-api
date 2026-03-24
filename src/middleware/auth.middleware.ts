import { Request, Response, NextFunction } from "express";
import { generateToken, verifyToken } from "../utils/jwt";

export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new Error("Unauthorized");
    }

    const token = authHeader.split(" ")[1];

    const decoded = verifyToken(token);

    req.user = decoded;

    // --- AUTO RENEWAL LOGIC ---
    if (decoded.exp) {
      const now = Math.floor(Date.now() / 1000);
      const threeDaysInSeconds = 3 * 24 * 60 * 60;

      // Check if (Expiration Time - Current Time) < 3 Days
      if (decoded.exp - now < threeDaysInSeconds) {
        // Generate a fresh token with the same user data
        const newToken = generateToken({
          id: decoded.id,
          role: decoded.role,
        });

        // Send it back in a custom header so the frontend can update its storage
        res.setHeader("x-renewed-token", newToken);
        res.setHeader("Access-Control-Expose-Headers", "x-renewed-token");
      }
    }

    next();
  } catch {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
}

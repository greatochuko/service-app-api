import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes";
import { errorHandler } from "./middleware/error.middleware";
import rateLimit from "express-rate-limit";
import "./config/prisma";
import { createServer } from "node:http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: [], // Match your Express CORS settings
    methods: ["GET", "POST"],
  },
});

// Security
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: [], //"*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  }),
);

// Logging
app.use(morgan("dev"));

// Body parser
app.use(express.json());

// 1. Enable 'trust proxy'
// This tells Express that it is behind a proxy (Railway/Cloudflare)
// and to use the X-Forwarded-For header to find the real client IP.
app.set("trust proxy", 1);

// Rate limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later.",
});

app.use(limiter);

app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use("/api", routes);

// Error handler (must be last)
app.use(errorHandler);

export { app, httpServer, io };
export default app;

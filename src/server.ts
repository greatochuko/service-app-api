import { app, httpServer, io } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";

app.get("/", (_, res): void => {
  // Constructed using: | \ _ - =
  const spacedArt: string = `
 ____  _____ ______     _____ ____ _____      _    ____  ____  
 / ___|| ____|  _ \\ \\   / /_ _/ ___| ____|    / \\  |  _ \\|  _ \\ 
 \\___ \\|  _| | |_) \\ \\ / / | | |   |  _|     / _ \\ | |_) | |_) |
  ___) | |___|  _ < \\ V /  | | |___| |___   / ___ \\|  __/|  __/ 
 |____/|_____|_| \\_\\ \\_/  |___\\____|_____| /_/   \\_\\_|   |_|    
                                                                
 ______________________________________________________________
`;

  // We set the Content-Type to text/plain so the browser/client
  // renders the whitespace correctly instead of collapsing it.
  res.setHeader("Content-Type", "text/plain");
  res.status(200).send(spacedArt);
});

/**
 * Health Check Route
 * Simple JSON response to indicate service availability
 */
app.get("/health", (_, res): void => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

io.on("connection", (socket) => {
  logger.info(`User connected: ${socket.id}`);

  socket.on("join_room", (roomId: string) => {
    socket.join(roomId);
  });

  socket.on("disconnect", () => {
    logger.info("User disconnected");
  });
});

// 3. CRITICAL: Change app.listen to httpServer.listen
httpServer.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT}`);
});

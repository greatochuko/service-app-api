const colors = {
  reset: "\x1b[0m",
  info: "\x1b[36m", // Cyan
  error: "\x1b[31m", // Red
  warn: "\x1b[33m", // Yellow
};

export const logger = {
  info: (message: string) => {
    console.log(`${colors.info}[INFO]${colors.reset} ${message}`);
  },
  error: (message: string) => {
    console.error(`${colors.error}[ERROR]${colors.reset} ${message}`);
  },
  warn: (message: string) => {
    console.warn(`${colors.warn}[WARN]${colors.reset} ${message}`);
  },
};

import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  outDir: "dist",
  target: "es2020",
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["fs", "path", "dotenv", "@prisma/client"],
});

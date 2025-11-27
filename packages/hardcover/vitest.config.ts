import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@book-effect/core": path.resolve(__dirname, "../core/src/index.ts"),
    },
  },
  test: {
    root: path.resolve(__dirname),
    include: ["src/**/*.test.ts"],
    globals: false,
  },
});

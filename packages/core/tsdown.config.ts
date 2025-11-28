import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  format: ["esm"],
  outDir: "dist",
  dts: true,
  clean: true,
  treeshake: true,
  platform: "neutral",
  tsconfig: "./tsconfig.lib.json",
});

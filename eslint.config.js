import js from "@eslint/js";
import tseslint from "typescript-eslint";
import effectPlugin from "@effect/eslint-plugin";

export default tseslint.config(
  {
    ignores: [
      "node_modules",
      "**/dist",
      "**/.next",
      "**/coverage",
      "**/*.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  effectPlugin.configs.dprint,
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    plugins: {
      "@effect": effectPlugin,
    },
    rules: {
      // Enable all Effect eslint rules
      "@effect/no-import-from-barrel-package": "error",
    },
  }
);

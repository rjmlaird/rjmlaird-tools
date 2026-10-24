import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  { ignores: ["**/node_modules/**", "**/dist/**", "**/.wrangler/**", "**/*.generated.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "warn",
    },
  },
);
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Operational Node scripts are CommonJS.
    files: ["scripts/**/*.js", "*.config.js", "ecosystem.config.js", "jest.config.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    // Existing code uses `any` widely (mostly mssql recordsets). Kept visible as
    // warnings so it can be paid down without blocking lint on real errors.
    rules: { "@typescript-eslint/no-explicit-any": "warn" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    "logs/**",
  ]),
]);

export default eslintConfig;

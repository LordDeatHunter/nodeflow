import { defineConfig } from "eslint/config";
import globals from "globals";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import solid from "eslint-plugin-solid/configs/typescript";

const SOLID_FILES = [
  "packages/solid/**/*.{ts,tsx}",
  "examples/BlueprintApp/**/*.{ts,tsx}",
  "examples/FamilyTreeApp/**/*.{ts,tsx}",
  "examples/NoStyle/**/*.{ts,tsx}",
];

export default defineConfig([
  {
    ignores: ["**/node_modules/", "**/dist/", "examples-build/", "**/.turbo/"],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    // CommonJS scripts (e.g. scripts/build-examples.cjs) legitimately use require().
    files: ["**/*.cjs"],
    languageOptions: { sourceType: "commonjs" },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    files: SOLID_FILES,
    ...solid,
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "arrow-body-style": ["error", "as-needed"],
      "block-scoped-var": "error",
      "no-duplicate-imports": "error",
      "no-lonely-if": "error",
      "no-unneeded-ternary": "error",
      "no-useless-return": "warn",
      "object-shorthand": ["error", "always"],
      "prefer-arrow-callback": "warn",
      "prefer-const": "error",
      yoda: [
        "warn",
        "never",
        {
          exceptRange: true,
        },
      ],
    },
  },
  {
    // The `semi` core rule is deprecated; @stylistic is not installed, so keep the core rule for TS/JS sources.
    files: ["**/*.{js,cjs,mjs,ts,tsx}"],
    rules: {
      semi: ["error", "always"],
    },
  },
]);

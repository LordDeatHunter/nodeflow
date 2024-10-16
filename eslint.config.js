import globals from "globals";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import solid from "eslint-plugin-solid/configs/typescript";
import * as tsParser from "@typescript-eslint/parser";

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    ...solid,
    languageOptions: {
      parser: tsParser,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
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
      semi: ["error", "always"],
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
    ignores: ["**/node_modules/", "**/dist/", "examples-build/", "scripts/"],
  },
];

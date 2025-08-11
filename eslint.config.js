import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  js.configs.recommended,
  prettierConfig,
  {
    ignores: ["dist/", "node_modules/"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    extends: [...tseslint.configs.recommended],
  },
  {
    files: ["scripts/**/*.{js,ts}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
);

import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{
		ignores: ["node_modules/**", "dist/**", "build/**"]
	},
	{
		files: ["src/**/*.{ts,tsx}"],
		extends: [js.configs.recommended, ...tseslint.configs.recommended, prettier],
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module"
		}
	}
);

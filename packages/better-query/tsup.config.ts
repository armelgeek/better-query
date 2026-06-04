import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		index: "./src/index.ts",
		client: "./src/client/index.ts",
		adapters: "./src/adapters/index.ts",
		plugins: "./src/plugins/index.ts",
		react: "./src/react/index.tsx",
	},
	format: ["esm", "cjs"],
	dts: true,
	splitting: true,
	target: "es2022",
	sourcemap: true,
	clean: true,
	external: [
		"pg",
		"mysql2",
		"better-sqlite3",
		"react",
		"react-dom",
		"@tanstack/react-query",
		"react-hook-form",
		"@hookform/resolvers",
		"@hookform/resolvers/zod",
	],
});

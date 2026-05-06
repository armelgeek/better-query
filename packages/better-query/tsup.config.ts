import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		index: "./src/index.ts",
		client: "./src/client/index.ts",
		adapters: "./src/adapters/index.ts",
		plugins: "./src/plugins/index.ts",
		cli: "./src/cli/index.ts",
	},
	format: ["esm", "cjs"],
	dts: true,
	splitting: true,
	target: "es2022",
	sourcemap: true,
	clean: true,
	external: ["pg", "mysql2", "better-sqlite3"],
});

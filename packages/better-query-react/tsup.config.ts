import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["./src/index.tsx"],
	format: ["esm", "cjs"],
	dts: true,
	splitting: true,
	target: "es2022",
	sourcemap: true,
	clean: true,
	external: [
		"react",
		"react-dom",
		"react-hook-form",
		"@hookform/resolvers",
		"@tanstack/react-query",
		"@better-query/client"
	],
});

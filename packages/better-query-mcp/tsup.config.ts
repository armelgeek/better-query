import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm", "cjs"],
	dts: true,
	sourcemap: true,
	clean: true,
	shims: true,
	splitting: false,
	target: "node18",
	banner: {
		js: "#!/usr/bin/env node",
	},
});

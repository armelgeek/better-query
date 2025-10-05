import { createMDX } from "fumadocs-mdx/next";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
	// Enable static export for GitHub Pages
	output: "export",
	basePath: process.env.NODE_ENV === "production" ? "/better-query" : "",
	trailingSlash: true,

	// Set output file tracing root for monorepo
	outputFileTracingRoot: join(__dirname, ".."),

	// Skip dynamic routes that won't work with static export
	generateBuildId: async () => {
		return "gh-pages-build";
	},

	serverExternalPackages: [
		"ts-morph",
		"typescript",
		"oxc-transform",
		"@shikijs/twoslash",
	],
	images: {
		unoptimized: true, // Required for static export
		remotePatterns: [
			{
				hostname: "images.unsplash.com",
			},
			{
				hostname: "assets.aceternity.com",
			},
			{
				hostname: "pbs.twimg.com",
			},
			{
				hostname: "github.com",
			},
			{
				hostname: "hebbkx1anhila5yf.public.blob.vercel-storage.com",
			},
		],
	},
	reactStrictMode: true,
	typescript: {
		ignoreBuildErrors: true,
	},
};

export default withMDX(config);

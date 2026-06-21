import { z } from "zod";
import { createQueryEndpoint } from "../../endpoints";
import { Plugin } from "../../types/plugins";
import { StorageProvider } from "./providers";

export interface StoragePluginOptions {
	provider: StorageProvider;
	uploadPath?: string; // Default: /upload
	defaultBucket?: string;
}

/**
 * File Storage Plugin
 */
export function storagePlugin(options: StoragePluginOptions): Plugin {
	const { provider, uploadPath = "/upload" } = options;

	return {
		id: "storage",
		options,
		init: () => {},
		endpoints: {
			// Generic upload endpoint
			uploadFile: createQueryEndpoint(
				uploadPath,
				{ method: "POST" },
				async (ctx) => {
					const req = (ctx as any).rawRequest || ctx.request;
					const formData = await req.formData();
					const file = formData.get("file");
					const path = formData.get("path") || "uploads";

					if (!file) throw new Error("No file provided");

					const result = await provider.upload({
						file,
						path: path.toString(),
						filename: (file as File).name,
					});

					return ctx.json(result);
				},
			),

			// Get signed URL
			getSignedUrl: createQueryEndpoint(
				`${uploadPath}/signed-url`,
				{
					method: "GET",
					query: z.object({ key: z.string() }) as any,
				},
				async (ctx) => {
					const { key } = ctx.query;
					const url = await provider.getSignedUrl(key);
					return ctx.json({ url });
				},
			),
		},
	};
}

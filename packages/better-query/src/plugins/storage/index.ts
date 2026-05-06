import { z } from "zod";
import { createCrudEndpoint } from "../../endpoints/crud-endpoint";
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
		init: () => {},
		endpoints: {
			// Generic upload endpoint
			uploadFile: createCrudEndpoint(
				uploadPath,
				{ method: "POST" },
				async (ctx) => {
					// In a real environment, we'd use ctx.request.formData()
					// This is a simplified demo of the plugin structure
					const formData = await (ctx.request as any).formData();
					const file = formData.get("file");
					const path = formData.get("path") || "uploads";

					if (!file) throw new Error("No file provided");

					const result = await provider.upload({
						file,
						path: path.toString(),
						filename: (file as File).name,
					});

					return ctx.json(result);
				}
			),

			// Get signed URL
			getSignedUrl: createCrudEndpoint(
				`${uploadPath}/signed-url`,
				{ 
					method: "GET",
					query: z.object({ key: z.string() })
				},
				async (ctx) => {
					const { key } = ctx.query;
					const url = await provider.getSignedUrl(key);
					return ctx.json({ url });
				}
			)
		}
	};
}

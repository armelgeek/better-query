import { QueryHookContext } from "../types";
import { Plugin } from "../types/plugins";

export interface CachePluginOptions {
	/** TTL in milliseconds (default: 5 minutes) */
	ttl?: number;
	/** Resources to cache (default: all) */
	resources?: string[];
}

/**
 * Smart Cache Plugin
 * Automatically caches read/list results and invalidates on write
 */
export function cachePlugin(options: CachePluginOptions = {}): Plugin {
	const { ttl = 5 * 60 * 1000, resources = [] } = options;
	const cache = new Map<string, { data: any; expiry: number }>();

	const getCacheKey = (ctx: QueryHookContext) => {
		return `${ctx.resource}:${ctx.operation}:${JSON.stringify(ctx.params || {})}`;
	};

	const shouldCache = (resource: string) => {
		return resources.length === 0 || resources.includes(resource);
	};

	const invalidate = (resource: string) => {
		for (const key of cache.keys()) {
			if (key.startsWith(`${resource}:`)) {
				cache.delete(key);
			}
		}
	};

	return {
		id: "cache",
		init: () => {},
		hooks: {
			// Check cache before reading
			beforeRead: async (ctx) => {
				if (!shouldCache(ctx.resource)) return;
				const key = getCacheKey(ctx);
				const cached = cache.get(key);
				if (cached && cached.expiry > Date.now()) {
					return cached.data; // Return cached data early
				}
			},
			beforeList: async (ctx) => {
				if (!shouldCache(ctx.resource)) return;
				const key = getCacheKey(ctx);
				const cached = cache.get(key);
				if (cached && cached.expiry > Date.now()) {
					return cached.data;
				}
			},

			// Store in cache after reading
			afterRead: async (ctx) => {
				if (!shouldCache(ctx.resource)) return;
				const key = getCacheKey(ctx);
				cache.set(key, { data: ctx.result, expiry: Date.now() + ttl });
			},
			afterList: async (ctx) => {
				if (!shouldCache(ctx.resource)) return;
				const key = getCacheKey(ctx);
				cache.set(key, { data: ctx.result, expiry: Date.now() + ttl });
			},

			// Invalidate cache on write
			afterCreate: async (ctx) => invalidate(ctx.resource),
			afterUpdate: async (ctx) => invalidate(ctx.resource),
			afterDelete: async (ctx) => invalidate(ctx.resource),
		}
	};
}

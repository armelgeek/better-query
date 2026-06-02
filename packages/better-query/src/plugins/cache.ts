import { QueryHookContext } from "../types";
import { Plugin } from "../types/plugins";

export interface CacheStore {
	get: (key: string) => Promise<any> | any;
	set: (key: string, value: any, ttl?: number) => Promise<void> | void;
	delete: (key: string) => Promise<void> | void;
	keys?: () => Promise<string[]> | string[];
}

export interface CachePluginOptions {
	/** TTL in milliseconds (default: 5 minutes) */
	ttl?: number;
	/** Resources to cache (default: all) */
	resources?: string[];
	/** Custom cache store (e.g. Redis, Keyv) */
	store?: CacheStore;
}

/**
 * Smart Cache Plugin
 * Automatically caches read/list results and invalidates on write.
 * Supports standard memory caching and pluggable distributed caches (like Redis).
 */
export function cachePlugin(options: CachePluginOptions = {}): Plugin {
	const { ttl = 5 * 60 * 1000, resources = [], store } = options;

	const memoryCache = new Map<string, { data: any; expiry: number }>();
	const activeKeys = new Set<string>();

	const defaultStore: CacheStore = {
		get: (key) => {
			const cached = memoryCache.get(key);
			if (cached && cached.expiry > Date.now()) {
				return cached.data;
			}
			if (cached) {
				memoryCache.delete(key);
				activeKeys.delete(key);
			}
			return null;
		},
		set: (key, value, customTtl) => {
			const expiry = Date.now() + (customTtl ?? ttl);
			memoryCache.set(key, { data: value, expiry });
			activeKeys.add(key);
		},
		delete: (key) => {
			memoryCache.delete(key);
			activeKeys.delete(key);
		},
		keys: () => Array.from(activeKeys),
	};

	const activeStore = store || defaultStore;

	const getCacheKey = (ctx: QueryHookContext) => {
		return `${ctx.resource}:${ctx.operation}:${JSON.stringify(
			ctx.params || {},
		)}`;
	};

	const shouldCache = (resource: string) => {
		return resources.length === 0 || resources.includes(resource);
	};

	const invalidate = async (resource: string) => {
		const prefix = `${resource}:`;
		if (activeStore.keys) {
			try {
				const allKeys = await activeStore.keys();
				for (const key of allKeys) {
					if (key.startsWith(prefix)) {
						await activeStore.delete(key);
					}
				}
			} catch (err) {
				console.error(
					`[Cache] Invalidation error for resource ${resource}:`,
					err,
				);
			}
		} else {
			for (const key of activeKeys) {
				if (key.startsWith(prefix)) {
					await activeStore.delete(key);
					activeKeys.delete(key);
				}
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
				try {
					const cachedData = await activeStore.get(key);
					if (cachedData !== null && cachedData !== undefined) {
						return cachedData;
					}
				} catch (err) {
					console.error(`[Cache] Error retrieving key ${key}:`, err);
				}
			},
			beforeList: async (ctx) => {
				if (!shouldCache(ctx.resource)) return;
				const key = getCacheKey(ctx);
				try {
					const cachedData = await activeStore.get(key);
					if (cachedData !== null && cachedData !== undefined) {
						return cachedData;
					}
				} catch (err) {
					console.error(`[Cache] Error retrieving key ${key}:`, err);
				}
			},

			// Store in cache after reading
			afterRead: async (ctx) => {
				if (!shouldCache(ctx.resource)) return;
				if (ctx.result === null || ctx.result === undefined) return;
				const key = getCacheKey(ctx);
				try {
					await activeStore.set(key, ctx.result, ttl);
					if (!store) {
						activeKeys.add(key);
					}
				} catch (err) {
					console.error(`[Cache] Error setting key ${key}:`, err);
				}
			},
			afterList: async (ctx) => {
				if (!shouldCache(ctx.resource)) return;
				if (ctx.result === null || ctx.result === undefined) return;
				const key = getCacheKey(ctx);
				try {
					await activeStore.set(key, ctx.result, ttl);
					if (!store) {
						activeKeys.add(key);
					}
				} catch (err) {
					console.error(`[Cache] Error setting key ${key}:`, err);
				}
			},

			// Invalidate cache on write
			afterCreate: async (ctx) => invalidate(ctx.resource),
			afterUpdate: async (ctx) => invalidate(ctx.resource),
			afterDelete: async (ctx) => invalidate(ctx.resource),
		},
	};
}

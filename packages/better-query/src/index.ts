export { betterQuery } from "./query";
export type { BetterQuery, BetterCrud } from "./query";

export { createClient, BetterLiveQuery, createLiveQuery } from "./client";
export type {
	BetterQueryClient as QueryClient,
	ClientOptions as QueryClientOptions,
	LiveQueryOptions,
	LiveQueryListener,
} from "./client";

export * from "./types";
export * from "./types/adapter";
export * from "./types/plugins";
export * from "./types/better-auth";
export * from "./types/client-plugins";

export { betterAuthProvider } from "./auth/better-auth";
export { jwtProvider } from "./auth/jwt";

export type { CustomOperation, CustomOperations } from "./types/adapter";

export * from "./plugins";

export { createResource, zodSchemaToFields } from "./utils/schema";
export { RelationshipManager } from "./utils/relationships";
export {
	SchemaMigrationManager,
	withSchemaVersion,
	createSchemaMigration,
} from "./utils/migrations";
export type {
	SchemaVersion,
	Migration,
	SchemaChange,
} from "./utils/migrations";

export * from "./schemas";

export * from "./schemas/relationships";

export { createQueryEndpoints, createQueryEndpoint } from "./endpoints";

export {
	createQueryEndpoints as createCrudEndpoints,
	createQueryEndpoint as createCrudEndpoint,
} from "./endpoints";

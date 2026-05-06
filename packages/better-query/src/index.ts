// Main export - the betterQuery factory function
export { betterQuery } from "./query";
export type { BetterQuery, BetterCrud, Adiemus } from "./query";

// Legacy exports for backward compatibility
export { betterQuery as adiemus } from "./query";
export { betterQuery as betterCrud } from "./query";

// Client
export { createClient } from "./client";
export type { BetterQueryClient as QueryClient, ClientOptions as QueryClientOptions } from "./client";

// Legacy client exports
export { createClient as createCrudClient } from "./client";
export type {
	BetterQueryClient as CrudClient,
	ClientOptions as CrudClientOptions,
} from "./client";

// Types
export * from "./types";
export * from "./types/adapter";
export * from "./types/plugins";
export * from "./types/better-auth";
export * from "./types/client-plugins";

// Export custom operations types specifically
export type { CustomOperation, CustomOperations } from "./types/adapter";

// Plugins
export * from "./plugins";

// Utils
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

// Schema helpers (no predefined schemas, just utilities)
export * from "./schemas";

// Relationship helpers
export * from "./schemas/relationships";

// Endpoints
export { createQueryEndpoints, createQueryEndpoint } from "./endpoints";

// Legacy endpoint exports
export {
	createQueryEndpoints as createCrudEndpoints,
	createQueryEndpoint as createCrudEndpoint,
} from "./endpoints";

// CLI exports (for programmatic use)
export { templateManager } from "./cli/templates";
export type { ProjectConfig } from "./cli/templates";

// Core plugin infrastructure
export { PluginManager } from "./manager";

// Plugin types
export type {
	QueryPlugin,
	PluginFactory,
	PluginHooks,
	PluginInitContext,
	PluginSchema,
	PluginOpenAPI,
	ExtendedQueryPlugin,
} from "../types/plugins";

// Built-in plugins
export { validationPlugin, ValidationError } from "./validation";
export type { ValidationPluginOptions } from "./validation";

export { cachePlugin } from "./cache";
export type { CachePluginOptions } from "./cache";

export { openApiPlugin } from "./openapi";
export type { OpenAPIPluginOptions } from "./openapi";

export { webhooks as webhookPlugin } from "./webhooks";
export type { WebhookOptions as WebhookPluginOptions } from "./webhooks";

export { historyPlugin } from "./history";
export type { HistoryPluginOptions } from "./history";

export { jobsPlugin, createJobHandler } from "./jobs";
export type {
	JobPluginOptions,
	JobDefinition,
	JobHistory,
	JobHandler,
	JobStatus,
	JobContext,
} from "./jobs";

export { betterAuthRLS } from "./better-auth-rls";
export type { BetterAuthRLSOptions } from "./better-auth-rls";

// export { adminPlugin } from "./admin";
// export type { AdminPluginOptions } from "./admin";

// Plugin utilities
export { createCrudEndpoint } from "../endpoints/crud-endpoint";

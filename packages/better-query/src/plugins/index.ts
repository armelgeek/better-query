// Core plugin infrastructure
export {
	PluginManager,
	shimPluginContext,
	createPlugin,
	defaultPluginManager,
} from "./manager";

// Plugin types
export type {
	Plugin,
	PluginFactory,
	PluginHooks,
	PluginInitContext,
	PluginSchema,
	PluginOpenAPI,
	ExtendedPlugin,
} from "../types/plugins";

// Built-in plugins
export { auditPlugin } from "./audit";
export type { AuditPluginOptions } from "./audit";
export type { AuditEvent as PluginAuditEvent } from "./audit";

export { validationPlugin, ValidationError } from "./validation";
export type { ValidationPluginOptions } from "./validation";

export { cachePlugin } from "./cache";
export type { CachePluginOptions } from "./cache";

export { openApiPlugin } from "./openapi";
export type { OpenAPIPluginOptions } from "./openapi";

export { storagePlugin } from "./storage";
export type { StoragePluginOptions } from "./storage";
export { LocalStorageProvider, S3StorageProvider } from "./storage/providers";

export { webhookPlugin } from "./webhooks";
export type { WebhookPluginOptions, WebhookConfig } from "./webhooks";

export { historyPlugin } from "./history";
export type { HistoryPluginOptions } from "./history";

export { realtimePlugin } from "./realtime";
export type {
	RealtimePluginOptions,
	RealtimeMessage,
} from "./realtime";

export { jobsPlugin, createJobHandler } from "./jobs";
export type {
	JobPluginOptions,
	JobDefinition,
	JobHistory,
	JobHandler,
	JobStatus,
	JobContext,
} from "./jobs";

// Plugin utilities
export { createCrudEndpoint } from "../endpoints/crud-endpoint";

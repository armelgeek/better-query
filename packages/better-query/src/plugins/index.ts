// Core plugin infrastructure
export {
	PluginManager,
	shimPluginContext,
	createPlugin,
	defaultPluginManager,
} from "./manager";

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

export { uploadPlugin } from "./upload";
export type { UploadPluginOptions } from "./upload";

export { webhooks as webhookPlugin } from "./webhooks";
export type { WebhookOptions as WebhookPluginOptions } from "./webhooks";

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

export { betterAuthRLS } from "./better-auth-rls";
export type { BetterAuthRLSOptions } from "./better-auth-rls";

export { mailPlugin } from "./mail";
export type { MailPluginOptions, MailPluginInstance } from "./mail";

// export { adminPlugin } from "./admin";
// export type { AdminPluginOptions } from "./admin";

// Plugin utilities
export { createCrudEndpoint } from "../endpoints/crud-endpoint";

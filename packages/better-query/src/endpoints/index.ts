import { createEndpointCreator, createMiddleware } from "better-call";
import { ZodObject, ZodSchema, ZodTypeAny, z } from "zod";
import { convertToQueryOrderBy, convertToQueryWhere } from "../adapters/utils";
import {
	IncludeOptions,
	PaginationResult,
	QueryContext,
	QueryHookContext,
	QueryMiddlewareContext,
	QueryParams,
	QueryPermissionContext,
	QueryResourceConfig,
} from "../types";
import { AuditLogger, HookExecutor } from "../utils/hooks";
import { capitalize, generateId } from "../utils/schema";
import { FilterBuilder, SearchBuilder } from "../utils/search";
import {
	checkEnhancedPermissions,
	checkOwnership,
	extractSecurityContext,
	hasRequiredScopes,
	rateLimiter,
	sanitizeFields,
	validateAndSanitizeInput,
} from "../utils/security";

/**
 * Create a flexible version of a Zod schema that allows string input for date fields
 * This enables hooks to transform date strings before final validation
 */
function createFlexibleSchema(schema: any, isPartial = false): ZodSchema {
	// If it's a ZodObject, we can inspect and modify its shape
	if (schema && schema._def && schema._def.typeName === "ZodObject") {
		const shape = typeof schema.shape === "object" ? schema.shape : schema._def.shape?.();
		const flexibleShape: Record<string, ZodTypeAny> = {};

		for (const [key, fieldSchema] of Object.entries(shape)) {
			const fieldSchemaAny = fieldSchema as any;

			// Check if this field is a date or optional date
			if (fieldSchemaAny._def?.typeName === "ZodDate") {
				// Replace date with union of string or date
				flexibleShape[key] = z.union([z.string(), z.date()]);
			} else if (
				fieldSchemaAny._def?.typeName === "ZodOptional" &&
				fieldSchemaAny._def?.innerType?._def?.typeName === "ZodDate"
			) {
				// Replace optional date with optional union of string or date
				flexibleShape[key] = z.union([z.string(), z.date()]).optional();
			} else {
				// Keep the original field schema
				flexibleShape[key] = fieldSchemaAny;
			}
		}

		const flexibleSchema = z.object(flexibleShape);
		return isPartial ? flexibleSchema.partial() : flexibleSchema;
	}

	// For non-object schemas, return as-is (with partial if requested)
	if (isPartial && "partial" in schema) {
		return (schema as any).partial();
	}
	return schema;
}

/**
 * Create Query-specific middleware that provides context
 */
export const queryContextMiddleware = createMiddleware(async (ctx) => {
	// Extract basic security context
	const securityContext = extractSecurityContext(ctx.request || ctx);
	const queryContext = (ctx as any).context as QueryContext;

	let user = securityContext.user;
	let session = securityContext.session;
	let resolvedSession: any = null;

	// Resolve session if auth configuration is provided
	const authConfig = queryContext?.options?.auth;
	if (authConfig) {
		try {
			// Priority 1: Auth Provider
			if (authConfig.provider?.getSession) {
				resolvedSession = await authConfig.provider.getSession({
					request: ctx.request as any,
				});
			}
			// Priority 2: Shortcut getSession
			else if (authConfig.getSession) {
				resolvedSession = await authConfig.getSession({
					request: ctx.request as any,
				});
			}

			if (resolvedSession) {
				// Handle both { user, session } and direct user object formats
				user =
					resolvedSession.user ||
					(resolvedSession.session ? resolvedSession.user : resolvedSession);
				session = resolvedSession.session || resolvedSession;
			}
		} catch (error) {
			console.error("[Auth] Failed to resolve session:", error);
		}
	}

	// Add security utilities and resolved user to context
	const enhancedContext = {
		...({} as QueryContext),
		user,
		session,
		impersonator: resolvedSession?.impersonator || null,
		security: {
			...securityContext,
			user,
			session,
			impersonator: resolvedSession?.impersonator || null,
		},
		rateLimiter,
		auditLogger: new AuditLogger(),
	};

	return enhancedContext;
});

// Legacy alias
export const crudContextMiddleware = queryContextMiddleware;

/**
 * Create Query endpoint creator with our middleware
 */
export const createQueryEndpoint = createEndpointCreator({
	use: [queryContextMiddleware],
});

// Legacy alias
export const createCrudEndpoint = createQueryEndpoint;

/**
 * Creates Query endpoints for a given resource
 */
export function createQueryEndpoints(
	resourceConfig: QueryResourceConfig,
	allResources?: QueryResourceConfig[],
) {
	const {
		name,
		schema,
		tableName,
		endpoints = {},
		policies = {},
		customEndpoints = {},
	} = resourceConfig;
	const actualTableName = tableName || name;

	// Default all endpoints to enabled
	const enabledEndpoints = {
		create: true,
		read: true,
		update: true,
		delete: true,
		list: true,
		...endpoints,
	};

	const queryEndpoints: Record<string, any> = {};

	// Enhanced helper function to check policies with scopes and RLS filters
	const checkPermission = async (
		operation: keyof typeof policies,
		context: QueryPermissionContext,
		config: QueryResourceConfig,
	): Promise<boolean | Record<string, any>> => {
		const policyFn = config.policies?.[operation];
		const requiredScopes = config.scopes?.[operation];
		const ownershipConfig = config.ownership;

		// 1. Check scopes first (fastest)
		if (requiredScopes && !hasRequiredScopes(context.scopes, requiredScopes)) {
			return false;
		}

		// 2. Check policy function
		let policyResult: boolean | Record<string, any> = true;
		if (policyFn) {
			try {
				policyResult = await policyFn(context);
				if (policyResult === false) return false;
			} catch (e) {
				console.error(
					`[Policy] Error executing policy for ${name}.${operation}:`,
					e,
				);
				return false;
			}
		}

		// 3. Check legacy ownership if policy didn't return a filter
		if (policyResult === true && ownershipConfig && context.existingData) {
			const isOwner = checkOwnership(
				context.user,
				context.existingData,
				ownershipConfig.field,
				ownershipConfig.strategy,
			);
			if (!isOwner) return false;
		}

		return policyResult;
	};

	// Helper to extract user from request/context
	const extractUser = (ctx: any): any => {
		return ctx.user || ctx.context?.user || ctx.request?.user || null;
	};

	// Helper to extract user scopes
	const extractUserScopes = (user: any): string[] => {
		return user?.scopes || user?.roles || [];
	};

	/**
	 * Apply global filters like multi-tenancy to where conditions
	 */
	const applyGlobalFilters = (
		where: Array<{ field: string; value: any; operator?: string }>,
		user: any,
	) => {
		// 1. Handle Multi-Tenancy
		if (resourceConfig.multiTenancy?.enabled) {
			const tenantField = resourceConfig.multiTenancy.field || "tenantId";
			const contextKey = resourceConfig.multiTenancy.contextKey || "tenantId";
			const tenantId = user?.[contextKey];

			if (tenantId) {
				// Avoid duplicate tenant filter
				const hasTenantFilter = where.some((w) => w.field === tenantField);
				if (!hasTenantFilter) {
					where.push({
						field: tenantField,
						value: tenantId,
						operator: "eq",
					});
				}
			}
		}

		// 2. Handle Soft Delete (Global)
		if (resourceConfig.softDelete?.enabled) {
			const softDeleteField = resourceConfig.softDelete.field || "deletedAt";
			const hasSoftDeleteFilter = where.some(
				(w) => w.field === softDeleteField,
			);
			if (!hasSoftDeleteFilter) {
				where.push({
					field: softDeleteField,
					value: null,
					operator: "eq",
				});
			}
		}

		return where;
	};

	// Helper function to parse include options from query parameters
	const parseIncludeOptions = (query?: any): IncludeOptions | undefined => {
		if (!query) return undefined;

		const include: IncludeOptions = {};

		if (query.include) {
			try {
				// Parse comma-separated include list
				include.include = query.include.split(",").map((s: string) => s.trim());
			} catch {
				// Ignore parsing errors
			}
		}

		if (query.select) {
			try {
				// Parse JSON select object
				include.select = JSON.parse(query.select);
			} catch {
				// Ignore parsing errors
			}
		}

		return Object.keys(include).length > 0 ? include : undefined;
	};

	// CREATE endpoint
	if (enabledEndpoints.create) {
		const createOpts = {
			method: "POST" as const,
			body: createFlexibleSchema(schema) as any,
			query: z
				.object({
					include: z.string().optional(),
					select: z.string().optional(),
				})
				.optional() as any,
		};
		const createHandlerFn = async (ctx: any) => {
			const { body, context, query } = ctx;
			const { adapter } = context;

			// Extract user and security context
			let user = extractUser(ctx);
			let userScopes = extractUserScopes(user);
			const securityContext = extractSecurityContext(ctx.request || ctx);

			// Execute middleware BEFORE permission checks - they can modify user and context
			const middlewareContext: QueryMiddlewareContext = {
				user,
				resource: name,
				operation: "create",
				data: body,
				request: ctx,
				scopes: userScopes,
			};

			// Execute resource-level middleware
			if (resourceConfig.middlewares) {
				try {
					for (const middleware of resourceConfig.middlewares) {
						await middleware.handler(middlewareContext);
					}
					// Update user and scopes from middleware modifications
					user = middlewareContext.user;
					userScopes = middlewareContext.scopes || [];
				} catch (error) {
					return ctx.json(
						{
							error: "Middleware execution failed",
							details: error instanceof Error ? error.message : String(error),
						},
						{ status: 500 },
					);
				}
			}

			// Execute before hooks AFTER middleware but before permission checks
			const hookContext: QueryHookContext = {
				user,
				resource: name,
				operation: "create",
				data: middlewareContext.data,
				request: ctx.request,
				adapter,
				context,
			};

			try {
				await HookExecutor.executeBefore(resourceConfig.hooks, hookContext);
			} catch (error) {
				return ctx.json(
					{
						error: "Hook execution failed",
						details: error instanceof Error ? error.message : String(error),
					},
					{ status: 500 },
				);
			}

			// Use potentially modified data from hooks
			let data = hookContext.data;

			// Rate limiting check
			if (context.security?.rateLimit) {
				const rateLimitKey = `${
					securityContext.ipAddress || "unknown"
				}-create-${name}`;
				const isAllowed = rateLimiter.isAllowed(
					rateLimitKey,
					context.security.rateLimit.windowMs,
					context.security.rateLimit.max,
				);

				if (!isAllowed) {
					return ctx.json({ error: "Rate limit exceeded" }, { status: 429 });
				}
			}

			// Enhanced validation and sanitization
			const sanitizationRules = resourceConfig.sanitization?.global || [];
			const validation = validateAndSanitizeInput(
				schema,
				data,
				sanitizationRules,
			);

			if (!validation.success) {
				return ctx.json(
					{ error: "Validation failed", details: validation.errors },
					{ status: 400 },
				);
			}

			data = validation.data;

			// Apply field-specific sanitization
			if (resourceConfig.sanitization?.fields) {
				data = sanitizeFields(data, resourceConfig.sanitization.fields);
			}

			// Check permissions with enhanced context
			const permissionContext: QueryPermissionContext = {
				user,
				resource: name,
				operation: "create",
				data,
				request: ctx,
				scopes: userScopes,
			};

			const hasPermission = await checkPermission(
				"create",
				permissionContext,
				resourceConfig,
			);
			if (!hasPermission) {
				return ctx.json({ error: "Forbidden" }, { status: 403 });
			}

			// Generate ID if not present
			// The id field is auto-added by the adapter even if not in the user's Zod schema,
			// so we always generate one when missing.
			if (!data.id) {
				data.id = generateId();
			}

			// Automatically set tenantId if multiTenancy is enabled
			if (resourceConfig.multiTenancy?.enabled) {
				const field = resourceConfig.multiTenancy.field || "tenantId";
				const contextKey =
					resourceConfig.multiTenancy.contextKey || "tenantId";
				if (user?.[contextKey] && !data[field]) {
					data[field] = user[contextKey];
				}
			}

			// Update hook context with final data
			hookContext.data = data;

			// Parse include options
			const include = parseIncludeOptions(query);

			try {
				const result = await adapter.create({
					model: actualTableName,
					data,
					include,
				});

				// Execute after hooks
				hookContext.result = result;
				await HookExecutor.executeAfter(resourceConfig.hooks, hookContext);

				// Log audit event
				if (context.auditLogger) {
					await context.auditLogger.logFromContext(
						hookContext,
						undefined,
						result,
					);
				}

				return ctx.json(result, { status: 201 });
			} catch (error) {
				console.error("Error creating resource:", error);
				return ctx.json(
					{
						error: "Failed to create resource",
						details: error instanceof Error ? error.message : String(error),
					},
					{ status: 500 },
				);
			}
		};

		queryEndpoints[`${name}.create`] = createQueryEndpoint(
			`/${name}/create`,
			createOpts,
			createHandlerFn,
		);
		queryEndpoints[`${name}.createClean`] = createQueryEndpoint(
			`/${name}`,
			createOpts,
			createHandlerFn,
		);
	}

	// READ endpoint
	if (enabledEndpoints.read) {
		const readOpts = {
			method: "GET" as const,
			params: z.object({
				id: z.string(),
			}) as any,
			query: z
				.object({
					include: z.string().optional(),
					select: z.string().optional(),
				})
				.optional() as any,
		};
		const readHandlerFn = async (ctx: any) => {
			const { params, context, query } = ctx;
			const { adapter } = context;
			const { id } = params;

			// Extract user and security context
			let user = extractUser(ctx);
			let userScopes = extractUserScopes(user);

			// Execute middleware BEFORE permission checks - they can modify user and context
			const middlewareContext: QueryMiddlewareContext = {
				user,
				resource: name,
				operation: "read",
				id,
				request: ctx,
				scopes: userScopes,
			};

			// Execute resource-level middleware
			if (resourceConfig.middlewares) {
				try {
					for (const middleware of resourceConfig.middlewares) {
						await middleware.handler(middlewareContext);
					}
					// Update user and scopes from middleware modifications
					user = middlewareContext.user;
					userScopes = middlewareContext.scopes || [];
				} catch (error) {
					return ctx.json(
						{
							error: "Middleware execution failed",
							details: error instanceof Error ? error.message : String(error),
						},
						{ status: 500 },
					);
				}
			}

			// Execute before hooks AFTER middleware for read operations
			const hookContext: QueryHookContext = {
				user,
				resource: name,
				operation: "read",
				id,
				request: ctx.request,
				adapter,
				context,
			};

			try {
				await HookExecutor.executeBefore(resourceConfig.hooks, hookContext);
			} catch (error) {
				return ctx.json(
					{
						error: "Hook execution failed",
						details: error instanceof Error ? error.message : String(error),
					},
					{ status: 500 },
				);
			}

			// Parse include options
			const include = parseIncludeOptions(query);

			// 1. Pre-fetch permission check (to see if we can apply RLS filters)
			const prePermissionContext: QueryPermissionContext = {
				user,
				resource: name,
				operation: "read",
				id,
				request: ctx,
				scopes: userScopes,
			};

			const prePermissionResult = await checkPermission(
				"read",
				prePermissionContext,
				resourceConfig,
			);

			if (prePermissionResult === false) {
				return ctx.json({ error: "Forbidden" }, { status: 403 });
			}

			const policyFilter =
				typeof prePermissionResult === "object" ? prePermissionResult : {};

			try {
				// Build where clause with ID, policy filters, and global filters
				let whereConditions: Array<{
					field: string;
					value: any;
					operator?: string;
				}> = [{ field: "id", value: id }];
				for (const [field, value] of Object.entries(policyFilter)) {
					whereConditions.push({ field, value, operator: "eq" });
				}

				// Apply global filters (Multi-Tenancy, Soft Delete)
				whereConditions = applyGlobalFilters(whereConditions, user);

				const result = await adapter.findFirst({
					model: actualTableName,
					where: convertToQueryWhere(whereConditions),
					include,
				});

				if (!result) {
					// If we had policy filters, it might be a 403 masquerading as a 404
					return ctx.json({ error: "Resource not found" }, { status: 404 });
				}

				// 2. Post-fetch permission check (for data-dependent policies)
				const postPermissionContext: QueryPermissionContext = {
					...prePermissionContext,
					existingData: result,
				};

				const postPermissionResult = await checkPermission(
					"read",
					postPermissionContext,
					resourceConfig,
				);

				if (postPermissionResult === false) {
					return ctx.json({ error: "Forbidden" }, { status: 403 });
				}

				// Execute after hooks
				hookContext.result = result;
				await HookExecutor.executeAfter(resourceConfig.hooks, hookContext);

				return ctx.json(result);
			} catch (error) {
				console.error("Error fetching resource:", error);
				return ctx.json(
					{
						error: "Failed to fetch resource",
						details: error instanceof Error ? error.message : String(error),
					},
					{ status: 500 },
				);
			}
		};

		queryEndpoints[`${name}.get`] = createQueryEndpoint(
			`/${name}/get/:id`,
			readOpts,
			readHandlerFn,
		);
		queryEndpoints[`${name}.getClean`] = createQueryEndpoint(
			`/${name}/:id`,
			readOpts,
			readHandlerFn,
		);
	}

	// UPDATE endpoint
	if (enabledEndpoints.update) {
		const updateOpts = {
			method: "PATCH" as const,
			params: z.object({
				id: z.string(),
			}) as any,
			body: createFlexibleSchema(schema, true) as any,
		};
		const updateHandlerFn = async (ctx: any) => {
			const { params, body, context } = ctx;
			const { adapter } = context;
			const { id } = params;

			// Extract user and security context
			let user = extractUser(ctx);
			let userScopes = extractUserScopes(user);

			// 1. Pre-fetch permission check
			const prePermissionContext: QueryPermissionContext = {
				user,
				resource: name,
				operation: "update",
				id,
				data: body,
				request: ctx,
				scopes: userScopes,
			};

			const prePermissionResult = await checkPermission(
				"update",
				prePermissionContext,
				resourceConfig,
			);

			if (prePermissionResult === false) {
				return ctx.json({ error: "Forbidden" }, { status: 403 });
			}

			const policyFilter =
				typeof prePermissionResult === "object" ? prePermissionResult : {};

			// Apply global filters (Multi-Tenancy, Soft Delete)
			// Build where clause with ID and policy filters
			const whereConditions: Array<{
				field: string;
				value: any;
				operator?: string;
			}> = [{ field: "id", value: id }];
			for (const [field, value] of Object.entries(policyFilter)) {
				whereConditions.push({ field, value, operator: "eq" });
			}

			const finalWhereConditions = applyGlobalFilters(
				[...whereConditions],
				user,
			);

			const existing = await adapter.findFirst({
				model: actualTableName,
				where: convertToQueryWhere(finalWhereConditions),
			});

			if (!existing) {
				return ctx.json({ error: "Resource not found" }, { status: 404 });
			}

			// 2. Post-fetch permission check
			const postPermissionContext: QueryPermissionContext = {
				...prePermissionContext,
				existingData: existing,
			};

			const postPermissionResult = await checkPermission(
				"update",
				postPermissionContext,
				resourceConfig,
			);

			if (postPermissionResult === false) {
				return ctx.json({ error: "Forbidden" }, { status: 403 });
			}

			// Execute middleware BEFORE hooks
			const middlewareContext: QueryMiddlewareContext = {
				user,
				resource: name,
				operation: "update",
				id,
				data: body,
				existingData: existing,
				request: ctx,
				scopes: userScopes,
			};

			// Execute resource-level middleware
			if (resourceConfig.middlewares) {
				try {
					for (const middleware of resourceConfig.middlewares) {
						await middleware.handler(middlewareContext);
					}
					// Update user and scopes from middleware modifications
					user = middlewareContext.user;
					userScopes = middlewareContext.scopes || [];
				} catch (error) {
					return ctx.json(
						{
							error: "Middleware execution failed",
							details: error instanceof Error ? error.message : String(error),
						},
						{ status: 500 },
					);
				}
			}

			// Execute before hooks AFTER middleware - they can modify data
			const hookContext: QueryHookContext = {
				user,
				resource: name,
				operation: "update",
				id,
				data: middlewareContext.data, // Use data potentially modified by middleware
				existingData: existing,
				request: ctx.request,
				adapter,
				context,
			};

			try {
				await HookExecutor.executeBefore(resourceConfig.hooks, hookContext);
			} catch (error) {
				return ctx.json(
					{
						error: "Hook execution failed",
						details: error instanceof Error ? error.message : String(error),
					},
					{ status: 500 },
				);
			}

			// Use potentially modified data from hooks
			let data = hookContext.data;

			// Enhanced validation and sanitization
			const sanitizationRules = resourceConfig.sanitization?.global || [];
			const validation = validateAndSanitizeInput(
				(schema as ZodObject<any>).partial(),
				data,
				sanitizationRules,
			);

			if (!validation.success) {
				return ctx.json(
					{ error: "Validation failed", details: validation.errors },
					{ status: 400 },
				);
			}

			data = validation.data;

			// Apply field-specific sanitization
			if (resourceConfig.sanitization?.fields) {
				data = sanitizeFields(data, resourceConfig.sanitization.fields);
			}

			// Update hook context with final data
			hookContext.data = data;

			try {
				const result = await adapter.update({
					model: actualTableName,
					where: convertToQueryWhere([{ field: "id", value: id }]),
					data,
				});

				// Execute after hooks
				hookContext.result = result;
				await HookExecutor.executeAfter(resourceConfig.hooks, hookContext);

				// Log audit event
				if (context.auditLogger) {
					await context.auditLogger.logFromContext(
						hookContext,
						existing,
						result,
					);
				}

				return ctx.json(result);
			} catch (error) {
				console.error("Error updating resource:", error);
				return ctx.json(
					{
						error: "Failed to update resource",
						details: error instanceof Error ? error.message : String(error),
					},
					{ status: 500 },
				);
			}
		};

		queryEndpoints[`${name}.update`] = createQueryEndpoint(
			`/${name}/update/:id`,
			updateOpts,
			updateHandlerFn,
		);
		queryEndpoints[`${name}.updateClean`] = createQueryEndpoint(
			`/${name}/:id`,
			updateOpts,
			updateHandlerFn,
		);
	}

	// DELETE endpoint
	if (enabledEndpoints.delete) {
		const deleteOpts = {
			method: "DELETE" as const,
			params: z.object({
				id: z.string(),
			}) as any,
		};
		const deleteHandlerFn = async (ctx: any) => {
			const { params, context } = ctx;
			const { adapter } = context;
			const { id } = params;

			// Extract user and security context
			let user = extractUser(ctx);
			let userScopes = extractUserScopes(user);

			// 1. Pre-fetch permission check
			const prePermissionContext: QueryPermissionContext = {
				user,
				resource: name,
				operation: "delete",
				id,
				request: ctx,
				scopes: userScopes,
			};

			const prePermissionResult = await checkPermission(
				"delete",
				prePermissionContext,
				resourceConfig,
			);

			if (prePermissionResult === false) {
				return ctx.json({ error: "Forbidden" }, { status: 403 });
			}

			const policyFilter =
				typeof prePermissionResult === "object" ? prePermissionResult : {};
			// Build where clause with ID and policy filters
			const whereConditions: Array<{
				field: string;
				value: any;
				operator?: string;
			}> = [{ field: "id", value: id }];
			for (const [field, value] of Object.entries(policyFilter)) {
				whereConditions.push({ field, value, operator: "eq" });
			}

			// Apply global filters (Multi-Tenancy, Soft Delete)
			const finalWhereConditions = applyGlobalFilters(
				[...whereConditions],
				user,
			);

			const existing = await adapter.findFirst({
				model: actualTableName,
				where: convertToQueryWhere(finalWhereConditions),
			});

			if (!existing) {
				return ctx.json({ error: "Resource not found" }, { status: 404 });
			}

			// 2. Post-fetch permission check
			const postPermissionContext: QueryPermissionContext = {
				...prePermissionContext,
				existingData: existing,
			};

			const postPermissionResult = await checkPermission(
				"delete",
				postPermissionContext,
				resourceConfig,
			);

			if (postPermissionResult === false) {
				return ctx.json({ error: "Forbidden" }, { status: 403 });
			}

			// Execute middleware BEFORE hooks
			const middlewareContext: QueryMiddlewareContext = {
				user,
				resource: name,
				operation: "delete",
				id,
				existingData: existing,
				request: ctx,
				scopes: userScopes,
			};

			// Execute resource-level middleware
			if (resourceConfig.middlewares) {
				try {
					for (const middleware of resourceConfig.middlewares) {
						await middleware.handler(middlewareContext);
					}
					// Update user and scopes from middleware modifications
					user = middlewareContext.user;
					userScopes = middlewareContext.scopes || [];
				} catch (error) {
					return ctx.json(
						{
							error: "Middleware execution failed",
							details: error instanceof Error ? error.message : String(error),
						},
						{ status: 500 },
					);
				}
			}

			// Execute before hooks AFTER middleware
			const hookContext: QueryHookContext = {
				user,
				resource: name,
				operation: "delete",
				id,
				existingData: existing,
				request: ctx.request,
				adapter,
				context,
			};

			try {
				await HookExecutor.executeBefore(resourceConfig.hooks, hookContext);
			} catch (error) {
				return ctx.json(
					{
						error: "Hook execution failed",
						details: error instanceof Error ? error.message : String(error),
					},
					{ status: 500 },
				);
			}

			// Check permissions with enhanced context including existing data
			const permissionContext: QueryPermissionContext = {
				user,
				resource: name,
				operation: "delete",
				id,
				existingData: existing,
				request: ctx,
				scopes: userScopes,
			};

			const hasPermission = await checkPermission(
				"delete",
				permissionContext,
				resourceConfig,
			);
			if (!hasPermission) {
				return ctx.json({ error: "Forbidden" }, { status: 403 });
			}

			try {
				await adapter.delete({
					model: actualTableName,
					where: convertToQueryWhere([{ field: "id", value: id }]),
				});

				// Execute after hooks
				await HookExecutor.executeAfter(resourceConfig.hooks, hookContext);

				// Log audit event
				if (context.auditLogger) {
					await context.auditLogger.logFromContext(
						hookContext,
						existing,
						undefined,
					);
				}

				return ctx.json({ success: true });
			} catch (error) {
				console.error("Error deleting resource:", error);
				return ctx.json(
					{
						error: "Failed to delete resource",
						details: error instanceof Error ? error.message : String(error),
					},
					{ status: 500 },
				);
			}
		};

		queryEndpoints[`${name}.delete`] = createQueryEndpoint(
			`/${name}/delete/:id`,
			deleteOpts,
			deleteHandlerFn,
		);
		queryEndpoints[`${name}.deleteClean`] = createQueryEndpoint(
			`/${name}/:id`,
			deleteOpts,
			deleteHandlerFn,
		);
	}

	// LIST endpoint with advanced search and filtering
	if (enabledEndpoints.list) {
		const listOpts = {
			method: "GET" as const,
			query: z.object({
				page: z
					.string()
					.optional()
					.transform((val) => (val ? parseInt(val) : 1)),
				limit: z
					.string()
					.optional()
					.transform((val) => (val ? parseInt(val) : 10)),
				search: z.string().optional(),
				q: z.string().optional(), // Alternative search parameter
				searchFields: z.string().optional(), // Comma-separated list of fields to search
				sortBy: z.string().optional(),
				sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
				include: z.string().optional(),
				select: z.string().optional(),
				filters: z.string().optional(), // JSON string of advanced filters
				where: z.string().optional(), // JSON string of where conditions
				dateRange: z.string().optional(), // JSON string for date range filtering
			}) as any,
		};
		const listHandlerFn = async (ctx: any) => {
			const { query, context } = ctx;
			const { adapter } = context;

			// Extract user and security context
			let user = extractUser(ctx);
			let userScopes = extractUserScopes(user);

			// Execute middleware BEFORE permission checks - they can modify user and context
			const middlewareContext: QueryMiddlewareContext = {
				user,
				resource: name,
				operation: "list",
				request: ctx,
				scopes: userScopes,
			};

			// Execute resource-level middleware
			if (resourceConfig.middlewares) {
				try {
					for (const middleware of resourceConfig.middlewares) {
						await middleware.handler(middlewareContext);
					}
					// Update user and scopes from middleware modifications
					user = middlewareContext.user;
					userScopes = middlewareContext.scopes || [];
				} catch (error) {
					return ctx.json(
						{
							error: "Middleware execution failed",
							details: error instanceof Error ? error.message : String(error),
						},
						{ status: 500 },
					);
				}
			}

			// Execute before hooks AFTER middleware for list operations
			const hookContext: QueryHookContext = {
				user,
				resource: name,
				operation: "list",
				request: ctx.request,
				adapter,
				context,
				params: query,
			};

			try {
				await HookExecutor.executeBefore(resourceConfig.hooks, hookContext);
			} catch (error) {
				return ctx.json(
					{
						error: "Hook execution failed",
						details: error instanceof Error ? error.message : String(error),
					},
					{ status: 500 },
				);
			}

			// Build enhanced query parameters with proper typing
			const enhancedQuery: QueryParams = {
				...query,
				include: query.include
					? SearchBuilder.parseStringArray(query.include)
					: undefined,
				searchFields: SearchBuilder.parseStringArray(query.searchFields),
				filters: SearchBuilder.parseJSON(query.filters),
				where: SearchBuilder.parseJSON(query.where),
				dateRange: SearchBuilder.parseJSON(query.dateRange),
				// Handle select field appropriately
				select: query.select
					? typeof query.select === "string"
						? SearchBuilder.parseJSON(query.select)
						: query.select
					: undefined,
			};

			// Check permissions with enhanced context
			const permissionContext: QueryPermissionContext = {
				user,
				resource: name,
				operation: "list",
				request: ctx,
				scopes: userScopes,
			};

			const permissionResult = await checkPermission(
				"list",
				permissionContext,
				resourceConfig,
			);
			if (permissionResult === false) {
				return ctx.json({ error: "Forbidden" }, { status: 403 });
			}

			// Extract policy filter if any
			const policyFilter =
				typeof permissionResult === "object" ? permissionResult : {};

			try {
				// Build search conditions
				const searchConditions = SearchBuilder.buildSearchConditions(
					enhancedQuery,
					resourceConfig.search,
				);

				// Build pagination
				const { page, limit, offset } =
					SearchBuilder.buildPagination(enhancedQuery);

				// Build ordering
				const orderBy = SearchBuilder.buildOrderBy(enhancedQuery);

				// Build include options
				const includeOptions =
					SearchBuilder.buildIncludeOptions(enhancedQuery);

				// Combine conditions: search + policy filter + ownership
				let whereConditions: Array<{
					field: string;
					value: any;
					operator?: string;
				}> = [...searchConditions];

				// Add policy filter
				for (const [field, value] of Object.entries(policyFilter)) {
					whereConditions.push({
						field,
						value,
						operator: "eq",
					});
				}

				if (resourceConfig.ownership && user) {
					const ownershipField = resourceConfig.ownership.field;
					const userId = user.id || user.userId;

					// If strategy is flexible, allow users to see their own data plus admin access
					if (resourceConfig.ownership.strategy === "flexible") {
						const isAdmin = hasRequiredScopes(userScopes, [
							"admin",
							"super_admin",
						]);
						if (!isAdmin) {
							whereConditions.push({
								field: ownershipField,
								value: userId,
								operator: "eq",
							});
						}
					} else {
						// Strict ownership - only show user's own data
						whereConditions.push({
							field: ownershipField,
							value: userId,
							operator: "eq",
						});
					}
				}

				// Get total count for pagination
				const total = await adapter.count({
					model: actualTableName,
					where: convertToQueryWhere(whereConditions),
				});

				// Get items
				const items = await adapter.findMany({
					model: actualTableName,
					where: convertToQueryWhere(whereConditions),
					limit,
					offset,
					orderBy: convertToQueryOrderBy(orderBy),
					include: includeOptions,
				});

				const totalPages = Math.ceil(total / limit);

				const result: PaginationResult<any> = {
					items,
					pagination: {
						page,
						limit,
						total,
						totalPages,
						hasNext: page < totalPages,
						hasPrev: page > 1,
					},
				};

				// Execute after hooks
				hookContext.result = result;
				await HookExecutor.executeAfter(resourceConfig.hooks, hookContext);

				return ctx.json(result);
			} catch (error) {
				console.error("Error fetching resources:", error);
				return ctx.json(
					{
						error: "Failed to fetch resources",
						details: error instanceof Error ? error.message : String(error),
					},
					{ status: 500 },
				);
			}
		};

		queryEndpoints[`${name}.list`] = createQueryEndpoint(
			`/${name}/list`,
			listOpts,
			listHandlerFn,
		);
		queryEndpoints[`${name}.listClean`] = createQueryEndpoint(
			`/${name}`,
			listOpts,
			listHandlerFn,
		);
	}

	// Merge custom actions
	if (resourceConfig.actions) {
		for (const [actionName, actionConfig] of Object.entries(
			resourceConfig.actions,
		)) {
			const actionEndpoint = createQueryEndpoint(
				`/${name}/${actionName}`,
				{ method: actionConfig.method || "POST" },
				async (ctx) => {
					const queryContext = (ctx as any).context as QueryContext;
					const adapter = queryContext.adapter;
					const security = (ctx as any).security;
					const user = security?.user;

					// Check action-level permission
					if (actionConfig.permission) {
						const isAuthorized = await actionConfig.permission({
							user,
							resource: name,
							operation: "action" as any,
							request: ctx.request,
						});
						if (!isAuthorized) {
							return ctx.json({ error: "Unauthorized" }, { status: 403 });
						}
					}

					try {
						// Execute action handler with full context
						const result = await actionConfig.handler({
							resource: name,
							operation: "action" as any,
							params: (ctx as any).body || ctx.query,
							context: queryContext,
							user,
							adapter,
						} as any);

						// Automatically broadcast action event
						queryContext.broadcast({
							type: "data_change",
							channel: `resource:${name}`,
							payload: {
								action: actionName,
								resource: name,
								result,
								user: user ? { id: user.id, email: user.email } : null,
							},
						});

						return ctx.json(result);
					} catch (error) {
						return ctx.json(
							{
								error: "Action failed",
								details: error instanceof Error ? error.message : String(error),
							},
							{ status: 500 },
						);
					}
				},
			);
			queryEndpoints[`${actionName}${capitalize(name)}`] = actionEndpoint;
		}
	}

	// RELATIONSHIP endpoints
	const relationshipsEndpointsConfig = resourceConfig.relationshipsEndpoints;
	if (relationshipsEndpointsConfig !== false && resourceConfig.relationships && allResources) {
		for (const [relationName, relationConfig] of Object.entries(
			resourceConfig.relationships,
		)) {
			if (
				relationConfig.type === "hasMany" ||
				relationConfig.type === "belongsToMany" ||
				relationConfig.type === "hasOne"
			) {
				const targetResourceName = relationConfig.target;
				const targetResource = allResources.find(
					(r) => r.name === targetResourceName,
				);
				if (!targetResource) continue;

				// Check if this relation is specifically enabled/disabled
				const isListEnabled =
					typeof relationshipsEndpointsConfig === "object"
						? relationshipsEndpointsConfig[relationName]?.list !== false
						: true;

				const isCreateEnabled =
					typeof relationshipsEndpointsConfig === "object"
						? relationshipsEndpointsConfig[relationName]?.create !== false
						: true;

				const foreignKey = relationConfig.foreignKey || `${name}Id`;
				const targetTableName = targetResource.tableName || targetResource.name;

				// 1. GET relationship list endpoint
				if (isListEnabled) {
					const listOpts = {
						method: "GET" as const,
						query: z.object({
							page: z
								.string()
								.optional()
								.transform((val) => (val ? parseInt(val) : 1)),
							limit: z
								.string()
								.optional()
								.transform((val) => (val ? parseInt(val) : 10)),
							search: z.string().optional(),
							q: z.string().optional(),
							searchFields: z.string().optional(),
							sortBy: z.string().optional(),
							sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
							include: z.string().optional(),
							select: z.string().optional(),
							filters: z.string().optional(),
							where: z.string().optional(),
							dateRange: z.string().optional(),
						}) as any,
					};

					const listHandlerFn = async (ctx: any) => {
						const { query, context, params } = ctx;
						const { adapter } = context;
						const { parentId } = params;

						// Extract user and security context
						let user = extractUser(ctx);
						let userScopes = extractUserScopes(user);

						// Execute middleware BEFORE permission checks of target resource
						const middlewareContext: QueryMiddlewareContext = {
							user,
							resource: targetResource.name,
							operation: "list",
							request: ctx,
							scopes: userScopes,
						};

						if (targetResource.middlewares) {
							try {
								for (const middleware of targetResource.middlewares) {
									await middleware.handler(middlewareContext);
								}
								user = middlewareContext.user;
								userScopes = middlewareContext.scopes || [];
							} catch (error) {
								return ctx.json(
									{
										error: "Middleware execution failed",
										details: error instanceof Error ? error.message : String(error),
									},
									{ status: 500 },
								);
							}
						}

						// Execute before hooks of target resource
						const hookContext: QueryHookContext = {
							user,
							resource: targetResource.name,
							operation: "list",
							request: ctx.request,
							adapter,
							context,
							params: query,
						};

						if (targetResource.hooks) {
							try {
								await HookExecutor.executeBefore(targetResource.hooks, hookContext);
							} catch (error) {
								return ctx.json(
									{
										error: "Hook execution failed",
										details: error instanceof Error ? error.message : String(error),
									},
									{ status: 500 },
								);
							}
						}

						// Build enhanced query parameters
						const enhancedQuery: QueryParams = {
							...query,
							include: query.include
								? SearchBuilder.parseStringArray(query.include)
								: undefined,
							searchFields: SearchBuilder.parseStringArray(query.searchFields),
							filters: SearchBuilder.parseJSON(query.filters),
							where: SearchBuilder.parseJSON(query.where),
							dateRange: SearchBuilder.parseJSON(query.dateRange),
							select: query.select
								? typeof query.select === "string"
									? SearchBuilder.parseJSON(query.select)
									: query.select
								: undefined,
						};

						// Check permissions of target resource
						const permissionContext: QueryPermissionContext = {
							user,
							resource: targetResource.name,
							operation: "list",
							request: ctx,
							scopes: userScopes,
						};

						const permissionResult = await checkPermission(
							"list",
							permissionContext,
							targetResource,
						);
						if (permissionResult === false) {
							return ctx.json({ error: "Forbidden" }, { status: 403 });
						}

						const policyFilter =
							typeof permissionResult === "object" ? permissionResult : {};

						try {
							const searchConditions = SearchBuilder.buildSearchConditions(
								enhancedQuery,
								targetResource.search,
							);

							const { page, limit, offset } =
								SearchBuilder.buildPagination(enhancedQuery);

							const orderBy = SearchBuilder.buildOrderBy(enhancedQuery);
							const includeOptions = SearchBuilder.buildIncludeOptions(enhancedQuery);

							// Combine conditions: search + policy filter + foreign key + ownership
							let whereConditions: Array<{
								field: string;
								value: any;
								operator?: string;
							}> = [...searchConditions];

							// Push parent relation filter
							whereConditions.push({
								field: foreignKey,
								value: parentId,
								operator: "eq",
							});

							for (const [field, value] of Object.entries(policyFilter)) {
								whereConditions.push({
									field,
									value,
									operator: "eq",
								});
							}

							// Apply global filters of target resource
							const finalWhereConditions = applyGlobalFilters(
								[...whereConditions],
								user,
							);

							const total = await adapter.count({
								model: targetTableName,
								where: convertToQueryWhere(finalWhereConditions),
							});

							const items = await adapter.findMany({
								model: targetTableName,
								where: convertToQueryWhere(finalWhereConditions),
								limit,
								offset,
								orderBy: convertToQueryOrderBy(orderBy),
								include: includeOptions,
							});

							const totalPages = Math.ceil(total / limit);

							const result: PaginationResult<any> = {
								items,
								pagination: {
									page,
									limit,
									total,
									totalPages,
									hasNext: page < totalPages,
									hasPrev: page > 1,
								},
							};

							hookContext.result = result;
							if (targetResource.hooks) {
								await HookExecutor.executeAfter(targetResource.hooks, hookContext);
							}

							return ctx.json(result);
						} catch (error) {
							console.error("Error fetching related resources:", error);
							return ctx.json(
								{
									error: "Failed to fetch related resources",
									details: error instanceof Error ? error.message : String(error),
								},
								{ status: 500 },
							);
						}
					};

					queryEndpoints[`${name}.${relationName}.list`] = createQueryEndpoint(
						`/${name}/:parentId/${relationName}`,
						listOpts,
						listHandlerFn,
					);
				}

				// 2. POST relationship create endpoint
				if (isCreateEnabled) {
					const createOpts = {
						method: "POST" as const,
						body: createFlexibleSchema(targetResource.schema) as any,
					};

					const createHandlerFn = async (ctx: any) => {
						const { body, context, params } = ctx;
						const { adapter } = context;
						const { parentId } = params;

						// Extract user and security context
						let user = extractUser(ctx);
						let userScopes = extractUserScopes(user);

						// Inject target foreign key value from URL parameter
						const finalBody = {
							...body,
							[foreignKey]: parentId,
						};

						// Enhanced validation and sanitization
						const sanitizationRules = targetResource.sanitization?.global || [];
						const validation = validateAndSanitizeInput(
							targetResource.schema,
							finalBody,
							sanitizationRules,
						);

						if (!validation.success) {
							return ctx.json(
								{ error: "Validation failed", details: validation.errors },
								{ status: 400 },
							);
						}

						let data = validation.data;

						// Apply field-specific sanitization
						if (targetResource.sanitization?.fields) {
							data = sanitizeFields(data, targetResource.sanitization.fields);
						}

						// Execute middleware of target resource
						const middlewareContext: QueryMiddlewareContext = {
							user,
							resource: targetResource.name,
							operation: "create",
							data,
							request: ctx,
							scopes: userScopes,
						};

						if (targetResource.middlewares) {
							try {
								for (const middleware of targetResource.middlewares) {
									await middleware.handler(middlewareContext);
								}
								user = middlewareContext.user;
								userScopes = middlewareContext.scopes || [];
							} catch (error) {
								return ctx.json(
									{
										error: "Middleware execution failed",
										details: error instanceof Error ? error.message : String(error),
									},
									{ status: 500 },
								);
							}
						}

						// Execute before hooks of target resource
						const hookContext: QueryHookContext = {
							user,
							resource: targetResource.name,
							operation: "create",
							data,
							request: ctx.request,
							adapter,
							context,
						};

						if (targetResource.hooks) {
							try {
								await HookExecutor.executeBefore(targetResource.hooks, hookContext);
							} catch (error) {
								return ctx.json(
									{
										error: "Hook execution failed",
										details: error instanceof Error ? error.message : String(error),
									},
									{ status: 500 },
								);
							}
						}

						// Check permissions of target resource
						const permissionContext: QueryPermissionContext = {
							user,
							resource: targetResource.name,
							operation: "create",
							data,
							request: ctx,
							scopes: userScopes,
						};

						const permissionResult = await checkPermission(
							"create",
							permissionContext,
							targetResource,
						);
						if (permissionResult === false) {
							return ctx.json({ error: "Forbidden" }, { status: 403 });
						}

						try {
							// Generate ID if not present
							if (!data.id) {
								data.id = generateId();
							}

							// Perform db create
							const result = await adapter.create({
								model: targetTableName,
								data,
							});

							// Execute after hooks of target resource
							hookContext.result = result;
							if (targetResource.hooks) {
								await HookExecutor.executeAfter(targetResource.hooks, hookContext);
							}

							// Log audit event
							if (context.auditLogger) {
								await context.auditLogger.logFromContext(
									hookContext,
									undefined,
									result,
								);
							}

							return ctx.json(result, { status: 201 });
						} catch (error) {
							console.error("Error creating related resource:", error);
							return ctx.json(
								{
									error: "Failed to create related resource",
									details: error instanceof Error ? error.message : String(error),
								},
								{ status: 500 },
							);
						}
					};

					queryEndpoints[`${name}.${relationName}.create`] = createQueryEndpoint(
						`/${name}/:parentId/${relationName}`,
						createOpts,
						createHandlerFn,
					);
				}
			}
		}
	}

	// Merge custom endpoints if provided
	if (customEndpoints && Object.keys(customEndpoints).length > 0) {
		Object.assign(queryEndpoints, customEndpoints);
	}

	return queryEndpoints;
}

// Legacy alias
export const createCrudEndpoints = createQueryEndpoints;

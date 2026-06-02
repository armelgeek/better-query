import { z } from "zod";
import { createQueryEndpoint } from "../endpoints";
import { CrudHookContext } from "../types";
import { Plugin } from "../types/plugins";
import { generateId } from "../utils/schema";

/**
 * Audit plugin options
 */
export interface AuditPluginOptions {
	/** Whether to enable audit logging */
	enabled?: boolean;
	/** Operations to audit (default: all) */
	operations?: Array<"create" | "update" | "delete">;
	/** Custom audit logger function */
	logger?: (event: AuditEvent) => Promise<void> | void;
	/** Include request data in audit logs */
	includeRequestData?: boolean;
	/** Include response data in audit logs */
	includeResponseData?: boolean;
}

/**
 * Audit event structure
 */
export interface AuditEvent {
	timestamp: Date;
	operation: string;
	resource: string;
	recordId?: string;
	user?: any;
	impersonator?: any;
	ipAddress?: string;
	userAgent?: string;
	requestData?: any;
	responseData?: any;
	error?: string;
}

/**
 * Default audit logger - logs to console
 */
const defaultAuditLogger = (event: AuditEvent) => {
	console.log(
		`[AUDIT] ${event.timestamp.toISOString()} - ${event.operation.toUpperCase()} on ${
			event.resource
		}`,
		{
			recordId: event.recordId,
			user: event.user?.id || "anonymous",
			impersonatedBy: event.impersonator?.id,
			ipAddress: event.ipAddress,
			error: event.error,
		},
	);
};

/**
 * Audit plugin factory
 */
export function auditPlugin(options: AuditPluginOptions = {}): Plugin {
	const {
		enabled = true,
		operations = ["create", "update", "delete"],
		logger = defaultAuditLogger,
		includeRequestData = false,
		includeResponseData = false,
	} = options;

	if (!enabled) {
		return {
			id: "audit",
			endpoints: {},
		};
	}

	let adapter: any;

	const createAuditLog = async (context: CrudHookContext, error?: string) => {
		if (!operations.includes(context.operation as any)) {
			return;
		}

		const event: AuditEvent = {
			timestamp: new Date(),
			operation: context.operation,
			resource: context.resource,
			recordId: context.id,
			user: context.user,
			impersonator: (context as any).context?.impersonator,
			ipAddress:
				context.request?.headers?.get?.("x-forwarded-for") ||
				context.request?.headers?.get?.("x-real-ip") ||
				context.request?.ip,
			userAgent: context.request?.headers?.get?.("user-agent"),
			requestData: includeRequestData ? context.data : undefined,
			responseData: includeResponseData ? context.result : undefined,
			error,
		};

		try {
			await logger(event);

			if (adapter) {
				await adapter.create({
					model: "audit_logs",
					data: {
						id: generateId(),
						timestamp: event.timestamp,
						operation: event.operation,
						resource: event.resource,
						record_id: event.recordId,
						user_id: event.user?.id || "anonymous",
						impersonated_by: event.impersonator?.id,
						ip_address: event.ipAddress,
						user_agent: event.userAgent,
						request_data: event.requestData
							? JSON.stringify(event.requestData)
							: undefined,
						response_data: event.responseData
							? JSON.stringify(event.responseData)
							: undefined,
						error: event.error,
						created_at: new Date(),
					},
				});
			}
		} catch (logError) {
			console.error("Failed to write audit log:", logError);
		}
	};

	return {
		id: "audit",

		init: (ctx) => {
			adapter = ctx.adapter;
		},

		endpoints: {
			getAuditLogs: createQueryEndpoint(
				"/audit/logs",
				{
					method: "GET",
					query: z.object({
						resource: z.string().optional(),
						operation: z.string().optional(),
						user: z.string().optional(),
						startDate: z.string().optional(),
						endDate: z.string().optional(),
						page: z
							.string()
							.optional()
							.transform((val) => (val ? parseInt(val) : 1)),
						limit: z
							.string()
							.optional()
							.transform((val) => (val ? parseInt(val) : 50)),
					}) as any,
				},
				async (ctx) => {
					if (!adapter) {
						return ctx.json({
							items: [],
							pagination: { total: 0 },
						});
					}

					const queryParams = ctx.query || {};
					const where = [];

					if (queryParams.resource) {
						where.push({
							field: "resource",
							operator: "eq",
							value: queryParams.resource,
						});
					}
					if (queryParams.operation) {
						where.push({
							field: "operation",
							operator: "eq",
							value: queryParams.operation,
						});
					}
					if (queryParams.user) {
						where.push({
							field: "user_id",
							operator: "eq",
							value: queryParams.user,
						});
					}
					if (queryParams.startDate) {
						where.push({
							field: "timestamp",
							operator: "gte",
							value: queryParams.startDate,
						});
					}
					if (queryParams.endDate) {
						where.push({
							field: "timestamp",
							operator: "lte",
							value: queryParams.endDate,
						});
					}

					const page = queryParams.page || 1;
					const limit = queryParams.limit || 50;
					const offset = (page - 1) * limit;

					const items = await adapter.findMany({
						model: "audit_logs",
						where,
						limit,
						offset,
						orderBy: [{ field: "timestamp", direction: "desc" }],
					});

					const total = await adapter.count({
						model: "audit_logs",
						where,
					});

					// Parse JSON request_data and response_data
					const parsedItems = items.map((item: any) => {
						let request_data = item.request_data;
						if (typeof request_data === "string") {
							try {
								request_data = JSON.parse(request_data);
							} catch (_) {}
						}
						let response_data = item.response_data;
						if (typeof response_data === "string") {
							try {
								response_data = JSON.parse(response_data);
							} catch (_) {}
						}
						return {
							...item,
							request_data,
							response_data,
						};
					});

					return ctx.json({
						items: parsedItems,
						pagination: {
							page,
							limit,
							total,
							totalPages: Math.ceil(total / limit),
							hasNext: page * limit < total,
							hasPrev: page > 1,
						},
					});
				},
			),
		},

		schema: {
			audit_logs: {
				fields: {
					id: {
						type: "string",
						required: true,
					},
					timestamp: {
						type: "date",
						required: true,
					},
					operation: {
						type: "string",
						required: true,
					},
					resource: {
						type: "string",
						required: true,
					},
					record_id: {
						type: "string",
						required: false,
					},
					user_id: {
						type: "string",
						required: false,
					},
					impersonated_by: {
						type: "string",
						required: false,
					},
					ip_address: {
						type: "string",
						required: false,
					},
					user_agent: {
						type: "string",
						required: false,
					},
					request_data: {
						type: "json",
						required: false,
					},
					response_data: {
						type: "json",
						required: false,
					},
					error: {
						type: "string",
						required: false,
					},
					created_at: {
						type: "date",
						required: true,
						default: "now()",
					},
				},
			},
		},

		hooks: {
			afterCreate: (context) => createAuditLog(context),
			afterUpdate: (context) => createAuditLog(context),
			afterDelete: (context) => createAuditLog(context),
		},

		options,
	};
}

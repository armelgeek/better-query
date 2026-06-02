import { createRouter } from "better-call";
import { sql } from "kysely";
import type { UnionToIntersection } from "type-fest";
import { getQueryAdapter } from "./adapters/utils";
import { createQueryEndpoints } from "./endpoints";
import { PluginManager, shimPluginContext } from "./plugins/manager";
import { QueryContext, QueryOptions } from "./types";
import { PluginInitContext } from "./types/plugins";
import { RelationshipManager } from "./utils/relationships";
import { zodSchemaToFields } from "./utils/schema";

function initQuery(options: QueryOptions): QueryContext {
	const adapter = getQueryAdapter(options);

	const relationships = new Map();
	const schemas = new Map();

	const pluginManager = new PluginManager();

	const context: QueryContext = {
		db: null,
		adapter,
		options,
		relationships,
		schemas,
		pluginManager,
		broadcast: (message) => {
			// This will be overridden by the realtime plugin if present
			if (options.debug) {
				console.log(
					`[Broadcast] No realtime plugin active for channel ${message.channel}`,
				);
			}
		},
	};

	const relationshipManager = new RelationshipManager(context);
	if ("setRelationshipManager" in adapter) {
		(adapter as any).setRelationshipManager(relationshipManager);
	}

	return context;
}

export function betterQuery<O extends QueryOptions>(options: O) {
	const queryContext = initQuery(options);

	if (options.plugins) {
		queryContext.pluginManager!.registerPlugins(options.plugins);
	}

	const allResources = [...options.resources];
	const pluginResources = queryContext.pluginManager!.getPluginResources();
	allResources.push(...pluginResources);

	const allEndpoints: Record<string, any> = {};
	const schema: Record<string, { fields: Record<string, any> }> = {};

	for (const resourceConfig of allResources) {
		if (resourceConfig.relationships) {
			const relationshipManager = new RelationshipManager(queryContext);
			relationshipManager.registerRelationships(
				resourceConfig.name,
				resourceConfig.relationships,
			);
		}

		const resourceEndpoints = createQueryEndpoints(resourceConfig, allResources);

		Object.assign(allEndpoints, resourceEndpoints);

		const resourceSchema = {
			fields: zodSchemaToFields(resourceConfig.schema),
		};
		schema[resourceConfig.name] = resourceSchema;
		queryContext.schemas.set(resourceConfig.name, resourceSchema);
	}

	const pluginEndpoints = queryContext.pluginManager!.getPluginEndpoints();
	Object.assign(allEndpoints, pluginEndpoints);

	const pluginSchemas = queryContext.pluginManager!.getPluginSchemas();
	Object.assign(schema, pluginSchemas);

	const relationshipManager = new RelationshipManager(queryContext);

	const pluralize = (str: string) => {
		if (str.endsWith("y")) return str.slice(0, -1) + "ies";
		if (str.endsWith("s")) return str;
		return str + "s";
	};

	// 1. Auto-infer belongsTo relationships from foreign keys (e.g. projectId -> project)
	for (const resourceConfig of allResources) {
		const existingRelationships = relationshipManager.getRelationships(
			resourceConfig.name,
		);
		const resourceSchema = queryContext.schemas.get(resourceConfig.name);
		if (resourceSchema?.fields) {
			const autoRelationships = { ...existingRelationships };
			let inferred = false;
			for (const fieldName of Object.keys(resourceSchema.fields)) {
				if (fieldName.endsWith("Id") && fieldName !== "id") {
					const target = fieldName.slice(0, -2);
					if (queryContext.schemas.has(target) && !autoRelationships[target]) {
						autoRelationships[target] = {
							type: "belongsTo" as const,
							target,
							foreignKey: fieldName,
							targetKey: "id",
						};
						inferred = true;
					}
				}
			}
			if (inferred) {
				relationshipManager.registerRelationships(
					resourceConfig.name,
					autoRelationships,
				);
			}
		}
	}

	// 2. Auto-infer hasMany relationships back to the source (e.g. user hasMany posts)
	for (const resourceConfig of allResources) {
		const existingBelongsTo = relationshipManager.getRelationships(
			resourceConfig.name,
		);
		for (const [relationName, relationConfig] of Object.entries(
			existingBelongsTo,
		)) {
			if (relationConfig.type === "belongsTo") {
				const targetResource = relationConfig.target;
				const targetRelationships =
					relationshipManager.getRelationships(targetResource);
				const pluralName = pluralize(resourceConfig.name);

				if (!targetRelationships[pluralName]) {
					const updatedTargetRelationships = {
						...targetRelationships,
						[pluralName]: {
							type: "hasMany" as const,
							target: resourceConfig.name,
							foreignKey: relationConfig.foreignKey,
							targetKey: "id",
						},
					};
					relationshipManager.registerRelationships(
						targetResource,
						updatedTargetRelationships,
					);
				}
			}
		}
	}
	for (const resourceConfig of allResources) {
		if (resourceConfig.relationships) {
			for (const [relationName, relationConfig] of Object.entries(
				resourceConfig.relationships,
			)) {
				const errors = relationshipManager.validateRelationship(
					resourceConfig.name,
					relationName,
					relationConfig,
				);
				if (errors.length > 0) {
					console.warn(
						`Relationship validation errors for ${resourceConfig.name}.${relationName}:`,
						errors,
					);
				}
			}
		}
	}

	let processedEndpoints = allEndpoints;
	const api: Record<string, any> = {};
	for (const [key, value] of Object.entries(processedEndpoints)) {
		api[key] = (context: any) => {
			return value({
				...context,
				options: queryContext.options,
				context: {
					...queryContext,
					...context.context,
				},
			});
		};
		api[key].path = value.path;
		api[key].method = value.method;
		api[key].options = value.options;
		api[key].headers = value.headers;
	}

	const pluginInitContext: PluginInitContext = {
		resources: new Map(allResources.map((r) => [r.name, r])),
		schemas: queryContext.schemas,
		relationships: queryContext.relationships,
		adapter: queryContext.adapter,
		options: options,
		broadcast: queryContext.broadcast,
	};

	queryContext
		.pluginManager!.initializePlugins(pluginInitContext)
		.catch(console.error);

	const { handler, endpoints } = createRouter(api, {
		extraContext: queryContext,
		basePath: options.basePath,
		onError(e) {
			console.error("Query Error:", e);
		},
	});

	const shouldAutoMigrate =
		"autoMigrate" in options.database ? options.database.autoMigrate : false;
	if (shouldAutoMigrate) {
		initTables(queryContext, schema).catch(console.error);
	}

	type PluginEndpoint = UnionToIntersection<
		O["plugins"] extends Array<infer T>
			? T extends { endpoints: infer E }
				? E
				: Record<string, never>
			: Record<string, never>
	>;

	type Endpoint = typeof endpoints;

	const result = {
		handler,
		api: endpoints as Endpoint & PluginEndpoint,
		options,
		context: queryContext,
		schema,
		transaction: async <T>(fn: (api: any) => Promise<T>): Promise<T> => {
			if (!queryContext.adapter.transaction) {
				throw new Error("Adapter does not support transactions");
			}
			return await queryContext.adapter.transaction(async (trxAdapter) => {
				const transactionalContext = { ...queryContext, adapter: trxAdapter };
				const { endpoints: trxEndpoints } = createRouter(api, {
					extraContext: transactionalContext,
				});
				return await fn(trxEndpoints);
			});
		},
	};

	const customOps = queryContext.adapter.customOperations || {};
	for (const [name, op] of Object.entries(customOps)) {
		if (!(name in result)) {
			(result as any)[name] = (params: any) =>
				op(params, { ...queryContext, adapter: queryContext.adapter });
		}
	}

	return result as BetterQuery<O, Endpoint, PluginEndpoint>;
}

function applyBasePath(
	endpoints: Record<string, any>,
	basePath: string,
): Record<string, any> {
	const processedEndpoints: Record<string, any> = {};

	for (const [key, endpoint] of Object.entries(endpoints)) {
		processedEndpoints[key] = {
			...endpoint,
			path: `${basePath}${endpoint.path}`,
		};
	}

	return processedEndpoints;
}

async function initTables(
	context: QueryContext,
	schema: Record<string, { fields: Record<string, any> }>,
) {
	try {
		const schemaData = Object.entries(schema).map(
			([resourceName, resourceSchema]) => ({
				model: resourceName,
				fields: resourceSchema.fields,
			}),
		);

		if (context.adapter.createSchema) {
			await context.adapter.createSchema(schemaData);
		} else {
			console.warn(
				"Adapter does not support createSchema method. Auto-migration skipped.",
			);
		}
	} catch (error) {
		console.error("Error initializing tables:", error);
	}
}

export type BetterQuery<
	O extends QueryOptions = QueryOptions,
	Endpoints extends Record<string, any> = Record<string, any>,
	PluginEndpoints extends Record<string, any> = UnionToIntersection<
		O["plugins"] extends Array<infer T>
			? T extends { endpoints: infer E }
				? E
				: Record<string, never>
			: Record<string, never>
	>,
> = {
	handler: (request: Request) => Promise<Response>;
	api: Endpoints & PluginEndpoints;
	options: O;
	context: QueryContext;
	schema: Record<string, { fields: Record<string, any> }>;
	transaction: <T>(
		fn: (api: Endpoints & PluginEndpoints) => Promise<T>,
	) => Promise<T>;
} & (O["database"] extends { adapter: infer A }
	? A extends { customOperations: infer C }
		? C extends Record<string, any>
			? C
			: Record<string, never>
		: Record<string, never>
	: Record<string, never>);

export type BetterCrud<
	O extends QueryOptions = QueryOptions,
	Endpoints extends Record<string, any> = Record<string, any>,
	PluginEndpoints extends Record<string, any> = UnionToIntersection<
		O["plugins"] extends Array<infer T>
			? T extends { endpoints: infer E }
				? E
				: Record<string, never>
			: Record<string, never>
	>,
> = BetterQuery<O, Endpoints, PluginEndpoints>;

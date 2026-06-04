import { createRequire } from "module";
const require = createRequire(import.meta.url);
import { Kysely, sql } from "kysely";
import { FieldAttribute, IncludeOptions } from "../types";
import {
	QueryAdapter,
	QueryAdapterConfig,
	QueryOrderBy,
	QueryWhere,
} from "../types/adapter";
import { RelationshipManager } from "../utils/relationships";

/**
 * Transform data before sending to database based on schema
 */
function transformFromData(
	data: Record<string, any>,
	modelSchema?: Record<string, FieldAttribute>,
	config?: QueryAdapter["config"],
): Record<string, any> {
	const transformed = { ...data };
	const transformBooleans = config?.transform?.boolean ?? true;
	const transformDates = config?.transform?.date ?? true;

	for (const key in transformed) {
		const value = transformed[key];
		const fieldSchema = modelSchema?.[key];

		// Remove undefined values
		if (value === undefined) {
			delete transformed[key];
			continue;
		}

		// Use schema information if available
		if (fieldSchema) {
			if (
				fieldSchema.type === "date" &&
				value instanceof Date &&
				transformDates
			) {
				transformed[key] = value.toISOString();
			} else if (
				fieldSchema.type === "boolean" &&
				typeof value === "boolean" &&
				transformBooleans
			) {
				transformed[key] = value ? 1 : 0;
			} else if (
				fieldSchema.type === "json" &&
				value !== null &&
				typeof value === "object"
			) {
				transformed[key] = JSON.stringify(value);
			}
		} else {
			// Fallback for fields not in schema (like timestamps added by adapter)
			if (value instanceof Date && transformDates) {
				transformed[key] = value.toISOString();
			} else if (typeof value === "boolean" && transformBooleans) {
				transformed[key] = value ? 1 : 0;
			} else if (
				value !== null &&
				typeof value === "object" &&
				!(value instanceof Date)
			) {
				transformed[key] = JSON.stringify(value);
			}
		}
	}

	return transformed;
}

/**
 * Map our QueryWhere operators to Kysely operators
 */
function mapOperatorToKysely(operator?: string): string {
	switch (operator) {
		case "eq":
			return "=";
		case "ne":
			return "!=";
		case "lt":
			return "<";
		case "lte":
			return "<=";
		case "gt":
			return ">";
		case "gte":
			return ">=";
		case "in":
			return "in";
		case "notIn":
			return "not in";
		case "like":
			return "like";
		case "notLike":
			return "not like";
		default:
			return "=";
	}
}

/**
 * Transform data after reading from database based on schema
 */
function transformToData(
	data: Record<string, any>,
	modelSchema?: Record<string, FieldAttribute>,
	config?: QueryAdapter["config"],
): Record<string, any> {
	const transformed = { ...data };
	const transformBooleans = config?.transform?.boolean ?? true;
	const transformDates = config?.transform?.date ?? true;

	for (const key in transformed) {
		const value = transformed[key];
		const fieldSchema = modelSchema?.[key];

		// Skip null/undefined values
		if (value === null || value === undefined) {
			continue;
		}

		// Use schema information if available
		if (fieldSchema) {
			if (
				fieldSchema.type === "date" &&
				typeof value === "string" &&
				transformDates
			) {
				const dateValue = new Date(value);
				if (!isNaN(dateValue.getTime())) {
					transformed[key] = dateValue;
				}
			} else if (fieldSchema.type === "json" && typeof value === "string") {
				try {
					transformed[key] = JSON.parse(value);
				} catch {
					// If parsing fails, keep as string
				}
			} else if (
				fieldSchema.type === "boolean" &&
				typeof value === "number" &&
				transformBooleans
			) {
				transformed[key] = value === 1;
			}
		} else {
			// Fallback/Legacy logic for known timestamp fields
			if (
				typeof value === "string" &&
				transformDates &&
				(key === "createdAt" || key === "updatedAt" || key === "publishedAt")
			) {
				const dateValue = new Date(value);
				if (!isNaN(dateValue.getTime())) {
					transformed[key] = dateValue;
				}
			}
		}
	}

	return transformed;
}

export class KyselyQueryAdapter implements QueryAdapter {
	private relationshipManager?: RelationshipManager;
	public config?: {
		provider: "sqlite" | "postgres" | "mysql" | "custom";
		transform?: {
			date?: boolean;
			boolean?: boolean;
		};
	};

	constructor(private db: Kysely<any>) {}

	setRelationshipManager(manager: RelationshipManager) {
		this.relationshipManager = manager;
	}

	async create(params: {
		model: string;
		data: Record<string, any>;
		include?: IncludeOptions;
	}) {
		const { model, data, include } = params;
		const schema =
			this.relationshipManager?.relationshipContext.schemas.get(model)?.fields;

		// Add timestamps if they don't exist
		const now = new Date();
		if (!data.createdAt) data.createdAt = now;
		if (!data.updatedAt) data.updatedAt = now;

		// Transform data for database compatibility
		const transformedData = transformFromData(data, schema, this.config);

		const result = await this.db
			.insertInto(model)
			.values(transformedData)
			.returningAll()
			.executeTakeFirst();

		if (!result) return result;

		// Transform result back to proper types
		const transformedResult = transformToData(result, schema, this.config);

		// Include related data if requested
		if (include && this.relationshipManager) {
			return await this.includeRelatedData(model, transformedResult, include);
		}

		return transformedResult;
	}

	async createMany(params: { model: string; data: any[] }) {
		const { model, data } = params;
		const schema =
			this.relationshipManager?.relationshipContext.schemas.get(model)?.fields;
		const now = new Date();

		const transformedData = data.map((item) => {
			if (!item.createdAt) item.createdAt = now;
			if (!item.updatedAt) item.updatedAt = now;
			return transformFromData(item, schema, this.config);
		});

		const results = await this.db
			.insertInto(model)
			.values(transformedData as any)
			.returningAll()
			.execute();

		return results.map((result) =>
			transformToData(result, schema, this.config),
		);
	}

	async findFirst(params: {
		model: string;
		where?: QueryWhere[];
		include?: IncludeOptions;
		select?: string[];
	}) {
		const { model, where = [], include, select } = params;
		const resourceConfig =
			this.relationshipManager?.relationshipContext.options.resources.find(
				(r) => r.name === model,
			);

		// Apply soft delete filter if enabled
		const activeWhere = [...where];
		if (resourceConfig?.softDelete?.enabled === true) {
			const softDeleteField = resourceConfig?.softDelete?.field || "deletedAt";
			const hasSoftDeleteFilter = activeWhere.some((w) => w.field === softDeleteField);
			// Only add if field exists in schema and not already present
			if (resourceConfig?.schema && !hasSoftDeleteFilter) {
				activeWhere.push({
					field: softDeleteField,
					operator: "eq",
					value: null,
				});
			}
		}

		// If no includes, use simple query
		if (!include || !this.relationshipManager) {
			let query = this.db.selectFrom(model).selectAll();

			for (const condition of activeWhere) {
				const operator = mapOperatorToKysely(condition.operator);
				query = query.where(condition.field, operator as any, condition.value);
			}

			const result = await query.executeTakeFirst();
			const schema =
				this.relationshipManager?.relationshipContext.schemas.get(
					model,
				)?.fields;
			const transformed = result
				? transformToData(result, schema, this.config)
				: result;
			return await this.applyComputedFields(model, transformed);
		}

		// Use relationship-aware query
		const results = await this.findWithRelations(model, {
			where: activeWhere,
			include,
			limit: 1,
		});
		return results.length > 0 ? results[0] : null;
	}

	async findMany(params: {
		model: string;
		where?: QueryWhere[];
		limit?: number;
		offset?: number;
		orderBy?: QueryOrderBy[];
		include?: IncludeOptions;
		select?: string[];
	}): Promise<any[]> {
		const {
			model,
			where = [],
			limit,
			offset,
			orderBy = [],
			include,
			select,
		} = params;

		const resourceConfig =
			this.relationshipManager?.relationshipContext.options.resources.find(
				(r) => r.name === model,
			);

		// Apply soft delete filter if enabled
		const activeWhere = [...where];
		if (resourceConfig?.softDelete?.enabled === true) {
			const softDeleteField = resourceConfig?.softDelete?.field || "deletedAt";
			const hasSoftDeleteFilter = activeWhere.some((w) => w.field === softDeleteField);
			// Check if field exists in schema or if we should just try anyway
			if (!hasSoftDeleteFilter) {
				activeWhere.push({
					field: softDeleteField,
					operator: "eq",
					value: null,
				});
			}
		}

		// If no includes, use simple query
		if (!include || !this.relationshipManager) {
			let query = this.db.selectFrom(model).selectAll();

			// Apply where conditions
			for (const condition of activeWhere) {
				const operator = mapOperatorToKysely(condition.operator);
				query = query.where(condition.field, operator as any, condition.value);
			}

			// Apply ordering
			for (const order of orderBy) {
				query = query.orderBy(order.field, order.direction);
			}

			// Apply pagination
			if (limit) {
				query = query.limit(limit);
			}
			if (offset) {
				query = query.offset(offset);
			}

			const schema =
				this.relationshipManager?.relationshipContext.schemas.get(
					model,
				)?.fields;
			const results = await query.execute();
			const transformed = results.map((item) =>
				transformToData(item, schema, this.config),
			);
			return await Promise.all(
				transformed.map((r) => this.applyComputedFields(model, r)),
			);
		}

		// Use relationship-aware query
		return await this.findWithRelations(model, {
			where: activeWhere,
			limit,
			offset,
			orderBy,
			include,
		});
	}

	async update(params: {
		model: string;
		where: QueryWhere[];
		data: Record<string, any>;
		include?: IncludeOptions;
	}) {
		const { model, where, data, include } = params;
		const schema =
			this.relationshipManager?.relationshipContext.schemas.get(model)?.fields;

		// Add updated timestamp
		data.updatedAt = new Date();

		// Transform data for database compatibility
		const transformedData = transformFromData(data, schema, this.config);

		let query = this.db.updateTable(model).set(transformedData);

		for (const condition of where) {
			const operator = mapOperatorToKysely(condition.operator);
			query = query.where(condition.field, operator as any, condition.value);
		}

		const result = await query.returningAll().executeTakeFirst();

		if (!result) return result;

		// Transform result back to proper types
		const transformedResult = transformToData(result, schema, this.config);

		// Include related data if requested
		if (include && this.relationshipManager) {
			return await this.includeRelatedData(model, transformedResult, include);
		}

		return transformedResult;
	}

	async delete(params: {
		model: string;
		where: QueryWhere[];
		cascade?: boolean;
	}) {
		const { model, where, cascade = false } = params;

		const resourceConfig =
			this.relationshipManager?.relationshipContext.options.resources.find(
				(r) => r.name === model,
			);

		// Handle soft delete if enabled
		if (resourceConfig?.softDelete?.enabled) {
			const softDeleteField = resourceConfig.softDelete.field || "deletedAt";
			const data = { [softDeleteField]: new Date() };

			await this.update({ model, where, data });
			return;
		}

		// TODO: Implement cascade delete logic
		if (cascade && this.relationshipManager) {
			await this.handleCascadeDelete(model, where);
		}

		let query = this.db.deleteFrom(model);

		for (const condition of where) {
			const operator = mapOperatorToKysely(condition.operator);
			query = query.where(condition.field, operator as any, condition.value);
		}

		await query.execute();
	}

	async count(params: {
		model: string;
		where?: QueryWhere[];
	}) {
		const { model, where = [] } = params;

		let query = this.db.selectFrom(model).select(sql`count(*)`.as("count"));

		for (const condition of where) {
			const operator = mapOperatorToKysely(condition.operator);
			query = query.where(condition.field, operator as any, condition.value);
		}

		const result = await query.executeTakeFirst();
		return Number(result?.count || 0);
	}

	async createWithRelations(params: {
		model: string;
		data: Record<string, any>;
		relations?: Record<string, any>;
		include?: IncludeOptions;
	}): Promise<any> {
		const { model, data, relations, include } = params;

		// Start transaction
		return await this.db.transaction().execute(async (trx) => {
			// Create main record
			const adapter = new KyselyQueryAdapter(trx);
			adapter.setRelationshipManager(this.relationshipManager!);

			const mainRecord = await adapter.create({ model, data });

			// Create related records if any
			if (relations && this.relationshipManager) {
				await this.handleRelationCreation(mainRecord, relations, model, trx);
			}

			// Return with includes if requested
			if (include) {
				return await adapter.includeRelatedData(model, mainRecord, include);
			}

			return mainRecord;
		});
	}

	async updateWithRelations(params: {
		model: string;
		where: QueryWhere[];
		data: Record<string, any>;
		relations?: Record<string, any>;
		include?: IncludeOptions;
	}): Promise<any> {
		const { model, where, data, relations, include } = params;

		// Start transaction
		return await this.db.transaction().execute(async (trx) => {
			// Update main record
			const adapter = new KyselyQueryAdapter(trx);
			adapter.setRelationshipManager(this.relationshipManager!);

			const mainRecord = await adapter.update({ model, where, data });

			// Update related records if any
			if (relations && this.relationshipManager) {
				await this.handleRelationUpdate(mainRecord, relations, model, trx);
			}

			// Return with includes if requested
			if (include) {
				return await adapter.includeRelatedData(model, mainRecord, include);
			}

			return mainRecord;
		});
	}

	async validateReferences(params: {
		model: string;
		data: Record<string, any>;
		operation: "create" | "update" | "delete";
	}): Promise<{ valid: boolean; errors: string[] }> {
		const { model, data, operation } = params;
		const errors: string[] = [];

		if (!this.relationshipManager) {
			return { valid: true, errors };
		}

		// TODO: Implement comprehensive referential integrity validation
		// This would check foreign key references exist, prevent deletion of referenced records, etc.

		return { valid: errors.length === 0, errors };
	}

	async createSchema(
		data: { model: string; fields: Record<string, FieldAttribute> }[],
	): Promise<void> {
		try {
			for (const { model, fields } of data) {
				// Get provider from config or default to sqlite
				const provider = this.config?.provider || "sqlite";

				// Generate and execute CREATE TABLE SQL
				const createTableSQL = generateCreateTableSQL(model, fields, provider);

				// Execute the SQL using Kysely's sql template literal
				await sql`${sql.raw(createTableSQL)}`.execute(this.db);
			}
		} catch (error) {
			console.error("Error creating schema:", error);
			throw error;
		}
	}

	private async findWithRelations(
		model: string,
		params: {
			where?: QueryWhere[];
			limit?: number;
			offset?: number;
			orderBy?: QueryOrderBy[];
			include?: IncludeOptions;
			q?: string; // Global search query
		},
	): Promise<any[]> {
		const { where = [], limit, offset, orderBy = [], include, q } = params;

		if (!this.relationshipManager) {
			return await this.findMany({ model, where, limit, offset, orderBy });
		}

		// Detect dot notation paths in where and orderBy
		const dotPaths = [
			...where.map((w) => w.field),
			...orderBy.map((o) => o.field),
		].filter((f) => f.includes("."));

		// Resolve both requested includes and those needed for filtering
		let resolvedIncludes = this.relationshipManager.resolveIncludes(
			model,
			include,
		);

		if (dotPaths.length > 0) {
			resolvedIncludes = this.relationshipManager.resolveFilterRelations(
				model,
				dotPaths,
				resolvedIncludes,
			);
		}

		// Generate joins
		const joins = this.relationshipManager.generateJoins(
			model,
			resolvedIncludes,
			"main",
		);

		// Build complex query with joins
		let query = this.db.selectFrom(`${model} as main`);

		// Select main table fields explicitly
		const mainSchema =
			this.relationshipManager.relationshipContext.schemas.get(model);
		if (mainSchema) {
			for (const fieldName of Object.keys(mainSchema.fields)) {
				query = query.select(`main.${fieldName} as ${fieldName}`);
			}
		}

		// Add join selects - only for explicitly requested includes
		const requestedRelationNames = new Set([
			...(include?.include || []),
			...Object.keys(include?.select || {}),
		]);

		for (const include of resolvedIncludes) {
			if (!requestedRelationNames.has(include.relationName)) continue;

			const alias = `main_${include.relationName}`;
			const targetSchema =
				this.relationshipManager.relationshipContext.schemas.get(
					include.relation.target,
				);
			if (targetSchema) {
				for (const fieldName of Object.keys(targetSchema.fields)) {
					query = query.select(
						`${alias}.${fieldName} as ${alias}_${fieldName}`,
					);
				}
			}
		}

		// Apply Relational Aggregations
		const resourceConfig =
			this.relationshipManager.relationshipContext.options.resources.find(
				(r) => r.name === model,
			);
		if (resourceConfig?.aggregations) {
			for (const [aggName, aggConfig] of Object.entries(
				resourceConfig.aggregations,
			)) {
				const relation =
					this.relationshipManager.getRelationships(model)[aggConfig.relation];
				if (!relation) continue;

				// Add subquery for aggregation
				query = query.select((eb: any) => {
					const subQuery = eb
						.selectFrom(relation.target)
						.whereRef(
							`${relation.target}.${relation.targetKey || "id"}`,
							"=",
							`main.${relation.foreignKey || "id"}`,
						);

					switch (aggConfig.type) {
						case "count":
							return subQuery.select(eb.fn.countAll().as(aggName)).as(aggName);
						case "sum":
							return subQuery
								.select(eb.fn.sum(aggConfig.field!).as(aggName))
								.as(aggName);
						case "avg":
							return subQuery
								.select(eb.fn.avg(aggConfig.field!).as(aggName))
								.as(aggName);
						default:
							return subQuery.select(eb.fn.countAll().as(aggName)).as(aggName);
					}
				});
			}
		}

		// Apply joins
		for (const join of joins) {
			query = query.leftJoin(`${join.table} as ${join.alias}`, (builder) => {
				const parts = join.condition.split(" = ");
				const left = parts[0]?.trim();
				const right = parts[1]?.trim();
				if (left && right) {
					return builder.onRef(left, "=", right);
				}
				return builder;
			});
		}

		// Apply global search if 'q' is provided
		if (q && resourceConfig?.search?.fields) {
			const searchFields = resourceConfig.search.fields;
			query = query.where((eb: any) =>
				eb.or(
					searchFields.map((field: string) =>
						eb(`main.${field}`, "like", `%${q}%`),
					),
				),
			);
		}

		// Apply where conditions
		for (const condition of where) {
			const operator = mapOperatorToKysely(condition.operator);

			// Better alias mapping for nested fields
			let finalField = condition.field;
			if (condition.field.includes(".")) {
				const parts = condition.field.split(".");
				const fieldName = parts.pop();
				const relationAlias = `main_${parts.join("_")}`;
				finalField = `${relationAlias}.${fieldName}`;
			} else {
				finalField = `main.${condition.field}`;
			}

			query = query.where(finalField as any, operator as any, condition.value);
		}

		// Apply ordering
		for (const order of orderBy) {
			let finalField = order.field;
			if (order.field.includes(".")) {
				const parts = order.field.split(".");
				const fieldName = parts.pop();
				const relationAlias = `main_${parts.join("_")}`;
				finalField = `${relationAlias}.${fieldName}`;
			} else {
				finalField = `main.${order.field}`;
			}
			query = query.orderBy(finalField as any, order.direction);
		}

		// Apply pagination
		const hasManyToMany = resolvedIncludes.some(
			(include) => include.relation.type === "belongsToMany",
		);

		if (limit && !hasManyToMany) {
			query = query.limit(limit);
		}
		if (offset) {
			query = query.offset(offset);
		}

		const results = await query.execute();

		// Transform flat results into nested structure
		const schema =
			this.relationshipManager.relationshipContext.schemas.get(model)?.fields;
		const transformedResults = results.map((item) =>
			transformToData(item, schema, this.config),
		);

		const nestedResults = this.relationshipManager.transformJoinedResults(
			transformedResults,
			resolvedIncludes.filter((r) =>
				requestedRelationNames.has(r.relationName),
			),
			model,
		);

		// Apply limit after grouping for many-to-many relationships
		if (limit && hasManyToMany) {
			const limited = nestedResults.slice(0, limit);
			return await Promise.all(
				limited.map((r) => this.applyComputedFields(model, r)),
			);
		}

		return await Promise.all(
			nestedResults.map((r) => this.applyComputedFields(model, r)),
		);
	}

	private async applyComputedFields(model: string, record: any): Promise<any> {
		if (!record) return record;
		const resourceConfig =
			this.relationshipManager?.relationshipContext.options.resources.find(
				(r) => r.name === model,
			);

		if (!resourceConfig?.computed) return record;

		const computedRecord = { ...record };
		for (const [field, computeFn] of Object.entries(resourceConfig.computed)) {
			computedRecord[field] = await computeFn(record);
		}
		return computedRecord;
	}

	private async includeRelatedData(
		model: string,
		record: any,
		include: IncludeOptions,
	): Promise<any> {
		if (!this.relationshipManager) return record;

		const resolvedIncludes = this.relationshipManager.resolveIncludes(
			model,
			include,
		);

		for (const resolvedInclude of resolvedIncludes) {
			const { relationName, relation } = resolvedInclude;

			// Load related data based on relationship type
			switch (relation.type) {
				case "belongsTo":
					if (record[relation.foreignKey || `${relation.target}Id`]) {
						const related = await this.findFirst({
							model: relation.target,
							where: [
								{
									field: "id",
									value: record[relation.foreignKey || `${relation.target}Id`],
								},
							],
						});
						record[relationName] = related;
					}
					break;
				case "hasOne":
					const relatedOne = await this.findFirst({
						model: relation.target,
						where: [
							{ field: relation.foreignKey || `${model}Id`, value: record.id },
						],
					});
					record[relationName] = relatedOne;
					break;
				case "hasMany":
					const relatedMany = await this.findMany({
						model: relation.target,
						where: [
							{ field: relation.foreignKey || `${model}Id`, value: record.id },
						],
					});
					record[relationName] = relatedMany;
					break;
				case "belongsToMany":
					if (
						relation.through &&
						relation.sourceKey &&
						relation.targetForeignKey
					) {
						// Query through junction table
						const junctionQuery = this.db
							.selectFrom(relation.through)
							.select(relation.targetForeignKey)
							.where(relation.sourceKey, "=", record.id);

						const junctionResults = await junctionQuery.execute();
						const targetIds = junctionResults.map(
							(row: any) => row[relation.targetForeignKey!],
						);

						if (targetIds.length > 0) {
							// Query target records
							const relatedManyToMany = await this.findMany({
								model: relation.target,
								where: [{ field: "id", operator: "in", value: targetIds }],
							});
							record[relationName] = relatedManyToMany;
						} else {
							record[relationName] = [];
						}
					} else {
						console.warn(
							`Incomplete many-to-many configuration for ${relationName}. Required: through, sourceKey, targetForeignKey`,
						);
						record[relationName] = [];
					}
					break;
			}
		}

		return record;
	}

	private async handleCascadeDelete(
		model: string,
		where: QueryWhere[],
	): Promise<void> {
		// TODO: Implement cascade delete logic
		// This would find all related records that should be deleted
		// and delete them recursively
	}

	private async handleRelationCreation(
		mainRecord: any,
		relations: Record<string, any>,
		model: string,
		trx: Kysely<any>,
	): Promise<void> {
		// TODO: Implement relation creation logic
		// This would create related records and update foreign keys
	}

	private async handleRelationUpdate(
		mainRecord: any,
		relations: Record<string, any>,
		model: string,
		trx: Kysely<any>,
	): Promise<void> {
		// TODO: Implement relation update logic
		// This would update/create/delete related records as needed
	}

	/**
	 * Execute operations in a transaction
	 */
	async transaction<T>(fn: (adapter: QueryAdapter) => Promise<T>): Promise<T> {
		return await this.db.transaction().execute(async (trx) => {
			const transactionalAdapter = new KyselyQueryAdapter(trx);
			transactionalAdapter.config = this.config;
			if (this.relationshipManager) {
				transactionalAdapter.setRelationshipManager(this.relationshipManager);
			}
			return await fn(transactionalAdapter);
		});
	}

	/**
	 * Manage many-to-many relationships through junction tables
	 */
	async manageManyToMany(params: {
		sourceModel: string;
		sourceId: string;
		relationName: string;
		targetIds: string[];
		operation: "set" | "add" | "remove";
	}): Promise<void> {
		if (!this.relationshipManager) {
			throw new Error("Relationship manager not available");
		}

		const relationships = this.relationshipManager.getRelationships(
			params.sourceModel,
		);
		const relation = relationships[params.relationName];

		if (!relation || relation.type !== "belongsToMany") {
			throw new Error(
				`Invalid many-to-many relationship: ${params.relationName}`,
			);
		}

		if (
			!relation.through ||
			!relation.sourceKey ||
			!relation.targetForeignKey
		) {
			throw new Error(
				`Incomplete many-to-many configuration for ${params.relationName}`,
			);
		}

		const junctionTable = relation.through;
		const sourceKey = relation.sourceKey;
		const targetKey = relation.targetForeignKey;

		switch (params.operation) {
			case "set":
				// Remove all existing relationships
				await this.db
					.deleteFrom(junctionTable)
					.where(sourceKey, "=", params.sourceId)
					.execute();

				// Add new relationships
				if (params.targetIds.length > 0) {
					const junctionData = params.targetIds.map((targetId) => ({
						[sourceKey]: params.sourceId,
						[targetKey]: targetId,
						created_at: new Date().toISOString(),
					}));

					await this.db
						.insertInto(junctionTable)
						.values(junctionData)
						.execute();
				}
				break;

			case "add":
				// Only add relationships that don't already exist
				const existingQuery = this.db
					.selectFrom(junctionTable)
					.select(targetKey)
					.where(sourceKey, "=", params.sourceId)
					.where(targetKey, "in", params.targetIds);

				const existing = await existingQuery.execute();
				const existingTargetIds = existing.map((row: any) => row[targetKey]);
				const newTargetIds = params.targetIds.filter(
					(id) => !existingTargetIds.includes(id),
				);

				if (newTargetIds.length > 0) {
					const junctionData = newTargetIds.map((targetId) => ({
						[sourceKey]: params.sourceId,
						[targetKey]: targetId,
						created_at: new Date().toISOString(),
					}));

					await this.db
						.insertInto(junctionTable)
						.values(junctionData)
						.execute();
				}
				break;

			case "remove":
				// Remove specific relationships
				if (params.targetIds.length > 0) {
					await this.db
						.deleteFrom(junctionTable)
						.where(sourceKey, "=", params.sourceId)
						.where(targetKey, "in", params.targetIds)
						.execute();
				}
				break;
		}
	}

	/**
	 * Create junction table for many-to-many relationships
	 */
	async createJunctionTable(params: {
		tableName: string;
		sourceKey: string;
		targetKey: string;
		sourceTable: string;
		targetTable: string;
	}): Promise<void> {
		const provider = this.config?.provider || "sqlite";
		const createTableSQL = generateJunctionTableSQL(params, provider);

		await sql`${sql.raw(createTableSQL)}`.execute(this.db);
	}

	private applyMultiTenancy(model: string, query: any, ctx?: any): any {
		const resourceConfig =
			this.relationshipManager?.relationshipContext.options.resources.find(
				(r) => r.name === model,
			);

		if (!resourceConfig?.multiTenancy?.enabled || !ctx?.user) return query;

		const field = resourceConfig.multiTenancy.field || "tenantId";
		const contextKey = resourceConfig.multiTenancy.contextKey || "tenantId";
		const tenantId = ctx.user[contextKey];

		if (tenantId) {
			return query.where(`main.${field}`, "=", tenantId);
		}

		return query;
	}
}

export function createKyselyDatabase(config: {
	provider: string;
	url: string;
	autoMigrate?: boolean;
}): Kysely<any> {
	// This is a simplified implementation
	// In a real scenario, you'd handle different database providers
	if (config.provider === "sqlite") {
		let Database;
		let Kysely;
		let SqliteDialect;
		try {
			Database = require("better-sqlite3");
			const kyselyModule = require("kysely");
			Kysely = kyselyModule.Kysely;
			SqliteDialect = kyselyModule.SqliteDialect;
		} catch (error: any) {
			if (error.code === "MODULE_NOT_FOUND") {
				throw new Error(
					"better-sqlite3 is required for SQLite support. Please install it: npm install better-sqlite3",
				);
			}
			throw error;
		}

		const dbPath = config.url.replace(/^sqlite:\/\//, "").replace(/^sqlite:/, "");
		return new Kysely({
			dialect: new SqliteDialect({
				database: new Database(dbPath),
			}),
		});
	} else if (config.provider === "postgres") {
		let Pool;
		let Kysely;
		let PostgresDialect;
		try {
			Pool = require("pg").Pool;
			const kyselyModule = require("kysely");
			Kysely = kyselyModule.Kysely;
			PostgresDialect = kyselyModule.PostgresDialect;
		} catch (error: any) {
			if (error.code === "MODULE_NOT_FOUND") {
				throw new Error(
					"pg is required for PostgreSQL support. Please install it: npm install pg @types/pg",
				);
			}
			throw error;
		}

		return new Kysely({
			dialect: new PostgresDialect({
				pool: new Pool({
					connectionString: config.url,
				}),
			}),
		});
	} else if (config.provider === "mysql") {
		let createPool;
		let Kysely;
		let MysqlDialect;
		try {
			createPool = require("mysql2").createPool;
			const kyselyModule = require("kysely");
			Kysely = kyselyModule.Kysely;
			MysqlDialect = kyselyModule.MysqlDialect;
		} catch (error: any) {
			if (error.code === "MODULE_NOT_FOUND") {
				throw new Error(
					"mysql2 is required for MySQL support. Please install it: npm install mysql2",
				);
			}
			throw error;
		}

		return new Kysely({
			dialect: new MysqlDialect({
				pool: createPool(config.url),
			}),
		});
	}

	throw new Error(`Unsupported database provider: ${config.provider}`);
}

/**
 * Generate CREATE TABLE SQL for a resource
 */
export function generateCreateTableSQL(
	tableName: string,
	fields: Record<string, FieldAttribute>,
	provider: string = "sqlite",
): string {
	const columns: string[] = [];
	const foreignKeys: string[] = [];

	// Always add ID column if not present
	if (!fields.id) {
		if (provider === "postgres") {
			columns.push("id VARCHAR(255) PRIMARY KEY");
		} else {
			columns.push("id TEXT PRIMARY KEY");
		}
	}

	for (const [fieldName, field] of Object.entries(fields)) {
		let columnDef = fieldName;

		// Handle data types
		if (provider === "postgres") {
			switch (field.type) {
				case "string":
					columnDef += field.length ? ` VARCHAR(${field.length})` : " TEXT";
					break;
				case "number":
					columnDef += " NUMERIC";
					break;
				case "boolean":
					columnDef += " BOOLEAN";
					break;
				case "date":
					columnDef += " TIMESTAMP";
					break;
				case "json":
					columnDef += " JSONB";
					break;
			}
		} else {
			// SQLite/MySQL
			switch (field.type) {
				case "string":
					columnDef += " TEXT";
					break;
				case "number":
					columnDef += " REAL";
					break;
				case "boolean":
					columnDef += " INTEGER";
					break;
				case "date":
					columnDef += " TEXT";
					break;
				case "json":
					columnDef += " TEXT";
					break;
			}
		}

		// Add PRIMARY KEY for id field
		if (fieldName === "id") {
			columnDef += " PRIMARY KEY";
		}

		// Handle constraints
		if (field.required && !field.default) {
			columnDef += " NOT NULL";
		}

		if (field.unique) {
			columnDef += " UNIQUE";
		}

		if (field.default !== undefined) {
			// Handle different default value types
			if (typeof field.default === "string") {
				columnDef += ` DEFAULT '${field.default}'`;
			} else if (typeof field.default === "number") {
				columnDef += ` DEFAULT ${field.default}`;
			} else if (typeof field.default === "boolean") {
				columnDef += ` DEFAULT ${field.default ? 1 : 0}`; // SQLite boolean representation
			} else if (field.default instanceof Date) {
				// For date defaults, use CURRENT_TIMESTAMP instead of the actual date string
				columnDef += " DEFAULT CURRENT_TIMESTAMP";
			} else if (Array.isArray(field.default)) {
				// For array defaults (like tags), serialize to JSON string
				columnDef += ` DEFAULT '${JSON.stringify(field.default)}'`;
			} else {
				// For other objects, serialize to JSON
				columnDef += ` DEFAULT '${JSON.stringify(field.default)}'`;
			}
		}

		// Handle foreign key references
		if (field.references) {
			if (provider === "postgres") {
				foreignKeys.push(
					`FOREIGN KEY (${fieldName}) REFERENCES ${field.references.model}(${
						field.references.field
					}) ON DELETE ${
						field.references.onDelete?.toUpperCase() || "CASCADE"
					}`,
				);
			} else {
				// For SQLite, add foreign key constraint separately
				foreignKeys.push(
					`FOREIGN KEY (${fieldName}) REFERENCES ${field.references.model}(${
						field.references.field
					}) ON DELETE ${
						field.references.onDelete?.toUpperCase() || "CASCADE"
					}`,
				);
			}
		}

		columns.push(columnDef);
	}

	// Add standard timestamps if not present
	// Check both camelCase and snake_case variants to avoid duplicates
	if (!fields.createdAt && !fields.created_at) {
		if (provider === "postgres") {
			columns.push("createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
		} else {
			columns.push("createdAt TEXT DEFAULT CURRENT_TIMESTAMP");
		}
	}

	if (!fields.updatedAt && !fields.updated_at) {
		if (provider === "postgres") {
			columns.push("updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
		} else {
			columns.push("updatedAt TEXT DEFAULT CURRENT_TIMESTAMP");
		}
	}

	// Combine columns and foreign keys
	const allConstraints = [...columns, ...foreignKeys];

	return `CREATE TABLE IF NOT EXISTS ${tableName} (\n  ${allConstraints.join(
		",\n  ",
	)}\n)`;
}

/**
 * Generate CREATE TABLE SQL for a junction table
 */
export function generateJunctionTableSQL(
	params: {
		tableName: string;
		sourceKey: string;
		targetKey: string;
		sourceTable: string;
		targetTable: string;
	},
	provider: string = "sqlite",
): string {
	const { tableName, sourceKey, targetKey, sourceTable, targetTable } = params;

	const columns: string[] = [];
	const foreignKeys: string[] = [];

	if (provider === "postgres") {
		columns.push(`${sourceKey} VARCHAR(255) NOT NULL`);
		columns.push(`${targetKey} VARCHAR(255) NOT NULL`);
		columns.push("created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
		columns.push(`PRIMARY KEY (${sourceKey}, ${targetKey})`);

		foreignKeys.push(
			`FOREIGN KEY (${sourceKey}) REFERENCES ${sourceTable}(id) ON DELETE CASCADE`,
			`FOREIGN KEY (${targetKey}) REFERENCES ${targetTable}(id) ON DELETE CASCADE`,
		);
	} else {
		// SQLite/MySQL
		columns.push(`${sourceKey} TEXT NOT NULL`);
		columns.push(`${targetKey} TEXT NOT NULL`);
		columns.push("created_at TEXT DEFAULT CURRENT_TIMESTAMP");
		columns.push(`PRIMARY KEY (${sourceKey}, ${targetKey})`);

		foreignKeys.push(
			`FOREIGN KEY (${sourceKey}) REFERENCES ${sourceTable}(id) ON DELETE CASCADE`,
			`FOREIGN KEY (${targetKey}) REFERENCES ${targetTable}(id) ON DELETE CASCADE`,
		);
	}

	const allConstraints = [...columns, ...foreignKeys];

	return `CREATE TABLE IF NOT EXISTS ${tableName} (\n  ${allConstraints.join(
		",\n  ",
	)}\n)`;
}

/**
 * Creates a Kysely adapter instance (for use with provider config)
 */
export function createKyselyAdapter(options: {
	database: { provider: string; url: string; autoMigrate?: boolean };
}): Kysely<any> | null {
	if (!("provider" in options.database)) {
		return null;
	}

	return createKyselyDatabase(options.database as any);
}

/**
 * Creates a Query adapter using Kysely - follows better-auth pattern
 */
export function kyselyQueryAdapter(
	db: Kysely<any>,
	config?: QueryAdapterConfig,
): QueryAdapter {
	const adapter = new KyselyQueryAdapter(db);

	// Set configuration
	if (config) {
		adapter.config = {
			provider: config.provider,
			transform: config.transform || {
				date: true,
				boolean: config.provider === "sqlite",
			},
		};
	}

	return adapter;
}

// Legacy alias
export const kyselyCrudAdapter = kyselyQueryAdapter;

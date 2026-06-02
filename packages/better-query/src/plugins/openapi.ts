import { z } from "zod";
import { createCrudEndpoint } from "../endpoints/crud-endpoint";
import { Plugin } from "../types/plugins";

/**
 * OpenAPI Plugin Options
 */
export interface OpenAPIPluginOptions {
	/** Path for the OpenAPI JSON spec (default: /openapi.json) */
	specPath?: string;
	/** Path for the Swagger UI (default: /docs) */
	uiPath?: string;
	/** API Information */
	info?: {
		title: string;
		version: string;
		description?: string;
	};
}

/**
 * Simple utility to convert Zod schema to OpenAPI-compatible JSON Schema
 * This is a simplified version. In production, we'd use 'zod-to-openapi'
 */
function generateExample(schema: any): any {
	if (!schema) return undefined;
	if (schema.type === "object" && schema.properties) {
		const example: any = {};
		for (const [key, prop] of Object.entries(schema.properties)) {
			example[key] = generateExample(prop);
		}
		return example;
	}
	if (schema.type === "array") {
		return [generateExample(schema.items)];
	}
	if (schema.default !== undefined) {
		return schema.default;
	}
	if (schema.enum && schema.enum.length > 0) {
		return schema.enum[0];
	}
	if (schema.type === "string") {
		return "example_value";
	}
	if (schema.type === "number") {
		return 0;
	}
	if (schema.type === "boolean") {
		return true;
	}
	return null;
}

function zodToOpenAPI(schema: any, isPartial = false): any {
	if (!schema || !schema._def) {
		return { type: "string" };
	}

	const typeName = schema._def.typeName;
	let resultSchema: any = {};

	if (typeName === "ZodObject") {
		const shape = typeof schema.shape === "object" ? schema.shape : schema._def.shape?.();
		if (!shape) return { type: "object" };
		
		const properties: any = {};
		const required: string[] = [];

		for (const [key, value] of Object.entries(shape)) {
			properties[key] = zodToOpenAPI(value);
			
			// Determine if required
			let current = value as any;
			let isOptional = isPartial;
			
			// Unwrap defaults, optionals, nullables
			while (current && current._def) {
				const innerTypeName = current._def.typeName;
				if (innerTypeName === "ZodOptional" || innerTypeName === "ZodNullable") {
					isOptional = true;
					break;
				}
				if (innerTypeName === "ZodDefault") {
					isOptional = true;
					current = current._def.innerType;
					continue;
				}
				current = current._def.innerType || current._def.schema;
			}
			
			if (!isOptional) {
				required.push(key);
			}
		}

		resultSchema = {
			type: "object",
			properties,
			required: required.length > 0 ? required : undefined,
		};
	} else if (typeName === "ZodString") {
		resultSchema = { type: "string" };
	} else if (typeName === "ZodNumber") {
		resultSchema = { type: "number" };
	} else if (typeName === "ZodBoolean") {
		resultSchema = { type: "boolean" };
	} else if (typeName === "ZodArray") {
		const elementSchema = schema._def.type || schema.element;
		resultSchema = {
			type: "array",
			items: zodToOpenAPI(elementSchema),
		};
	} else if (typeName === "ZodOptional" || typeName === "ZodNullable") {
		resultSchema = zodToOpenAPI(schema._def.innerType);
	} else if (typeName === "ZodDefault") {
		const inner = zodToOpenAPI(schema._def.innerType);
		const defaultValue = typeof schema._def.defaultValue === "function"
			? schema._def.defaultValue()
			: schema._def.defaultValue;
		resultSchema = {
			...inner,
			default: defaultValue,
		};
	} else if (typeName === "ZodEffects") {
		resultSchema = zodToOpenAPI(schema._def.schema);
	} else if (typeName === "ZodEnum") {
		resultSchema = {
			type: "string",
			enum: schema._def.values,
		};
	} else if (typeName === "ZodUnion") {
		const options = schema._def.options || [];
		resultSchema = {
			anyOf: options.map((opt: any) => zodToOpenAPI(opt)),
		};
	} else {
		resultSchema = { type: "string" };
	}

	// Add description if available
	const description = schema.description || schema._def.description;
	if (description) {
		resultSchema.description = description;
	}

	// Add example for root object schemas
	if (typeName === "ZodObject") {
		resultSchema.example = generateExample(resultSchema);
	}

	return resultSchema;
}

/**
 * OpenAPI & Swagger UI Plugin
 */
export function openApiPlugin(options: OpenAPIPluginOptions = {}): Plugin {
	const {
		specPath = "/openapi.json",
		uiPath = "/docs",
		info = {
			title: "Better Query API",
			version: "1.0.0",
			description: "Auto-generated CRUD API documentation",
		},
	} = options;

	return {
		id: "openapi",
		init: () => {},
		endpoints: {
			// OpenAPI JSON Spec
			getOpenApiSpec: createCrudEndpoint(
				specPath,
				{ method: "GET" },
				async (ctx) => {
					const resources = ctx.options.resources || [];
					const paths: any = {};

					for (const resource of resources) {
						const name = resource.name;
						const schema = zodToOpenAPI(resource.schema);
						const updateSchema = zodToOpenAPI(resource.schema, true);

						const enabledEndpoints = {
							create: true,
							read: true,
							update: true,
							delete: true,
							list: true,
							...resource.endpoints,
						};

						// List & Create (Standard REST routes under /${name})
						const resourcePathObj: any = {};
						if (enabledEndpoints.list) {
							resourcePathObj.get = {
								tags: [name],
								summary: `List ${name}s`,
								parameters: [
									{
										name: "page",
										in: "query",
										description: "Page number",
										required: false,
										schema: { type: "integer", default: 1 },
									},
									{
										name: "limit",
										in: "query",
										description: "Items per page",
										required: false,
										schema: { type: "integer", default: 10 },
									},
									{
										name: "search",
										in: "query",
										description: "Search query string",
										required: false,
										schema: { type: "string" },
									},
									{
										name: "q",
										in: "query",
										description: "Alternative search query string",
										required: false,
										schema: { type: "string" },
									},
									{
										name: "searchFields",
										in: "query",
										description: "Comma-separated list of fields to search",
										required: false,
										schema: { type: "string" },
									},
									{
										name: "sortBy",
										in: "query",
										description: "Field to sort by",
										required: false,
										schema: { type: "string" },
									},
									{
										name: "sortOrder",
										in: "query",
										description: "Sort order direction",
										required: false,
										schema: { type: "string", enum: ["asc", "desc"], default: "asc" },
									},
									{
										name: "include",
										in: "query",
										description: "Include related resources",
										required: false,
										schema: { type: "string" },
									},
									{
										name: "select",
										in: "query",
										description: "Select specific fields (JSON string or comma-separated list)",
										required: false,
										schema: { type: "string" },
									},
									{
										name: "filters",
										in: "query",
										description: "JSON string of advanced filters. Format: `{\"field\": {\"value\": \"val\", \"operator\": \"eq\"|\"ne\"|\"like\"|\"in\"}}`. Example: `{\"status\": {\"value\": \"todo\", \"operator\": \"eq\"}}`",
										required: false,
										schema: { type: "string" },
									},
									{
										name: "where",
										in: "query",
										description: "JSON string of exact-match key-value conditions. Format: `{\"field\": \"value\"}`. Example: `{\"status\": \"todo\"}`",
										required: false,
										schema: { type: "string" },
									},
									{
										name: "dateRange",
										in: "query",
										description: "JSON string for date range filtering. Format: `{\"field\": \"fieldName\", \"start\": \"ISO_date\", \"end\": \"ISO_date\"}`. Example: `{\"field\": \"createdAt\", \"start\": \"2026-06-01T00:00:00Z\"}`",
										required: false,
										schema: { type: "string" },
									},
								],
								responses: {
									200: {
										description: "Successful response",
										content: {
											"application/json": {
												schema: {
													type: "object",
													properties: {
														items: {
															type: "array",
															items: schema,
														},
														pagination: {
															type: "object",
															properties: {
																page: { type: "number" },
																limit: { type: "number" },
																total: { type: "number" },
																totalPages: { type: "number" },
																hasNext: { type: "boolean" },
																hasPrev: { type: "boolean" },
															},
															required: ["page", "limit", "total", "totalPages", "hasNext", "hasPrev"],
														},
													},
													required: ["items", "pagination"],
												},
											},
										},
									},
								},
							};
						}

						if (enabledEndpoints.create) {
							resourcePathObj.post = {
								tags: [name],
								summary: `Create ${name}`,
								requestBody: {
									content: { "application/json": { schema } },
								},
								responses: {
									201: {
										description: "Created",
										content: { "application/json": { schema } },
									},
								},
							};
						}

						if (Object.keys(resourcePathObj).length > 0) {
							paths[`/${name}`] = resourcePathObj;
						}

						// Read, Update, Delete (Standard REST routes under /${name}/{id})
						const detailPathObj: any = {};
						if (enabledEndpoints.read) {
							detailPathObj.get = {
								tags: [name],
								summary: `Get ${name} by ID`,
								parameters: [
									{
										name: "id",
										in: "path",
										required: true,
										schema: { type: "string" },
									},
								],
								responses: {
									200: {
										description: "OK",
										content: { "application/json": { schema } },
									},
								},
							};
						}

						if (enabledEndpoints.update) {
							detailPathObj.patch = {
								tags: [name],
								summary: `Update ${name}`,
								parameters: [
									{
										name: "id",
										in: "path",
										required: true,
										schema: { type: "string" },
									},
								],
								requestBody: { content: { "application/json": { schema: updateSchema } } },
								responses: {
									200: {
										description: "Updated",
										content: { "application/json": { schema } },
									},
								},
							};
						}

						if (enabledEndpoints.delete) {
							detailPathObj.delete = {
								tags: [name],
								summary: `Delete ${name}`,
								parameters: [
									{
										name: "id",
										in: "path",
										required: true,
										schema: { type: "string" },
									},
								],
								responses: { 204: { description: "Deleted" } },
							};
						}

						if (Object.keys(detailPathObj).length > 0) {
							paths[`/${name}/{id}`] = detailPathObj;
						}

						// Relationship endpoints documentation
						if (resource.relationshipsEndpoints !== false && resource.relationships) {
							for (const [relationName, configVal] of Object.entries(resource.relationships)) {
								const relationConfig = configVal as any;
								if (
									relationConfig.type === "hasMany" ||
									relationConfig.type === "belongsToMany" ||
									relationConfig.type === "hasOne"
								) {
									const targetResourceName = relationConfig.target;
									const targetResource = resources.find((r: any) => r.name === targetResourceName);
									if (!targetResource) continue;

									const targetSchema = zodToOpenAPI(targetResource.schema);
									const pathStr = `/${name}/{parentId}/${relationName}`;
									
									paths[pathStr] = {
										get: {
											tags: [name],
											summary: `List ${relationName} for a given ${name}`,
											parameters: [
												{
													name: "parentId",
													in: "path",
													required: true,
													description: `ID of the parent ${name}`,
													schema: { type: "string" },
												},
												{
													name: "page",
													in: "query",
													description: "Page number",
													required: false,
													schema: { type: "integer", default: 1 },
												},
												{
													name: "limit",
													in: "query",
													description: "Items per page",
													required: false,
													schema: { type: "integer", default: 10 },
												},
											],
											responses: {
												200: {
													description: "Successful response",
													content: {
														"application/json": {
															schema: {
																type: "object",
																properties: {
																	items: {
																		type: "array",
																		items: targetSchema,
																	},
																	pagination: {
																		type: "object",
																		properties: {
																			page: { type: "number" },
																			limit: { type: "number" },
																			total: { type: "number" },
																			totalPages: { type: "number" },
																			hasNext: { type: "boolean" },
																			hasPrev: { type: "boolean" },
																		},
																		required: ["page", "limit", "total", "totalPages", "hasNext", "hasPrev"],
																	},
																},
																required: ["items", "pagination"],
															},
														},
													},
												},
											},
										},
										post: {
											tags: [name],
											summary: `Create ${targetResourceName} under ${name}`,
											parameters: [
												{
													name: "parentId",
													in: "path",
													required: true,
													description: `ID of the parent ${name}`,
													schema: { type: "string" },
												},
											],
											requestBody: {
												content: { "application/json": { schema: targetSchema } },
											},
											responses: {
												201: {
													description: "Created",
													content: { "application/json": { schema: targetSchema } },
												},
											},
										},
									};
								}
							}
						}
					}

					const basePath = ctx.options.basePath || "/api/query";
					return ctx.json({
						openapi: "3.0.0",
						info,
						servers: [
							{
								url: basePath,
								description: "API Server Base Path",
							},
						],
						paths,
					});
				},
			),

			// Scalar API Reference (HTML)
			getSwaggerUI: createCrudEndpoint(
				uiPath,
				{ method: "GET" },
				async (ctx) => {
					const basePath = ctx.options.basePath || "/api/query";
					const resolvedSpecPath = specPath.startsWith("/")
						? `${basePath}${specPath}`
						: `${basePath}/${specPath}`;
					const html = `
						<!DOCTYPE html>
						<html lang="en">
						<head>
							<meta charset="utf-8" />
							<meta name="viewport" content="width=device-width, initial-scale=1" />
							<title>${info.title} - API Reference</title>
							<style>
								body {
									margin: 0;
								}
							</style>
						</head>
						<body>
							<script
								id="api-reference"
								data-url="${resolvedSpecPath}"
								data-configuration='{"theme": "saturn", "showSidebar": true, "layout": "modern"}'></script>
							<script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
						</body>
						</html>
					`;
					return new Response(html, {
						headers: { "Content-Type": "text/html" },
					});
				},
			),
		},
	};
}

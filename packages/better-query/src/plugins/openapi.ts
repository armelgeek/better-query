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
										schema: { type: "string", example: "example_search" },
									},
									{
										name: "searchFields",
										in: "query",
										description: "Comma-separated list of fields to search",
										required: false,
										schema: { type: "string", example: "name,description" },
									},
									{
										name: "sortBy",
										in: "query",
										description: "Field to sort by",
										required: false,
										schema: { type: "string", example: "createdAt" },
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
										schema: { type: "string", example: "tasks" },
									},
									{
										name: "select",
										in: "query",
										description: "Select specific fields (JSON string or comma-separated list)",
										required: false,
										schema: { type: "string", example: "name,description" },
									},
									{
										name: "filters",
										in: "query",
										description: "JSON string of advanced filters. Format: `{\"field\": {\"value\": \"val\", \"operator\": \"eq\"|\"ne\"|\"like\"|\"in\"}}`. Example: `{\"status\": {\"value\": \"todo\", \"operator\": \"eq\"}}`",
										required: false,
										schema: { type: "string", example: "{\"status\": {\"value\": \"active\", \"operator\": \"eq\"}}" },
									},
									{
										name: "where",
										in: "query",
										description: "JSON string of exact-match key-value conditions. Format: `{\"field\": \"value\"}`. Example: `{\"status\": \"todo\"}`",
										required: false,
										schema: { type: "string", example: "{\"status\": \"active\"}" },
									},
									{
										name: "dateRange",
										in: "query",
										description: "JSON string for date range filtering. Format: `{\"field\": \"fieldName\", \"start\": \"ISO_date\", \"end\": \"ISO_date\"}`. Example: `{\"field\": \"createdAt\", \"start\": \"2026-06-01T00:00:00Z\"}`",
										required: false,
										schema: { type: "string", example: "{\"field\": \"createdAt\", \"start\": \"2026-06-01T00:00:00Z\", \"end\": \"2026-06-30T23:59:59Z\"}" },
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

					// Dynamic documentation for Storage and Upload plugins
					const storagePluginInstance = ctx.options.plugins?.find((p: any) => p.id === "storage");
					const uploadPluginInstance = ctx.options.plugins?.find((p: any) => p.id === "upload");

					if (storagePluginInstance) {
						const uploadPath = "/upload";
						paths[uploadPath] = {
							post: {
								tags: ["Storage"],
								summary: "Upload file or image directly to storage",
								description: "Upload a file or image directly to the storage provider via Multipart Form Data",
								requestBody: {
									content: {
										"multipart/form-data": {
											schema: {
												type: "object",
												properties: {
													file: {
														type: "string",
														format: "binary",
														description: "The file or image to upload",
													},
													path: {
														type: "string",
														description: "Optional folder/sub-directory path to upload to",
													},
												},
												required: ["file"],
											},
										},
									},
								},
								responses: {
									200: {
										description: "Upload successful",
										content: {
											"application/json": {
												schema: {
													type: "object",
													properties: {
														url: { type: "string", description: "The public URL of the uploaded file" },
														key: { type: "string", description: "The storage key of the uploaded file" },
														size: { type: "number", description: "The file size in bytes" },
													},
													required: ["url", "key", "size"],
												},
											},
										},
									},
								},
							},
						};

						paths[`${uploadPath}/signed-url`] = {
							get: {
								tags: ["Storage"],
								summary: "Get signed URL for storage key",
								description: "Generate a signed URL for a specific file key",
								parameters: [
									{
										name: "key",
										in: "query",
										schema: { type: "string" },
										required: true,
										description: "The storage key of the file",
									},
								],
								responses: {
									200: {
										description: "Signed URL generated successfully",
										content: {
											"application/json": {
												schema: {
													type: "object",
													properties: {
														url: { type: "string", description: "The temporary signed URL to access the file" },
													},
													required: ["url"],
												},
											},
										},
									},
								},
							},
						};
					}

					if (uploadPluginInstance) {
						paths["/upload/file"] = {
							post: {
								tags: ["Upload"],
								summary: "Upload Base64 file",
								description: "Upload a file or image as a Base64-encoded string",
								requestBody: {
									content: {
										"application/json": {
											schema: {
												type: "object",
												properties: {
													file: { type: "string", description: "Base64 encoded file string" },
													filename: { type: "string", description: "Original filename" },
													mimeType: { type: "string", description: "MIME type (e.g. image/png)" },
													metadata: { type: "object", description: "Additional metadata" },
												},
												required: ["file", "filename", "mimeType"],
											},
										},
									},
								},
								responses: {
									201: {
										description: "File uploaded successfully",
										content: {
											"application/json": {
												schema: {
													type: "object",
													properties: {
														id: { type: "string" },
														filename: { type: "string" },
														originalName: { type: "string" },
														mimeType: { type: "string" },
														size: { type: "number" },
														path: { type: "string" },
														url: { type: "string" },
														uploadedAt: { type: "string" },
													},
												},
											},
										},
									},
								},
							},
						};

						paths["/upload/file/{id}"] = {
							get: {
								tags: ["Upload"],
								summary: "Get file metadata by ID",
								description: "Get metadata for an uploaded file by ID",
								parameters: [
									{
										name: "id",
										in: "path",
										schema: { type: "string" },
										required: true,
									},
								],
								responses: {
									200: {
										description: "File metadata retrieved successfully",
									},
								},
							},
							delete: {
								tags: ["Upload"],
								summary: "Delete uploaded file by ID",
								description: "Delete an uploaded file from storage and database",
								parameters: [
									{
										name: "id",
										in: "path",
										schema: { type: "string" },
										required: true,
									},
								],
								responses: {
									200: {
										description: "File deleted successfully",
									},
								},
							},
						};

						paths["/upload/download/{id}"] = {
							get: {
								tags: ["Upload"],
								summary: "Download or stream file",
								description: "Download or stream the file content by ID",
								parameters: [
									{
										name: "id",
										in: "path",
										schema: { type: "string" },
										required: true,
									},
								],
								responses: {
									200: {
										description: "File stream/download success",
									},
								},
							},
						};

						paths["/upload/files"] = {
							get: {
								tags: ["Upload"],
								summary: "List all uploaded files",
								description: "List all uploaded files with pagination and filtering",
								parameters: [
									{ name: "page", in: "query", schema: { type: "number" } },
									{ name: "limit", in: "query", schema: { type: "number" } },
									{ name: "mimeType", in: "query", schema: { type: "string" } },
								],
								responses: {
									200: {
										description: "List of files retrieved successfully",
									},
								},
							},
						};
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

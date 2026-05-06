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
function zodToOpenAPI(schema: z.ZodType<any>): any {
	if (schema instanceof z.ZodObject) {
		const shape = schema.shape;
		const properties: any = {};
		const required: string[] = [];

		for (const [key, value] of Object.entries(shape)) {
			properties[key] = zodToOpenAPI(value as z.ZodType<any>);
			if (!(value instanceof z.ZodOptional) && !(value instanceof z.ZodDefault)) {
				required.push(key);
			}
		}

		return {
			type: "object",
			properties,
			required: required.length > 0 ? required : undefined,
		};
	}

	if (schema instanceof z.ZodString) return { type: "string" };
	if (schema instanceof z.ZodNumber) return { type: "number" };
	if (schema instanceof z.ZodBoolean) return { type: "boolean" };
	if (schema instanceof z.ZodArray) {
		return {
			type: "array",
			items: zodToOpenAPI(schema.element),
		};
	}
	if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
		return zodToOpenAPI(schema._def.innerType);
	}

	return { type: "string" }; // Fallback
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
		init: () => { },
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

						// List & Create
						paths[`/${name}`] = {
							get: {
								tags: [name],
								summary: `List ${name}s`,
								responses: {
									200: {
										description: "Successful response",
										content: { "application/json": { schema: { type: "array", items: schema } } }
									}
								}
							},
							post: {
								tags: [name],
								summary: `Create ${name}`,
								requestBody: {
									content: { "application/json": { schema } }
								},
								responses: {
									201: { description: "Created" }
								}
							}
						};

						// Read, Update, Delete
						paths[`/${name}/{id}`] = {
							get: {
								tags: [name],
								summary: `Get ${name} by ID`,
								parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
								responses: { 200: { description: "OK", content: { "application/json": { schema } } } }
							},
							patch: {
								tags: [name],
								summary: `Update ${name}`,
								parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
								requestBody: { content: { "application/json": { schema } } },
								responses: { 200: { description: "Updated" } }
							},
							delete: {
								tags: [name],
								summary: `Delete ${name}`,
								parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
								responses: { 204: { description: "Deleted" } }
							}
						};
					}

					return ctx.json({
						openapi: "3.0.0",
						info,
						paths,
					});
				}
			),

			// Swagger UI (HTML)
			getSwaggerUI: createCrudEndpoint(
				uiPath,
				{ method: "GET" },
				async (ctx) => {
					const html = `
						<!DOCTYPE html>
						<html lang="en">
						<head>
							<meta charset="utf-8" />
							<meta name="viewport" content="width=device-width, initial-scale=1" />
							<title>${info.title} - Swagger UI</title>
							<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
						</head>
						<body>
							<div id="swagger-ui"></div>
							<script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
							<script>
								window.onload = () => {
									window.ui = SwaggerUIBundle({
										url: '${specPath}',
										dom_id: '#swagger-ui',
										deepLinking: true,
										presets: [SwaggerUIBundle.presets.apis],
									});
								};
							</script>
						</body>
						</html>
					`;
					return new Response(html, { headers: { "Content-Type": "text/html" } });
				}
			)
		}
	};
}

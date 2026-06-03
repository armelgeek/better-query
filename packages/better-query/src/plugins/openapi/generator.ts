import { ZodObject, ZodOptional, ZodSchema, ZodType } from "zod";
import type { CrudContext } from "../../types";

export interface OpenAPIPath {
	get?: {
		tags?: string[];
		operationId?: string;
		description?: string;
		security?: [{ bearerAuth: string[] }];
		parameters?: Array<{
			name: string;
			in: "query" | "path" | "header";
			schema: {
				type?: "string" | "number" | "boolean" | "array" | "object";
				format?: string;
			};
			required?: boolean;
		}>;
		responses?: {
			[key in string]: {
				description?: string;
				content: {
					"application/json": {
						schema: any;
					};
				};
			};
		};
	};
	post?: {
		tags?: string[];
		operationId?: string;
		description?: string;
		security?: [{ bearerAuth: string[] }];
		parameters?: Array<{
			name: string;
			in: "query" | "path" | "header";
			schema: {
				type?: "string" | "number" | "boolean" | "array" | "object";
			};
			required?: boolean;
		}>;
		requestBody?: {
			content: {
				"application/json": {
					schema: any;
				};
			};
		};
		responses?: {
			[key in string]: {
				description?: string;
				content: {
					"application/json": {
						schema: any;
					};
				};
			};
		};
	};
	put?: {
		tags?: string[];
		operationId?: string;
		description?: string;
		security?: [{ bearerAuth: string[] }];
		parameters?: Array<{
			name: string;
			in: "query" | "path" | "header";
			schema: {
				type?: "string" | "number" | "boolean" | "array" | "object";
			};
			required?: boolean;
		}>;
		requestBody?: {
			content: {
				"application/json": {
					schema: any;
				};
			};
		};
		responses?: {
			[key in string]: {
				description?: string;
				content: {
					"application/json": {
						schema: any;
					};
				};
			};
		};
	};
	patch?: {
		tags?: string[];
		operationId?: string;
		description?: string;
		security?: [{ bearerAuth: string[] }];
		parameters?: Array<{
			name: string;
			in: "query" | "path" | "header";
			schema: {
				type?: "string" | "number" | "boolean" | "array" | "object";
			};
			required?: boolean;
		}>;
		requestBody?: {
			content: {
				"application/json": {
					schema: any;
				};
			};
		};
		responses?: {
			[key in string]: {
				description?: string;
				content: {
					"application/json": {
						schema: any;
					};
				};
			};
		};
	};
	delete?: {
		tags?: string[];
		operationId?: string;
		description?: string;
		security?: [{ bearerAuth: string[] }];
		parameters?: Array<{
			name: string;
			in: "query" | "path" | "header";
			schema: {
				type?: "string" | "number" | "boolean" | "array" | "object";
			};
			required?: boolean;
		}>;
		responses?: {
			[key in string]: {
				description?: string;
				content: {
					"application/json": {
						schema: any;
					};
				};
			};
		};
	};
}

type AllowedType = "string" | "number" | "boolean" | "array" | "object";

function processZodType(zodType: ZodType<any>): any {
	const typeName = (zodType as any)?._def?.typeName;

	// Handle optional types
	if (typeName === "ZodOptional") {
		const innerType = (zodType as any)._def.innerType;
		const innerSchema = processZodType(innerType);
		return {
			...innerSchema,
			nullable: true,
		};
	}

	// Handle object types
	if (typeName === "ZodObject") {
		const shape = (zodType as any).shape;
		if (shape) {
			const properties: Record<string, any> = {};
			const required: string[] = [];
			Object.entries(shape).forEach(([key, value]) => {
				if (value && typeof value === "object" && "_def" in value) {
					properties[key] = processZodType(value as ZodType<any>);
					if ((value as any)?._def?.typeName !== "ZodOptional") {
						required.push(key);
					}
				}
			});
			return {
				type: "object",
				properties,
				...(required.length > 0 ? { required } : {}),
				description: (zodType as any).description,
			};
		}
	}

	// For primitive types, get the type from ZodType
	const type = getTypeFromZodType(zodType);
	return {
		type,
		description: (zodType as any).description,
	};
}

function getTypeFromZodType(zodType: ZodType<any>): AllowedType {
	const typeName = (zodType as any)._def?.typeName;

	switch (typeName) {
		case "ZodString":
			return "string";
		case "ZodNumber":
			return "number";
		case "ZodBoolean":
			return "boolean";
		case "ZodArray":
			return "array";
		case "ZodObject":
			return "object";
		case "ZodRecord":
			return "object";
		case "ZodEnum":
			return "string";
		case "ZodUnion":
			return "string"; // Default for unions
		case "ZodLiteral":
			return "string";
		default:
			return "string";
	}
}

function getStandardResponses(): any {
	return {
		"400": {
			description: "Bad Request - Invalid parameters or request body",
			content: {
				"application/json": {
					schema: {
						type: "object" as const,
						properties: {
							error: { type: "string" as const },
							message: { type: "string" as const },
						},
						required: ["error", "message"],
					},
				},
			},
		},
		"401": {
			description: "Unauthorized - Authentication required",
			content: {
				"application/json": {
					schema: {
						type: "object" as const,
						properties: {
							error: { type: "string" as const },
							message: { type: "string" as const },
						},
						required: ["error", "message"],
					},
				},
			},
		},
		"403": {
			description: "Forbidden - Insufficient permissions",
			content: {
				"application/json": {
					schema: {
						type: "object" as const,
						properties: {
							error: { type: "string" as const },
							message: { type: "string" as const },
						},
						required: ["error", "message"],
					},
				},
			},
		},
		"404": {
			description: "Not Found - Resource not found",
			content: {
				"application/json": {
					schema: {
						type: "object" as const,
						properties: {
							error: { type: "string" as const },
							message: { type: "string" as const },
						},
						required: ["error", "message"],
					},
				},
			},
		},
		"500": {
			description: "Internal Server Error",
			content: {
				"application/json": {
					schema: {
						type: "object" as const,
						properties: {
							error: { type: "string" as const },
							message: { type: "string" as const },
						},
						required: ["error", "message"],
					},
				},
			},
		},
	};
}

function generateResourceSchema(schema: ZodSchema): any {
	const processedSchema = processZodType(schema);
	return {
		type: "object",
		properties: {
			id: { type: "string", description: "Unique identifier" },
			...processedSchema.properties,
			createdAt: {
				type: "string",
				format: "date-time",
				description: "Creation timestamp",
			},
			updatedAt: {
				type: "string",
				format: "date-time",
				description: "Last update timestamp",
			},
		},
		required: ["id", ...(processedSchema.required || [])],
	};
}

function generatePaginatedResponse(resourceSchema: any): any {
	return {
		type: "object",
		properties: {
			data: {
				type: "array",
				items: resourceSchema,
			},
			pagination: {
				type: "object",
				properties: {
					page: { type: "number", description: "Current page number" },
					limit: { type: "number", description: "Items per page" },
					total: { type: "number", description: "Total number of items" },
					totalPages: { type: "number", description: "Total number of pages" },
				},
				required: ["page", "limit", "total", "totalPages"],
			},
		},
		required: ["data", "pagination"],
	};
}

export async function generator(context: CrudContext): Promise<any> {
	const { options } = context;
	const paths: Record<string, OpenAPIPath> = {};
	const components: Record<string, any> = {
		schemas: {},
	};

	// Generate schemas and paths for each resource
	for (const resource of options.resources) {
		const resourceName = resource.name;
		const capitalizedName =
			resourceName.charAt(0).toUpperCase() + resourceName.slice(1);

		// Generate schema for the resource
		const resourceSchema = generateResourceSchema(
			resource.schema,
		);
		components.schemas[capitalizedName] = resourceSchema;

		// Generate paginated list response schema
		components.schemas[`${capitalizedName}List`] = generatePaginatedResponse({
			$ref: `#/components/schemas/${capitalizedName}`,
		});

		// Generate input schema for create/update operations
		const inputSchema = processZodType(resource.schema);
		components.schemas[`${capitalizedName}Input`] = {
			type: "object",
			properties: inputSchema.properties,
			required: inputSchema.required,
		};

		// Generate CRUD endpoints
		const listPath = `/${resourceName}/list`;
		const createPath = `/${resourceName}/create`;
		const getPath = `/${resourceName}/get/{id}`;
		const updatePath = `/${resourceName}/update/{id}`;
		const deletePath = `/${resourceName}/delete/{id}`;

		// LIST endpoint
		if (resource.endpoints?.list !== false) {
			paths[listPath] = {
				get: {
					tags: [capitalizedName],
					operationId: `list${capitalizedName}s`,
					description: `List all ${resourceName} items with pagination`,
					parameters: [
						{
							name: "page",
							in: "query",
							schema: { type: "number" },
						},
						{
							name: "limit",
							in: "query",
							schema: { type: "number" },
						},
						{
							name: "search",
							in: "query",
							schema: { type: "string" },
						},
						{
							name: "include",
							in: "query",
							schema: { type: "string" },
						},
					],
					responses: {
						"200": {
							description: `List of ${resourceName} items`,
							content: {
								"application/json": {
									schema: {
										$ref: `#/components/schemas/${capitalizedName}List`,
									},
								},
							},
						},
						...getStandardResponses(),
					},
				},
			};
		}

		// CREATE endpoint
		if (resource.endpoints?.create !== false) {
			paths[createPath] = {
				...paths[createPath],
				post: {
					tags: [capitalizedName],
					operationId: `create${capitalizedName}`,
					description: `Create a new ${resourceName}`,
					requestBody: {
						content: {
							"application/json": {
								schema: {
									$ref: `#/components/schemas/${capitalizedName}Input`,
								},
							},
						},
					},
					responses: {
						"201": {
							description: `Created ${resourceName}`,
							content: {
								"application/json": {
									schema: {
										$ref: `#/components/schemas/${capitalizedName}`,
									},
								},
							},
						},
						...getStandardResponses(),
					},
				},
			};
		}

		// READ endpoint
		if (resource.endpoints?.read !== false) {
			paths[getPath] = {
				get: {
					tags: [capitalizedName],
					operationId: `get${capitalizedName}`,
					description: `Get a ${resourceName} by ID`,
					parameters: [
						{
							name: "id",
							in: "path",
							schema: { type: "string" },
							required: true,
						},
						{
							name: "include",
							in: "query",
							schema: { type: "string" },
						},
					],
					responses: {
						"200": {
							description: `${capitalizedName} details`,
							content: {
								"application/json": {
									schema: {
										$ref: `#/components/schemas/${capitalizedName}`,
									},
								},
							},
						},
						...getStandardResponses(),
					},
				},
			};
		}

		// UPDATE endpoint
		if (resource.endpoints?.update !== false) {
			paths[updatePath] = {
				...paths[updatePath],
				patch: {
					tags: [capitalizedName],
					operationId: `update${capitalizedName}`,
					description: `Update a ${resourceName}`,
					parameters: [
						{
							name: "id",
							in: "path",
							schema: { type: "string" },
							required: true,
						},
					],
					requestBody: {
						content: {
							"application/json": {
								schema: {
									$ref: `#/components/schemas/${capitalizedName}Input`,
								},
							},
						},
					},
					responses: {
						"200": {
							description: `Updated ${resourceName}`,
							content: {
								"application/json": {
									schema: {
										$ref: `#/components/schemas/${capitalizedName}`,
									},
								},
							},
						},
						...getStandardResponses(),
					},
				},
			};
		}

		// DELETE endpoint
		if (resource.endpoints?.delete !== false) {
			paths[deletePath] = {
				...paths[deletePath],
				delete: {
					tags: [capitalizedName],
					operationId: `delete${capitalizedName}`,
					description: `Delete a ${resourceName}`,
					parameters: [
						{
							name: "id",
							in: "path",
							schema: { type: "string" },
							required: true,
						},
					],
					responses: {
						"200": {
							description: `${capitalizedName} deleted successfully`,
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											success: { type: "boolean" },
											message: { type: "string" },
										},
									},
								},
							},
						},
						...getStandardResponses(),
					},
				},
			};
		}
	}

	// Add OpenAPI plugin endpoints
	paths["/openapi/schema"] = {
		get: {
			tags: ["OpenAPI"],
			operationId: "getOpenAPISchema",
			description: "Get the OpenAPI schema for this CRUD API",
			responses: {
				"200": {
					description: "OpenAPI schema",
					content: {
						"application/json": {
							schema: {
								type: "object",
							},
						},
					},
				},
			},
		},
	};

	const storagePluginInstance = options.plugins?.find((p) => p.id === "storage");
	const uploadPluginInstance = options.plugins?.find((p) => p.id === "upload");

	if (storagePluginInstance) {
		const uploadPath = "/upload";
		paths[uploadPath] = {
			post: {
				tags: ["Storage"],
				operationId: "uploadFile",
				description: "Upload a file or image directly to the storage provider",
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
					"200": {
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
					...getStandardResponses(),
				},
			},
		};

		paths[`${uploadPath}/signed-url`] = {
			get: {
				tags: ["Storage"],
				operationId: "getSignedUrl",
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
					"200": {
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
					...getStandardResponses(),
				},
			},
		};
	}

	if (uploadPluginInstance) {
		paths["/upload/file"] = {
			post: {
				tags: ["Upload"],
				operationId: "uploadBase64File",
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
					"201": {
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
					...getStandardResponses(),
				},
			},
		};

		paths["/upload/file/{id}"] = {
			get: {
				tags: ["Upload"],
				operationId: "getFileMetadata",
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
					"200": {
						description: "File metadata retrieved successfully",
					},
					...getStandardResponses(),
				},
			},
			delete: {
				tags: ["Upload"],
				operationId: "deleteFile",
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
					"200": {
						description: "File deleted successfully",
					},
					...getStandardResponses(),
				},
			},
		};

		paths["/upload/download/{id}"] = {
			get: {
				tags: ["Upload"],
				operationId: "downloadFile",
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
					"200": {
						description: "File stream/download success",
					},
					...getStandardResponses(),
				},
			},
		};

		paths["/upload/files"] = {
			get: {
				tags: ["Upload"],
				operationId: "listFiles",
				description: "List all uploaded files with pagination and filtering",
				parameters: [
					{ name: "page", in: "query", schema: { type: "number" } },
					{ name: "limit", in: "query", schema: { type: "number" } },
					{ name: "mimeType", in: "query", schema: { type: "string" } },
				],
				responses: {
					"200": {
						description: "List of files retrieved successfully",
					},
					...getStandardResponses(),
				},
			},
		};
	}

	const basePath = options.basePath || "/api";

	return {
		openapi: "3.1.0",
		info: {
			title: options.appName ? `${options.appName} API` : "Better Query API",
			description:
				"Auto-generated API documentation for Better Query resources",
			version: "1.0.0",
		},
		servers: [
			{
				url: basePath,
				description: "Better Query API Server",
			},
		],
		components,
		paths,
		tags: [
			...options.resources.map((resource) => ({
				name: resource.name.charAt(0).toUpperCase() + resource.name.slice(1),
				description: `Operations for ${resource.name} resource`,
			})),
			...(storagePluginInstance ? [{
				name: "Storage",
				description: "File and image storage operations",
			}] : []),
			...(uploadPluginInstance ? [{
				name: "Upload",
				description: "File and image upload tracking operations",
			}] : []),
			{
				name: "OpenAPI",
				description: "OpenAPI specification endpoints",
			},
		],
	};
}

#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
	Tool,
} from "@modelcontextprotocol/sdk/types.js";

/**
 * Better Query MCP Server
 * 
 * Provides AI assistants with tools to interact with better-query instances:
 * - Discover resources and their schemas
 * - Perform CRUD operations
 * - Navigate relationships
 * - Query plugin information
 */

// Define available tools
const TOOLS: Tool[] = [
	{
		name: "list_resources",
		description:
			"List all available resources in the better-query instance with their schemas and configurations",
		inputSchema: {
			type: "object",
			properties: {},
			required: [],
		},
	},
	{
		name: "get_resource_schema",
		description:
			"Get the detailed schema for a specific resource including fields, types, and validations",
		inputSchema: {
			type: "object",
			properties: {
				resourceName: {
					type: "string",
					description: "The name of the resource to get schema for",
				},
			},
			required: ["resourceName"],
		},
	},
	{
		name: "list_resource_items",
		description:
			"List items from a resource with optional filtering, pagination, and sorting",
		inputSchema: {
			type: "object",
			properties: {
				resourceName: {
					type: "string",
					description: "The name of the resource to list items from",
				},
				filters: {
					type: "object",
					description: "Optional filters to apply (field: value pairs)",
					additionalProperties: true,
				},
				limit: {
					type: "number",
					description: "Maximum number of items to return (default: 50)",
					default: 50,
				},
				offset: {
					type: "number",
					description: "Number of items to skip (default: 0)",
					default: 0,
				},
				orderBy: {
					type: "string",
					description: "Field to sort by",
				},
				orderDirection: {
					type: "string",
					enum: ["asc", "desc"],
					description: "Sort direction (asc or desc)",
					default: "asc",
				},
			},
			required: ["resourceName"],
		},
	},
	{
		name: "get_resource_item",
		description: "Get a single item from a resource by its ID",
		inputSchema: {
			type: "object",
			properties: {
				resourceName: {
					type: "string",
					description: "The name of the resource",
				},
				id: {
					type: "string",
					description: "The ID of the item to retrieve",
				},
			},
			required: ["resourceName", "id"],
		},
	},
	{
		name: "create_resource_item",
		description: "Create a new item in a resource",
		inputSchema: {
			type: "object",
			properties: {
				resourceName: {
					type: "string",
					description: "The name of the resource",
				},
				data: {
					type: "object",
					description: "The data for the new item",
					additionalProperties: true,
				},
			},
			required: ["resourceName", "data"],
		},
	},
	{
		name: "update_resource_item",
		description: "Update an existing item in a resource",
		inputSchema: {
			type: "object",
			properties: {
				resourceName: {
					type: "string",
					description: "The name of the resource",
				},
				id: {
					type: "string",
					description: "The ID of the item to update",
				},
				data: {
					type: "object",
					description: "The data to update",
					additionalProperties: true,
				},
			},
			required: ["resourceName", "id", "data"],
		},
	},
	{
		name: "delete_resource_item",
		description: "Delete an item from a resource by its ID",
		inputSchema: {
			type: "object",
			properties: {
				resourceName: {
					type: "string",
					description: "The name of the resource",
				},
				id: {
					type: "string",
					description: "The ID of the item to delete",
				},
			},
			required: ["resourceName", "id"],
		},
	},
	{
		name: "get_resource_relationships",
		description: "Get relationship information for a resource",
		inputSchema: {
			type: "object",
			properties: {
				resourceName: {
					type: "string",
					description: "The name of the resource",
				},
			},
			required: ["resourceName"],
		},
	},
	{
		name: "get_related_items",
		description:
			"Get items related to a specific resource item through a relationship",
		inputSchema: {
			type: "object",
			properties: {
				resourceName: {
					type: "string",
					description: "The name of the resource",
				},
				itemId: {
					type: "string",
					description: "The ID of the item",
				},
				relationshipName: {
					type: "string",
					description: "The name of the relationship to follow",
				},
			},
			required: ["resourceName", "itemId", "relationshipName"],
		},
	},
	{
		name: "list_plugins",
		description: "List all active plugins in the better-query instance",
		inputSchema: {
			type: "object",
			properties: {},
			required: [],
		},
	},
	{
		name: "get_plugin_info",
		description: "Get detailed information about a specific plugin",
		inputSchema: {
			type: "object",
			properties: {
				pluginId: {
					type: "string",
					description: "The ID of the plugin",
				},
			},
			required: ["pluginId"],
		},
	},
	{
		name: "execute_custom_operation",
		description:
			"Execute a custom operation defined by an adapter or plugin",
		inputSchema: {
			type: "object",
			properties: {
				operationName: {
					type: "string",
					description: "The name of the custom operation to execute",
				},
				params: {
					type: "object",
					description: "Parameters for the custom operation",
					additionalProperties: true,
				},
			},
			required: ["operationName"],
		},
	},
	{
		name: "get_api_endpoints",
		description:
			"Get a list of all available API endpoints generated by better-query",
		inputSchema: {
			type: "object",
			properties: {},
			required: [],
		},
	},
];

// Create the MCP server
const server = new Server(
	{
		name: "better-query-mcp",
		version: "0.1.0",
	},
	{
		capabilities: {
			tools: {},
		},
	},
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
	return {
		tools: TOOLS,
	};
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args = {} } = request.params;

	try {
		switch (name) {
			case "list_resources":
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									note: "This is a standalone MCP server. To use these tools, you need to connect to a running better-query instance.",
									instructions:
										"Configure your better-query instance with resources and provide connection details.",
									example: {
										resources: [
											{
												name: "user",
												schema: "z.object({ name: z.string(), email: z.string().email() })",
											},
											{
												name: "post",
												schema: "z.object({ title: z.string(), content: z.string() })",
											},
										],
									},
								},
								null,
								2,
							),
						},
					],
				};

			case "get_resource_schema":
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									note: "Connect to a better-query instance to retrieve resource schemas",
									resourceName: args.resourceName,
									example: {
										fields: {
											id: { type: "string", required: true },
											name: { type: "string", required: true },
											email: { type: "string", required: true },
											createdAt: { type: "date", required: false },
										},
									},
								},
								null,
								2,
							),
						},
					],
				};

			case "get_api_endpoints":
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									note: "Better Query generates RESTful API endpoints for each resource",
									endpoints: {
										pattern: "/api/query/{resourceName}",
										operations: [
											"GET /api/query/{resourceName} - List items",
											"POST /api/query/{resourceName} - Create item",
											"GET /api/query/{resourceName}/{id} - Get item",
											"PUT /api/query/{resourceName}/{id} - Update item",
											"DELETE /api/query/{resourceName}/{id} - Delete item",
										],
									},
									example: [
										"GET /api/query/user",
										"POST /api/query/user",
										"GET /api/query/user/123",
										"PUT /api/query/user/123",
										"DELETE /api/query/user/123",
									],
								},
								null,
								2,
							),
						},
					],
				};

			default:
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									error: "Not implemented",
									message: `The tool '${name}' requires a connection to a running better-query instance. This is a standalone MCP server that provides the tool interface.`,
									suggestion:
										"To use these tools with actual data, integrate this MCP server with your better-query application.",
								},
								null,
								2,
							),
						},
					],
					isError: true,
				};
		}
	} catch (error) {
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(
						{
							error: "Execution error",
							message: error instanceof Error ? error.message : String(error),
						},
						null,
						2,
					),
				},
			],
			isError: true,
		};
	}
});

// Start the server
async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error("Better Query MCP server running on stdio");
}

main().catch((error) => {
	console.error("Fatal error in main():", error);
	process.exit(1);
});

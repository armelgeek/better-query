import { createCrudEndpoint } from "../endpoints/crud-endpoint";
import { CrudHookContext } from "../types";
import { Plugin } from "../types/plugins";

/**
 * SSE Plugin Options
 */
export interface SSEPluginOptions {
	/** Whether to enable SSE */
	enabled?: boolean;
	/** Path for SSE endpoint (default: /api/sse/:resource) */
	path?: string;
}

/**
 * Server-Sent Events Plugin
 * Provides a lightweight alternative to WebSockets for real-time updates
 */
export function ssePlugin(options: SSEPluginOptions = {}): Plugin {
	const { enabled = true, path = "/sse" } = options;

	// Keep track of active connections
	const connections = new Map<string, Set<any>>(); // resource -> Set of response objects

	const broadcast = (resource: string, event: string, data: any) => {
		const resourceConnections = connections.get(resource);
		if (!resourceConnections) return;

		const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
		
		for (const res of resourceConnections) {
			try {
				res.write(message);
			} catch (e) {
				resourceConnections.delete(res);
			}
		}
	};

	if (!enabled) {
		return {
			id: "sse",
			endpoints: {},
			init: () => {},
		};
	}

	return {
		id: "sse",
		init: () => {},
		endpoints: {
			// SSE Stream endpoint
			sseStream: createCrudEndpoint(
				`${path}/:resource`,
				{ method: "GET" },
				async (ctx) => {
					const { resource } = ctx.params;
					
					// Set headers for SSE
					const headers = {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache",
						"Connection": "keep-alive",
						"Access-Control-Allow-Origin": "*",
					};

					// In a real Hono/Node environment, we would use the response stream
					// This is a placeholder for the logic
					return new Response(
						new ReadableStream({
							start(controller) {
								const encoder = new TextEncoder();
								
								// Send initial connection message
								controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ resource })}\n\n`));

								// Setup keep-alive heartbeat
								const timer = setInterval(() => {
									try {
										controller.enqueue(encoder.encode(": heartbeat\n\n"));
									} catch (e) {
										clearInterval(timer);
										controller.close();
									}
								}, 30000);

								// We would need a way to register this 'controller' to the 'connections' map
								// but since Response objects are usually handled by the server framework,
								// this is simplified here.
							},
							cancel() {
								// Cleanup
							}
						}),
						{ headers }
					);
				}
			)
		},
		hooks: {
			afterCreate: async (context: CrudHookContext) => {
				broadcast(context.resource, "create", context.result);
			},
			afterUpdate: async (context: CrudHookContext) => {
				broadcast(context.resource, "update", context.result);
			},
			afterDelete: async (context: CrudHookContext) => {
				broadcast(context.resource, "delete", { id: context.id });
			}
		}
	};
}

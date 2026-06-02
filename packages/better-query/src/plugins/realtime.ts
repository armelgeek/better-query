import { WebSocket, WebSocketServer } from "ws";
import { z } from "zod";
import { createCrudEndpoint } from "../endpoints/crud-endpoint";
import { QueryHookContext } from "../types";
import { Plugin } from "../types/plugins";

/**
 * Realtime plugin options
 */
export interface RealtimePluginOptions {
	/** Whether to enable realtime sync */
	enabled?: boolean;
	/** WebSocket server instance */
	wss?: WebSocketServer;
	/** Port for WebSocket server (default: 3001) */
	port?: number;
	/** Path for WebSocket endpoint */
	path?: string;
	/** Resources to enable realtime for (default: all) */
	resources?: string[];
	/** Whether to broadcast user presence */
	broadcastPresence?: boolean;
}

/**
 * WebSocket message structure
 */
export interface RealtimeMessage {
	type:
		| "subscribe"
		| "unsubscribe"
		| "data_change"
		| "presence_update"
		| "heartbeat"
		| "error";
	channel?: string;
	payload?: any;
}

/**
 * Enhanced Realtime Plugin
 */
export function realtimePlugin(options: RealtimePluginOptions = {}): Plugin {
	const {
		enabled = true,
		port = 3001,
		path = "/realtime",
		resources = [],
		broadcastPresence = true,
	} = options;

	const channels = new Map<string, Set<WebSocket>>();
	const clientMetadata = new Map<
		WebSocket,
		{ userId?: string; channels: Set<string> }
	>();

	const broadcast = (
		channel: string,
		message: RealtimeMessage,
		excludeWs?: WebSocket,
	) => {
		const clients = channels.get(channel);
		if (!clients) return;

		const data = JSON.stringify({ ...message, timestamp: Date.now() });
		for (const ws of clients) {
			if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
				ws.send(data);
			}
		}
	};

	if (!enabled) {
		return { id: "realtime", endpoints: {}, init: () => {} };
	}

	let wss: WebSocketServer;

	return {
		id: "realtime",
		init: (context) => {
			if (options.wss) {
				wss = options.wss;
			} else {
				wss = new WebSocketServer({ port, path });
				console.log(`[Realtime] Server listening on port ${port}${path}`);
			}

			wss.on("connection", (ws) => {
				clientMetadata.set(ws, { channels: new Set() });

				ws.on("message", (data) => {
					try {
						const msg: RealtimeMessage = JSON.parse(data.toString());
						const client = clientMetadata.get(ws);
						if (!client) return;

						if (msg.type === "subscribe" && msg.channel) {
							if (!channels.has(msg.channel))
								channels.set(msg.channel, new Set());
							channels.get(msg.channel)!.add(ws);
							client.channels.add(msg.channel);

							ws.send(
								JSON.stringify({ type: "subscribed", channel: msg.channel }),
							);

							if (broadcastPresence && client.userId) {
								broadcast(
									msg.channel,
									{
										type: "presence_update",
										payload: { action: "join", userId: client.userId },
									},
									ws,
								);
							}
						} else if (msg.type === "unsubscribe" && msg.channel) {
							channels.get(msg.channel)?.delete(ws);
							client.channels.delete(msg.channel);
							ws.send(
								JSON.stringify({ type: "unsubscribed", channel: msg.channel }),
							);
						} else if (msg.type === "heartbeat") {
							ws.send(
								JSON.stringify({ type: "heartbeat", timestamp: Date.now() }),
							);
						}
					} catch (e) {
						ws.send(
							JSON.stringify({ type: "error", payload: "Invalid message" }),
						);
					}
				});

				ws.on("close", () => {
					const client = clientMetadata.get(ws);
					if (client) {
						for (const channel of client.channels) {
							channels.get(channel)?.delete(ws);
							if (broadcastPresence && client.userId) {
								broadcast(channel, {
									type: "presence_update",
									payload: { action: "leave", userId: client.userId },
								});
							}
						}
					}
					clientMetadata.delete(ws);
				});
			});

			// Override context broadcast helper
			context.broadcast = (message) => {
				broadcast(message.channel, message as any);
			};
		},

		hooks: {
			afterCreate: async (ctx: QueryHookContext) => {
				if (resources.length === 0 || resources.includes(ctx.resource)) {
					const channel = `resource:${ctx.resource}`;
					broadcast(channel, {
						type: "data_change",
						payload: { action: "create", data: ctx.result },
					});
				}
			},
			afterUpdate: async (ctx: QueryHookContext) => {
				if (resources.length === 0 || resources.includes(ctx.resource)) {
					const id = ctx.result?.id || ctx.data?.id;
					// Broadcast to resource channel
					broadcast(`resource:${ctx.resource}`, {
						type: "data_change",
						payload: { action: "update", data: ctx.result },
					});
					// Broadcast to specific record channel
					if (id) {
						broadcast(`${ctx.resource}:${id}`, {
							type: "data_change",
							payload: { action: "update", data: ctx.result },
						});
					}
				}
			},
			afterDelete: async (ctx: QueryHookContext) => {
				if (resources.length === 0 || resources.includes(ctx.resource)) {
					const id = ctx.result?.id || ctx.data?.id;
					broadcast(`resource:${ctx.resource}`, {
						type: "data_change",
						payload: { action: "delete", id },
					});
					if (id) {
						broadcast(`${ctx.resource}:${id}`, {
							type: "data_change",
							payload: { action: "delete", id },
						});
					}
				}
			},
		},

		endpoints: {
			getRealtimeStats: createCrudEndpoint(
				"/realtime/stats",
				{ method: "GET" },
				async (ctx) => {
					return ctx.json({
						activeConnections: clientMetadata.size,
						activeChannels: Array.from(channels.keys()).map((k) => ({
							name: k,
							count: channels.get(k)!.size,
						})),
					});
				},
			),
		},
	};
}

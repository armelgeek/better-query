import { createClient as createBetterCallClient } from "better-call/client";

export interface RealtimeTransport {
	connect(): Promise<void>;
	disconnect(): void;
	subscribe(channel: string, callback: (data: any) => void): void;
	unsubscribe(channel: string): void;
	status: "connecting" | "open" | "closed";
}

export interface ClientOptions {
	url: string;
	realtimeUrl?: string;
	transport?: "ws" | "sse" | "auto";
	reconnect?: boolean;
	webSocket?: any;
	eventSource?: any;
	headers?:
		| Record<string, string>
		| (() => Record<string, string> | Promise<Record<string, string>>);
	/** Better Auth client instance */
	auth?: any;
}

class WebSocketTransport implements RealtimeTransport {
	private ws: any = null;
	private callbacks = new Map<string, Set<(data: any) => void>>();
	public status: "connecting" | "open" | "closed" = "closed";

	constructor(
		private url: string,
		private WSImpl?: any,
	) {}

	async connect(): Promise<void> {
		this.status = "connecting";
		const WebSocketClass =
			this.WSImpl || (typeof WebSocket !== "undefined" ? WebSocket : null);

		if (!WebSocketClass) {
			throw new Error(
				"WebSocket implementation not found. Please provide one in options.",
			);
		}

		this.ws = new WebSocketClass(this.url);

		return new Promise((resolve, reject) => {
			this.ws.onopen = () => {
				this.status = "open";
				for (const channel of this.callbacks.keys()) {
					this.ws.send(JSON.stringify({ type: "subscribe", channel }));
				}
				resolve();
			};

			this.ws.onmessage = (event: any) => {
				const msg = JSON.parse(event.data);
				if (msg.channel && this.callbacks.has(msg.channel)) {
					this.callbacks.get(msg.channel)!.forEach((cb) => cb(msg.payload));
				}
			};

			this.ws.onclose = () => {
				this.status = "closed";
			};

			this.ws.onerror = (err: any) => {
				this.status = "closed";
				reject(err);
			};
		});
	}

	disconnect() {
		this.ws?.close();
	}

	subscribe(channel: string, callback: (data: any) => void) {
		if (!this.callbacks.has(channel)) {
			this.callbacks.set(channel, new Set());
			if (this.status === "open") {
				this.ws?.send(JSON.stringify({ type: "subscribe", channel }));
			}
		}
		this.callbacks.get(channel)!.add(callback);
	}

	unsubscribe(channel: string) {
		this.callbacks.delete(channel);
		if (this.status === "open") {
			this.ws?.send(JSON.stringify({ type: "unsubscribe", channel }));
		}
	}
}

class SSETransport implements RealtimeTransport {
	private es: any = null;
	private callbacks = new Map<string, Set<(data: any) => void>>();
	public status: "connecting" | "open" | "closed" = "closed";

	constructor(
		private url: string,
		private SSEImpl?: any,
	) {}

	async connect(): Promise<void> {
		this.status = "connecting";
		const EventSourceClass =
			this.SSEImpl || (typeof EventSource !== "undefined" ? EventSource : null);

		if (!EventSourceClass) {
			throw new Error(
				"EventSource implementation not found. Please provide one in options.",
			);
		}

		this.es = new EventSourceClass(this.url);

		this.es.onopen = () => {
			this.status = "open";
		};

		this.es.addEventListener("data_change", (e: any) => {
			const data = JSON.parse(e.data);
			this.callbacks.forEach((cbs) => cbs.forEach((cb) => cb(data)));
		});

		this.es.onerror = () => {
			this.status = "closed";
		};
	}

	disconnect() {
		this.es?.close();
	}

	subscribe(channel: string, callback: (data: any) => void) {
		if (!this.callbacks.has(channel)) {
			this.callbacks.set(channel, new Set());
		}
		this.callbacks.get(channel)!.add(callback);
	}

	unsubscribe(channel: string) {
		this.callbacks.delete(channel);
	}
}

type NestedAPI<T> = {
	[K in keyof T as K extends `${infer Resource}.${infer Operation}`
		? Resource
		: K]: K extends `${infer Resource}.${infer Operation}`
		? { [Op in Operation extends "get" ? "get" | "read" : Operation]: T[K] }
		: T[K];
} extends infer O
	? {
			[K in keyof O]: O[K] extends Record<string, any>
				? UnionToIntersection<O[K]>
				: O[K];
		}
	: never;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
	k: infer I,
) => void
	? I
	: never;

export class BetterQueryClient<API extends Record<string, any> = any> {
	private transport: RealtimeTransport;
	private api: any;
	public auth: any;

	constructor(options: ClientOptions) {
		this.auth = options.auth;
		const baseRealtimeUrl = options.realtimeUrl || options.url;
		const wsUrl =
			baseRealtimeUrl.replace(/^http/, "ws") +
			(options.realtimeUrl ? "" : "/realtime");
		const sseUrl = baseRealtimeUrl + (options.realtimeUrl ? "" : "/sse");

		if (options.transport === "sse") {
			this.transport = new SSETransport(sseUrl, options.eventSource);
		} else {
			this.transport = new WebSocketTransport(wsUrl, options.webSocket);
		}

		this.api = createBetterCallClient({
			baseURL: options.url,
			headers: options.headers as any,
			credentials: "include",
		});

		const createProxy = (path: string[]): any => {
			return new Proxy(() => {}, {
				get: (_, prop: string) => {
					if (prop === "then") return undefined;
					return createProxy([...path, prop]);
				},
				apply: (_, __, args) => {
					const operation = path[path.length - 1];
					if (!operation) throw new Error("Invalid operation call");

					const resource = path.slice(0, -1).join("/");

					// Intercept watch/on methods to use local real-time logic instead of API calls
					if (operation === "watch" || operation === "on") {
						return this.watch(resource, args[0], args[1]);
					}

					// Map 'read' to 'get' for consistency with server endpoints
					const actualOperation = operation === "read" ? "get" : operation;
					let fullPath = `/${resource}/${actualOperation}`;

					// Special case for get/read/update/delete which might need :id
					if (["get", "read", "update", "delete"].includes(operation)) {
						fullPath += "/:id";
					}

					let method = "POST";
					if (["list", "get", "read", "count"].includes(operation))
						method = "GET";
					if (operation === "update") method = "PATCH";
					if (operation === "delete") method = "DELETE";

					// Check if it's a nested relationship operation: client.parent.relation.list/create
					if (path.length === 3) {
						const parentResource = path[0] as string;
						const relationName = path[1] as string;
						const op = path[2] as string;

						if (["list", "create"].includes(op)) {
							fullPath = `/${parentResource}/:parentId/${relationName}`;
							method = op === "list" ? "GET" : "POST";
						}
					}

					const options = args[0] || {};
					let finalPath = fullPath;

					// Interpolate params into path
					if (options.params) {
						for (const [key, value] of Object.entries(options.params)) {
							finalPath = finalPath.replace(`:${key}`, String(value));
						}
					}

					// Try calling as a function if it's a direct better-call client
					if (typeof this.api === "function") {
						return (this.api as any)(finalPath, {
							method,
							...options,
						});
					}

					// Fallback to property access if it somehow works
					let fn = this.api;
					for (const segment of path) {
						const actualSegment = segment === "read" ? "get" : segment;
						fn = fn?.[actualSegment];
					}

					if (typeof fn?.[method.toLowerCase()] === "function") {
						return fn[method.toLowerCase()](...args);
					}

					throw new Error(
						`[DEBUG-V6] Failed to call endpoint "${finalPath}". Client type: ${typeof this
							.api}`,
					);
				},
			});
		};

		const clientFn = (resource: string) => {
			return createProxy([resource]);
		};

		// Add methods to clientFn
		Object.assign(clientFn, {
			api: this.api,
			transport: this.transport,
			connect: this.connect.bind(this),
			watch: this.watch.bind(this),
			status: this.status,
			auth: this.auth,
		});

		return new Proxy(clientFn, {
			get(target, prop: string) {
				if (prop in target) {
					return (target as any)[prop];
				}
				return createProxy([prop]);
			},
		}) as any;
	}

	async connect() {
		await this.transport.connect();
	}

	watch(
		resource: string,
		idOrCallback: string | ((data: any) => void),
		callback?: (data: any) => void,
	) {
		let channel = `resource:${resource}`;
		let cb: (data: any) => void;

		if (typeof idOrCallback === "string") {
			channel = `${resource}:${idOrCallback}`;
			cb = callback!;
		} else {
			cb = idOrCallback;
		}

		this.transport.subscribe(channel, cb);

		return () => this.transport.unsubscribe(channel);
	}

	get status() {
		return this.transport.status;
	}
}

export function createClient<API extends Record<string, any>>(
	options: ClientOptions,
): BetterQueryClient<API> & NestedAPI<API> & ((resource: string) => any) {
	return new BetterQueryClient<API>(options) as any;
}

export const QUERY_ERROR_CODES = {
	UNAUTHORIZED: "UNAUTHORIZED",
	FORBIDDEN: "FORBIDDEN",
	NOT_FOUND: "NOT_FOUND",
	VALIDATION_ERROR: "VALIDATION_ERROR",
	INTERNAL_ERROR: "INTERNAL_ERROR",
	CONFLICT: "CONFLICT",
	RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
} as const;

export type QueryErrorCode = keyof typeof QUERY_ERROR_CODES;

export * from "./live-query";

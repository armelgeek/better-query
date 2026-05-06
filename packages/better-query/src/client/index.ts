/**
 * Unified Realtime Transport interface
 */
export interface RealtimeTransport {
	connect(): Promise<void>;
	disconnect(): void;
	subscribe(channel: string, callback: (data: any) => void): void;
	unsubscribe(channel: string): void;
	status: "connecting" | "open" | "closed";
}

/**
 * Options for the unified Better Query Client
 */
export interface ClientOptions {
	url: string;
	transport?: "ws" | "sse" | "auto";
	reconnect?: boolean;
	/** Optional custom WebSocket implementation (e.g. for Node.js) */
	webSocket?: any;
	/** Optional custom EventSource implementation */
	eventSource?: any;
}

/**
 * WebSocket Transport Implementation
 */
class WebSocketTransport implements RealtimeTransport {
	private ws: any = null;
	private callbacks = new Map<string, Set<(data: any) => void>>();
	public status: "connecting" | "open" | "closed" = "closed";

	constructor(private url: string, private WSImpl?: any) {}

	async connect(): Promise<void> {
		this.status = "connecting";
		const WebSocketClass = this.WSImpl || (typeof WebSocket !== 'undefined' ? WebSocket : null);
		
		if (!WebSocketClass) {
			throw new Error("WebSocket implementation not found. Please provide one in options.");
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

/**
 * SSE Transport Implementation
 */
class SSETransport implements RealtimeTransport {
	private es: any = null;
	private callbacks = new Map<string, Set<(data: any) => void>>();
	public status: "connecting" | "open" | "closed" = "closed";

	constructor(private url: string, private SSEImpl?: any) {}

	async connect(): Promise<void> {
		this.status = "connecting";
		const EventSourceClass = this.SSEImpl || (typeof EventSource !== 'undefined' ? EventSource : null);
		
		if (!EventSourceClass) {
			throw new Error("EventSource implementation not found. Please provide one in options.");
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

/**
 * The Unified Better Query Client
 */
export class BetterQueryClient {
	private transport: RealtimeTransport;

	constructor(options: ClientOptions) {
		const wsUrl = options.url.replace(/^http/, "ws") + "/realtime";
		const sseUrl = options.url + "/sse";

		if (options.transport === "sse") {
			this.transport = new SSETransport(sseUrl, options.eventSource);
		} else {
			this.transport = new WebSocketTransport(wsUrl, options.webSocket);
		}
	}

	async connect() {
		await this.transport.connect();
	}

	/**
	 * Watch a resource or a specific record for changes
	 */
	watch(resource: string, idOrCallback: string | ((data: any) => void), callback?: (data: any) => void) {
		let channel = `resource:${resource}`;
		let cb: (data: any) => void;

		if (typeof idOrCallback === "string") {
			channel = `${resource}:${idOrCallback}`;
			cb = callback!;
		} else {
			cb = idOrCallback;
		}

		this.transport.subscribe(channel, cb);

		// Return unwatch function
		return () => this.transport.unsubscribe(channel);
	}

	get status() {
		return this.transport.status;
	}
}

/**
 * Factory function to create a new client
 */
export function createClient(options: ClientOptions) {
	return new BetterQueryClient(options);
}
/**
 * Standardized error codes for Better Query
 */
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

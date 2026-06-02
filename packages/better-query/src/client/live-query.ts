import { BetterQueryClient } from "./index";

export interface LiveQueryOptions {
	/** Enable optimistic updates (updates local state first, rolls back on API error) */
	optimistic?: boolean;
	/** Enable real-time background sync when other clients change data */
	realtimeSync?: boolean;
	/** Optional key to persist loaded data in LocalStorage (enables SWR instant load) */
	persistKey?: string;
	/** Automatic retry attempts for API errors before rolling back */
	retryAttempts?: number;
}

export interface PaginationMeta {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
	hasNext: boolean;
	hasPrev: boolean;
}

export interface LiveQueryState<T> {
	/** Active list of items (filtered locally if a filter is active) */
	items: T[];
	/** The complete unfiltered cached list */
	allItems: T[];
	/** Selected active detail record */
	activeItem: T | null;
	loading: boolean;
	error: Error | null;
	pagination: PaginationMeta | null;
	queryParams: any | null;
	/** Whether the client store has pending offline mutations */
	isOfflinePending: boolean;
}

export type LiveQueryListener<T> = (state: LiveQueryState<T>) => void;

interface OfflineMutation {
	id: string;
	tempId?: string;
	operation: "create" | "update" | "delete";
	data: any;
	execute: () => Promise<any>;
}

/**
 * A highly performant, reactive client-side LiveQuery store for better-query.
 * Framework-agnostic and easy to bind with Zustand, React, Svelte, Vue, or Vanilla JS.
 * Supports SWR caching, offline queues, in-memory filters, active detail views, and real-time.
 */
export class BetterLiveQuery<T extends { id: string } = any> {
	private items: T[] = [];
	private activeItem: T | null = null;
	private loading = false;
	private error: Error | null = null;
	private pagination: PaginationMeta | null = null;
	private queryParams: any = {};
	private localFilter: ((item: T) => boolean) | null = null;
	private listeners = new Set<LiveQueryListener<T>>();
	private unsubscribeRealtime: (() => void) | null = null;
	private options: Required<LiveQueryOptions>;

	// Offline queue
	private offlineQueue: OfflineMutation[] = [];
	private isOnline = true;

	constructor(
		private client: BetterQueryClient,
		private resource: string,
		options: LiveQueryOptions = {},
	) {
		this.options = {
			optimistic: options.optimistic ?? true,
			realtimeSync: options.realtimeSync ?? true,
			persistKey: options.persistKey ?? "",
			retryAttempts: options.retryAttempts ?? 3,
		};

		// 1. Initialize SWR Cache from LocalStorage
		this.loadPersistedData();

		// 2. Setup WS Realtime Listener
		if (this.options.realtimeSync) {
			this.setupRealtimeSync();
		}

		// 3. Setup Offline/Online Listeners
		this.setupConnectivityListeners();
	}

	/**
	 * Get current local cache and query metadata state
	 */
	getState(): LiveQueryState<T> {
		const itemsToReturn = this.localFilter
			? this.items.filter(this.localFilter)
			: this.items;

		return {
			items: itemsToReturn,
			allItems: this.items,
			activeItem: this.activeItem,
			loading: this.loading,
			error: this.error,
			pagination: this.pagination,
			queryParams: this.queryParams,
			isOfflinePending: this.offlineQueue.length > 0,
		};
	}

	/**
	 * Subscribe to local data changes
	 */
	subscribe(listener: LiveQueryListener<T>): () => void {
		this.listeners.add(listener);
		// Immediate trigger on subscription
		listener(this.getState());
		return () => {
			this.listeners.delete(listener);
		};
	}

	private notify() {
		const state = this.getState();
		for (const listener of this.listeners) {
			listener(state);
		}
	}

	/**
	 * Persist the current list cache to local storage (SWR support)
	 */
	private persistData() {
		if (typeof window !== "undefined" && this.options.persistKey) {
			try {
				localStorage.setItem(this.options.persistKey, JSON.stringify(this.items));
			} catch (e) {
				console.warn("[Live Query] Failed to persist data cache:", e);
			}
		}
	}

	/**
	 * Load persisted cache data for SWR
	 */
	private loadPersistedData() {
		if (typeof window !== "undefined" && this.options.persistKey) {
			try {
				const cached = localStorage.getItem(this.options.persistKey);
				if (cached) {
					this.items = JSON.parse(cached);
				}
			} catch (e) {
				console.warn("[Live Query] Failed to load persisted data:", e);
			}
		}
	}

	/**
	 * Fetch lists from the server and populate/replace the local store
	 */
	async list(params: any = {}): Promise<T[]> {
		this.loading = true;
		this.error = null;
		this.queryParams = { ...params };
		this.notify();

		try {
			const res = await (this.client as any)[this.resource].list({
				query: params,
			});

			const data = res?.data?.items || res?.items || res || [];
			this.items = Array.isArray(data) ? data : [];

			// Persist lists for immediate SWR on next reload
			this.persistData();

			// Parse pagination if present in response
			const serverPagination = res?.data?.pagination || res?.pagination;
			if (serverPagination) {
				this.pagination = {
					page: Number(serverPagination.page || 1),
					limit: Number(serverPagination.limit || 10),
					total: Number(serverPagination.total || 0),
					totalPages: Number(serverPagination.totalPages || 1),
					hasNext: Boolean(serverPagination.hasNext),
					hasPrev: Boolean(serverPagination.hasPrev),
				};
			} else {
				this.pagination = null;
			}

			this.loading = false;
			this.notify();
			return this.items;
		} catch (err: any) {
			this.loading = false;
			this.error = err instanceof Error ? err : new Error(String(err));
			this.notify();
			throw err;
		}
	}

	/**
	 * Perform a full-text search on list resources
	 */
	async search(query: string): Promise<T[]> {
		return this.list({
			...this.queryParams,
			q: query,
			page: 1, // Reset to first page on search
		});
	}

	/**
	 * Sort the resource list by a given field and direction
	 */
	async sort(field: string, order: "asc" | "desc" = "asc"): Promise<T[]> {
		return this.list({
			...this.queryParams,
			sortBy: field,
			sortOrder: order,
		});
	}

	/**
	 * Go to a specific page
	 */
	async paginate(page: number, limit?: number): Promise<T[]> {
		return this.list({
			...this.queryParams,
			page,
			limit: limit ?? this.queryParams?.limit ?? 10,
		});
	}

	/**
	 * Go to the next page if available
	 */
	async next(): Promise<T[]> {
		if (!this.pagination || !this.pagination.hasNext) {
			return this.items;
		}
		const nextPage = (this.pagination.page || 1) + 1;
		return this.paginate(nextPage);
	}

	/**
	 * Go to the previous page if available
	 */
	async prev(): Promise<T[]> {
		if (!this.pagination || !this.pagination.hasPrev) {
			return this.items;
		}
		const prevPage = Math.max(1, (this.pagination.page || 1) - 1);
		return this.paginate(prevPage);
	}

	/**
	 * Select an item locally to become the active detail item
	 */
	select(id: string | null) {
		if (!id) {
			this.activeItem = null;
		} else {
			this.activeItem = this.items.find((item) => item.id === id) || null;
		}
		this.notify();
	}

	/**
	 * Fetch deep details of a specific record from the server and make it active
	 */
	async fetchActive(id: string): Promise<T> {
		this.loading = true;
		this.error = null;
		this.notify();

		try {
			const res = await (this.client as any)[this.resource].read({
				params: { id },
			});
			const item = res?.data || res;
			this.activeItem = item;

			// Sync back to local items list if present
			this.items = this.items.map((existing) => (existing.id === id ? item : existing));
			this.persistData();

			this.loading = false;
			this.notify();
			return item as T;
		} catch (err: any) {
			this.loading = false;
			this.error = err instanceof Error ? err : new Error(String(err));
			this.notify();
			throw err;
		}
	}

	/**
	 * Apply an instant client-side filter predicate. Set to null to remove filter.
	 */
	filterLocal(predicate: ((item: T) => boolean) | null) {
		this.localFilter = predicate;
		this.notify();
	}

	/**
	 * Instant in-memory search across active fields without server requests
	 */
	searchLocal(query: string, fields: Array<keyof T>) {
		if (!query.trim()) {
			this.localFilter = null;
		} else {
			const normalizedQuery = query.toLowerCase().trim();
			this.localFilter = (item) => {
				return fields.some((field) => {
					const val = item[field];
					if (val === undefined || val === null) return false;
					return String(val).toLowerCase().includes(normalizedQuery);
				});
			};
		}
		this.notify();
	}

	/**
	 * Create a new record with optimistic updates and offline resilience
	 */
	async create(recordData: Partial<T>): Promise<T> {
		const tempId = `temp_${Date.now()}`;
		const optimisticRecord = {
			id: tempId,
			...recordData,
		} as T;

		// 1. Optimistic Update
		let previousItems = [...this.items];
		if (this.options.optimistic) {
			this.items = [...this.items, optimisticRecord];
			this.persistData();
			this.notify();
		}

		const action = async () => {
			const res = await (this.client as any)[this.resource].create({
				body: recordData,
			});
			const savedRecord = res?.data || res;

			// Replace optimistic temp record with real server response
			if (this.options.optimistic) {
				this.items = previousItems.map((item) =>
					item.id === tempId ? savedRecord : item,
				);
				if (!previousItems.some((item) => item.id === tempId)) {
					this.items = [...this.items, savedRecord];
				}
			} else {
				this.items = [...this.items, savedRecord];
			}
			this.persistData();
			this.notify();
			return savedRecord;
		};

		if (!this.isOnline) {
			// Save in offline queue
			this.queueOfflineMutation({
				id: tempId,
				tempId,
				operation: "create",
				data: recordData,
				execute: action,
			});
			return optimisticRecord;
		}

		try {
			return await this.executeWithRetry(action, this.options.retryAttempts);
		} catch (err) {
			if (this.options.optimistic) {
				this.items = previousItems;
				this.persistData();
				this.error = err instanceof Error ? err : new Error(String(err));
				this.notify();
			}
			throw err;
		}
	}

	/**
	 * Update a record locally & remotely with rollback on failure
	 */
	async update(id: string, updates: Partial<T>): Promise<T> {
		const previousItems = [...this.items];
		const originalRecord = this.items.find((item) => item.id === id);

		if (!originalRecord) {
			throw new Error(`Record with ID ${id} not found in client live query.`);
		}

		const updatedRecord = {
			...originalRecord,
			...updates,
		};

		// 1. Optimistic Update
		if (this.options.optimistic) {
			this.items = this.items.map((item) => (item.id === id ? updatedRecord : item));
			if (this.activeItem?.id === id) {
				this.activeItem = updatedRecord;
			}
			this.persistData();
			this.notify();
		}

		const action = async () => {
			const res = await (this.client as any)[this.resource].update({
				params: { id },
				body: updates,
			});
			const serverRecord = res?.data || res;

			// Update store with finalized server state
			this.items = this.items.map((item) => (item.id === id ? serverRecord : item));
			if (this.activeItem?.id === id) {
				this.activeItem = serverRecord;
			}
			this.persistData();
			this.notify();
			return serverRecord;
		};

		if (!this.isOnline) {
			this.queueOfflineMutation({
				id,
				operation: "update",
				data: updates,
				execute: action,
			});
			return updatedRecord;
		}

		try {
			return await this.executeWithRetry(action, this.options.retryAttempts);
		} catch (err) {
			if (this.options.optimistic) {
				this.items = previousItems;
				if (this.activeItem?.id === id) {
					this.activeItem = originalRecord;
				}
				this.persistData();
				this.error = err instanceof Error ? err : new Error(String(err));
				this.notify();
			}
			throw err;
		}
	}

	/**
	 * Delete a record locally & remotely with rollback on failure
	 */
	async delete(id: string): Promise<void> {
		const previousItems = [...this.items];
		const originalRecord = this.items.find((item) => item.id === id);

		// 1. Optimistic Delete
		if (this.options.optimistic) {
			this.items = this.items.filter((item) => item.id !== id);
			if (this.activeItem?.id === id) {
				this.activeItem = null;
			}
			this.persistData();
			this.notify();
		}

		const action = async () => {
			await (this.client as any)[this.resource].delete({
				params: { id },
			});
		};

		if (!this.isOnline) {
			this.queueOfflineMutation({
				id,
				operation: "delete",
				data: null,
				execute: action,
			});
			return;
		}

		try {
			await this.executeWithRetry(action, this.options.retryAttempts);
		} catch (err) {
			if (this.options.optimistic) {
				this.items = previousItems;
				if (originalRecord && this.activeItem === null && previousItems.some(i => i.id === id)) {
					this.activeItem = originalRecord;
				}
				this.persistData();
				this.error = err instanceof Error ? err : new Error(String(err));
				this.notify();
			}
			throw err;
		}
	}

	/**
	 * Retry handler helper
	 */
	private async executeWithRetry<R>(fn: () => Promise<R>, retries: number): Promise<R> {
		try {
			return await fn();
		} catch (err) {
			if (retries <= 1) {
				throw err;
			}
			// Wait 800ms before retrying
			await new Promise((resolve) => setTimeout(resolve, 800));
			return this.executeWithRetry(fn, retries - 1);
		}
	}

	/**
	 * Add task to offline sync queue
	 */
	private queueOfflineMutation(mutation: OfflineMutation) {
		this.offlineQueue.push(mutation);
		this.notify();
	}

	/**
	 * Replay and reconcile the entire offline queue sequentially
	 */
	private async processOfflineQueue() {
		if (this.offlineQueue.length === 0) return;

		log(`Processing offline mutation queue (${this.offlineQueue.length} items)...`);
		const queue = [...this.offlineQueue];
		this.offlineQueue = [];
		this.notify();

		for (const task of queue) {
			try {
				await task.execute();
			} catch (e) {
				console.error(`[Offline Sync] Mutation task ${task.operation} failed for id ${task.id}:`, e);
				// If a task hard-fails, trigger error state
				this.error = e instanceof Error ? e : new Error(String(e));
				this.notify();
			}
		}
	}

	/**
	 * Hot patch local memory cache when a change event occurs on the server
	 */
	private handleServerChange(event: {
		operation: "create" | "update" | "delete";
		data: any;
		id?: string;
	}) {
		const { operation, data, id } = event;

		if (operation === "create") {
			if (!this.items.some((item) => item.id === data.id)) {
				this.items = [...this.items, data];
			}
		} else if (operation === "update" && id) {
			this.items = this.items.map((item) => (item.id === id ? { ...item, ...data } : item));
			if (this.activeItem?.id === id) {
				this.activeItem = { ...this.activeItem, ...data };
			}
		} else if (operation === "delete" && id) {
			this.items = this.items.filter((item) => item.id !== id);
			if (this.activeItem?.id === id) {
				this.activeItem = null;
			}
		}

		this.persistData();
		this.notify();
	}

	/**
	 * Bind background real-time hot-reloads over WebSocket or SSE
	 */
	private setupRealtimeSync() {
		const actions = (this.client as any);
		if (typeof actions.subscribeToResource === "function") {
			actions.subscribeToResource(this.resource, (event: any) => {
				this.handleServerChange(event);
			}).then((unsub: () => void) => {
				this.unsubscribeRealtime = unsub;
			}).catch((err: any) => {
				console.warn(`[Live Query] Realtime sync registration failed for ${this.resource}:`, err);
			});
		}
	}

	/**
	 * Monitor client network state to pause/resume server mutations
	 */
	private setupConnectivityListeners() {
		if (typeof window !== "undefined" && typeof navigator !== "undefined") {
			this.isOnline = navigator.onLine;

			window.addEventListener("online", () => {
				this.isOnline = true;
				this.processOfflineQueue().catch(console.error);
			});

			window.addEventListener("offline", () => {
				this.isOnline = false;
			});
		}
	}

	/**
	 * Tear down and clean up active event subscriptions
	 */
	destroy() {
		if (this.unsubscribeRealtime) {
			this.unsubscribeRealtime();
			this.unsubscribeRealtime = null;
		}
		this.listeners.clear();
	}
}

/**
 * Creates an instance of a client-side reactive LiveQuery for a database resource.
 */
export function createLiveQuery<T extends { id: string } = any>(
	client: BetterQueryClient,
	resource: string,
	options?: LiveQueryOptions,
): BetterLiveQuery<T> {
	return new BetterLiveQuery<T>(client, resource, options);
}

function log(...args: any[]) {
	console.log("[Live Query]", ...args);
}

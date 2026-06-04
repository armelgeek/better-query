import React, {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
	useRef,
} from "react";
import { useForm as useRHFForm, UseFormReturn, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery as useTanStackQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createLiveQuery } from "../client/live-query";
import type { BetterQueryClient } from "../client/index";
import type { LiveQueryOptions, LiveQueryState, PaginationMeta } from "../client/live-query";

// --- Types & Component Slot Overrides ---

export interface CustomComponents {
	Input?: React.ComponentType<React.InputHTMLAttributes<HTMLInputElement> & { [key: string]: any }>;
	Button?: React.ComponentType<React.ButtonHTMLAttributes<HTMLButtonElement> & { [key: string]: any }>;
	Select?: React.ComponentType<React.SelectHTMLAttributes<HTMLSelectElement> & { [key: string]: any }>;
	Textarea?: React.ComponentType<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { [key: string]: any }>;
	Checkbox?: React.ComponentType<React.InputHTMLAttributes<HTMLInputElement> & { [key: string]: any }>;
	Label?: React.ComponentType<React.LabelHTMLAttributes<HTMLLabelElement> & { [key: string]: any }>;
	FormItem?: React.ComponentType<React.HTMLAttributes<HTMLDivElement> & { [key: string]: any }>;
}

export type QueryEngine = "live" | "tanstack";

interface QueryContextValue {
	client: BetterQueryClient;
	// Cache for LiveQuery instances to avoid recreating them and share state across components
	queries: Map<string, any>;
	options?: LiveQueryOptions;
	engine?: QueryEngine;
	components?: CustomComponents;
}

const QueryContext = createContext<QueryContextValue | null>(null);

export interface QueryProviderProps {
	client: BetterQueryClient;
	options?: LiveQueryOptions;
	engine?: QueryEngine;
	components?: CustomComponents;
	children: React.ReactNode;
}

/**
 * Exposes a Better Query client instance to all child React components.
 * Configures the query engine ("live" or "tanstack") and Shadcn UI component overrides.
 */
export function QueryProvider({
	client,
	options,
	engine = "live",
	components,
	children,
}: QueryProviderProps) {
	const queries = useMemo(() => new Map<string, any>(), []);

	return (
		<QueryContext.Provider value={{ client, queries, options, engine, components }}>
			{children}
		</QueryContext.Provider>
	);
}

export function useClient(): BetterQueryClient {
	const context = useContext(QueryContext);
	if (!context) {
		throw new Error("useClient must be used within a QueryProvider");
	}
	return context.client;
}

function useComponents(): CustomComponents {
	const context = useContext(QueryContext);
	return context?.components || {};
}

// --- LiveQuery Hooks (Zustand SWR / WebSocket Sync) ---

export type LiveQueryActions<T> = {
	list: (params?: any) => Promise<T[]>;
	search: (query: string) => Promise<T[]>;
	sort: (field: string, order?: "asc" | "desc") => Promise<T[]>;
	paginate: (page: number, limit?: number) => Promise<T[]>;
	next: () => Promise<T[]>;
	prev: () => Promise<T[]>;
	create: (recordData: Partial<T>) => Promise<T>;
	update: (id: string, updates: Partial<T>) => Promise<T>;
	delete: (id: string) => Promise<void>;
	select: (id: string | null) => void;
	fetchActive: (id: string) => Promise<T>;
	filterLocal: (predicate: ((item: T) => boolean) | null) => void;
	searchLocal: (query: string, fields: Array<keyof T>) => void;
};

/**
 * Subscribes to a LiveQuery for a given resource and exposes its state and mutation actions.
 */
export function useLiveQuery<T extends { id: string } = any>(
	resource: string,
	options?: LiveQueryOptions,
): {
	state: LiveQueryState<T>;
	actions: LiveQueryActions<T>;
} {
	const context = useContext(QueryContext);
	if (!context) {
		throw new Error("useLiveQuery must be used within a QueryProvider");
	}

	const { client, queries, options: defaultOptions } = context;
	const mergedOptions = useMemo(
		() => ({ ...defaultOptions, ...options }),
		[options, defaultOptions],
	);

	// Get or create the LiveQuery store instance
	const liveQuery = useMemo(() => {
		const cacheKey = `${resource}:${JSON.stringify(mergedOptions)}`;
		if (!queries.has(cacheKey)) {
			queries.set(cacheKey, createLiveQuery<T>(client, resource, mergedOptions));
		}
		return queries.get(cacheKey)!;
	}, [client, resource, mergedOptions, queries]);

	const [state, setState] = useState<LiveQueryState<T>>(() =>
		liveQuery.getState(),
	);

	// Sync state on change
	useEffect(() => {
		const unsubscribe = liveQuery.subscribe((newState: LiveQueryState<T>) => {
			setState(newState);
		});
		return () => {
			unsubscribe();
		};
	}, [liveQuery]);

	// Auto-fetch list on mount if not loaded yet and not loading
	const hasFetched = useRef(false);
	useEffect(() => {
		if (!hasFetched.current && state.items.length === 0 && !state.loading) {
			hasFetched.current = true;
			liveQuery.list().catch((err: any) => {
				console.warn(`[useLiveQuery] Auto-fetch failed for ${resource}:`, err);
			});
		}
	}, [liveQuery, resource, state.items.length, state.loading]);

	const actions = useMemo<LiveQueryActions<T>>(
		() => ({
			list: (params) => liveQuery.list(params),
			search: (query) => liveQuery.search(query),
			sort: (field, order) => liveQuery.sort(field, order),
			paginate: (page, limit) => liveQuery.paginate(page, limit),
			next: () => liveQuery.next(),
			prev: () => liveQuery.prev(),
			create: (recordData) => liveQuery.create(recordData),
			update: (id, updates) => liveQuery.update(id, updates),
			delete: (id) => liveQuery.delete(id),
			select: (id) => liveQuery.select(id),
			fetchActive: (id) => liveQuery.fetchActive(id),
			filterLocal: (predicate) => liveQuery.filterLocal(predicate),
			searchLocal: (query, fields) => liveQuery.searchLocal(query, fields),
		}),
		[liveQuery],
	);

	return { state, actions };
}

// --- TanStack Query Integration Hooks (Low-Level) ---

/**
 * Hook to retrieve a list of records using TanStack Query.
 */
export function useResourceQuery<T = any>(
	resource: string,
	queryParams?: any,
) {
	const client = useClient();
	return useTanStackQuery({
		queryKey: [resource, "list", queryParams],
		queryFn: async () => {
			const res = await (client as any)[resource].list({ query: queryParams });
			if (res.error) {
				throw new Error(res.error.message || `Failed to fetch ${resource}`);
			}
			return {
				items: (res.data?.items || res.items || res || []) as T[],
				pagination: (res.data?.pagination || res.pagination || null) as PaginationMeta | null,
			};
		},
	});
}

/**
 * Hook to retrieve a single record detail using TanStack Query.
 */
export function useResourceDetailQuery<T = any>(
	resource: string,
	id: string | null,
) {
	const client = useClient();
	return useTanStackQuery({
		queryKey: [resource, "detail", id],
		queryFn: async () => {
			if (!id) return null;
			const res = await (client as any)[resource].get({ params: { id } });
			if (res.error) {
				throw new Error(res.error.message || `Failed to fetch detail for ${resource}`);
			}
			return (res.data || res) as T;
		},
		enabled: !!id,
	});
}

/**
 * Hook to create a record using TanStack Query.
 */
export function useResourceCreateMutation<T = any>(resource: string) {
	const client = useClient();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: Partial<T>) => {
			const res = await (client as any)[resource].create({ body: data });
			if (res.error) {
				throw new Error(res.error.message || `Failed to create ${resource}`);
			}
			return (res.data || res) as T;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [resource, "list"] });
		},
	});
}

/**
 * Hook to update a record using TanStack Query.
 */
export function useResourceUpdateMutation<T = any>(resource: string) {
	const client = useClient();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: Partial<T> }) => {
			const res = await (client as any)[resource].update({
				params: { id },
				body: data,
			});
			if (res.error) {
				throw new Error(res.error.message || `Failed to update ${resource}`);
			}
			return (res.data || res) as T;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: [resource, "list"] });
			queryClient.invalidateQueries({ queryKey: [resource, "detail", variables.id] });
		},
	});
}

/**
 * Hook to delete a record using TanStack Query.
 */
export function useResourceDeleteMutation(resource: string) {
	const client = useClient();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await (client as any)[resource].delete({ params: { id } });
			if (res.error) {
				throw new Error(res.error.message || `Failed to delete ${resource}`);
			}
			return res.data || res;
		},
		onSuccess: (_, id) => {
			queryClient.invalidateQueries({ queryKey: [resource, "list"] });
			queryClient.invalidateQueries({ queryKey: [resource, "detail", id] });
		},
	});
}

// --- High-Level Standard Named Hooks ---

export interface ResourceListHookOptions {
	queryParams?: any;
	engine?: QueryEngine;
	options?: LiveQueryOptions;
}

/**
 * STANDARD HOOK: Fetch list of records. Supports both live (Zustand) and tanstack engines.
 */
export function useResourceList<T extends { id: string } = any>(
	resource: string,
	options?: ResourceListHookOptions,
) {
	const context = useContext(QueryContext);
	const activeEngine = options?.engine || context?.engine || "live";

	const { state: liveState, actions: liveActions } = useLiveQuery<T>(resource, options?.options);

	const queryList = useResourceQuery<T>(
		resource,
		activeEngine === "tanstack" ? options?.queryParams : null,
	);

	const loading = activeEngine === "tanstack" ? queryList.isLoading : liveState.loading;
	const error = activeEngine === "tanstack" ? (queryList.error as Error | null) : liveState.error;
	const items = activeEngine === "tanstack" ? (queryList.data?.items || []) : liveState.items;
	const pagination = activeEngine === "tanstack" ? (queryList.data?.pagination || null) : liveState.pagination;

	return {
		items,
		pagination,
		loading,
		error,
		refetch: activeEngine === "tanstack"
			? () => queryList.refetch()
			: () => liveActions.list(options?.queryParams),
		actions: activeEngine === "live" ? liveActions : null,
	};
}

export interface ResourceDetailHookOptions {
	engine?: QueryEngine;
	options?: LiveQueryOptions;
}

/**
 * STANDARD HOOK: Fetch detail of a single record. Supports both live and tanstack engines.
 */
export function useResourceDetail<T extends { id: string } = any>(
	resource: string,
	id: string | null,
	options?: ResourceDetailHookOptions,
) {
	const context = useContext(QueryContext);
	const activeEngine = options?.engine || context?.engine || "live";

	const { state: liveState, actions: liveActions } = useLiveQuery<T>(resource, options?.options);
	const [localDetail, setLocalDetail] = useState<T | null>(null);
	const [liveLoading, setLiveLoading] = useState(false);
	const [liveError, setLiveError] = useState<Error | null>(null);

	useEffect(() => {
		if (activeEngine !== "live" || !id) return;
		const existing = liveState.items.find((item: any) => item.id === id);
		if (existing) {
			setLocalDetail(existing);
		}
		setLiveLoading(true);
		setLiveError(null);
		liveActions
			.fetchActive(id)
			.then((record) => setLocalDetail(record))
			.catch((err) => setLiveError(err))
			.finally(() => setLiveLoading(false));
	}, [id, activeEngine, liveActions, liveState.items]);

	const queryDetail = useResourceDetailQuery<T>(
		resource,
		activeEngine === "tanstack" ? id : null,
	);

	const loading = activeEngine === "tanstack" ? queryDetail.isLoading : liveLoading;
	const error = activeEngine === "tanstack" ? (queryDetail.error as Error | null) : liveError;
	const data = activeEngine === "tanstack" ? queryDetail.data : localDetail;

	return {
		data,
		loading,
		error,
		refetch: activeEngine === "tanstack"
			? () => queryDetail.refetch()
			: () => (id ? liveActions.fetchActive(id) : Promise.reject("No ID")),
	};
}

export interface ResourceActionsHookOptions {
	engine?: QueryEngine;
	options?: LiveQueryOptions;
}

/**
 * STANDARD HOOK: Perform CRUD mutation operations without fetching any queries.
 */
export function useResourceActions<T extends { id: string } = any>(
	resource: string,
	options?: ResourceActionsHookOptions,
) {
	const context = useContext(QueryContext);
	const activeEngine = options?.engine || context?.engine || "live";

	const { actions: liveActions } = useLiveQuery<T>(resource, options?.options);
	const createMutation = useResourceCreateMutation<T>(resource);
	const updateMutation = useResourceUpdateMutation<T>(resource);
	const deleteMutation = useResourceDeleteMutation(resource);

	const create = async (data: Partial<T>) => {
		if (activeEngine === "tanstack") {
			return createMutation.mutateAsync(data);
		} else {
			return liveActions.create(data);
		}
	};

	const update = async (id: string, data: Partial<T>) => {
		if (activeEngine === "tanstack") {
			return updateMutation.mutateAsync({ id, data });
		} else {
			return liveActions.update(id, data);
		}
	};

	const remove = async (id: string) => {
		if (activeEngine === "tanstack") {
			return deleteMutation.mutateAsync(id);
		} else {
			return liveActions.delete(id);
		}
	};

	return {
		create,
		update,
		delete: remove,
		isPending: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
	};
}

// --- React Hook Form Integration Hook ---

export interface UseResourceFormOptions<T> {
	resource: string;
	id?: string;
	schema?: any;
	defaultValues?: Partial<T>;
	onSubmitSuccess?: (data: T) => void;
	onSubmitError?: (error: Error) => void;
	engine?: QueryEngine;
	options?: LiveQueryOptions;
}

/**
 * STANDARD HOOK: Shadcn-friendly React Hook Form adapter.
 * Sets up UseForm, handles automatic initial value fetch for editing, Zod validation,
 * and handles mutations using either the Zustand real-time engine or TanStack mutations.
 */
export function useResourceForm<T extends { id: string } = any>({
	resource,
	id,
	schema,
	defaultValues,
	onSubmitSuccess,
	onSubmitError,
	engine,
	options,
}: UseResourceFormOptions<T>) {
	const context = useContext(QueryContext);
	const activeEngine = engine || context?.engine || "live";

	const actionsHook = useResourceActions<T>(resource, { engine: activeEngine, options });
	const { data: detailData } = useResourceDetail<T>(
		resource,
		id || null,
		{ engine: activeEngine, options }
	);

	const form = useRHFForm<any>({
		resolver: schema ? zodResolver(schema) : undefined,
		defaultValues: defaultValues || {},
	});

	// Load existing record for Edit mode
	useEffect(() => {
		if (!id) {
			if (defaultValues) {
				form.reset(defaultValues);
			}
			return;
		}

		if (detailData) {
			form.reset(detailData);
		}
	}, [id, defaultValues, detailData, form]);

	const onSubmit = async (values: any) => {
		try {
			let resultRecord: T;
			if (id) {
				resultRecord = await actionsHook.update(id, values);
			} else {
				resultRecord = await actionsHook.create(values);
			}
			onSubmitSuccess?.(resultRecord);
			return resultRecord;
		} catch (err: any) {
			const errorInstance = err instanceof Error ? err : new Error(String(err));
			onSubmitError?.(errorInstance);
			throw errorInstance;
		}
	};

	return {
		form,
		onSubmit: form.handleSubmit(onSubmit),
		isSubmitting: form.formState.isSubmitting || actionsHook.isPending,
	};
}

export interface UseResourceTableOptions {
	initialCurrent?: number;
	initialPageSize?: number;
	initialSorter?: { field: string; order: "asc" | "desc" };
	queryParams?: any;
	engine?: QueryEngine;
	options?: LiveQueryOptions;
	syncWithUrl?: boolean;
}

/**
 * STANDARD TABLE HOOK: Inspired by Refine's useTable.
 * Manages table pagination, sorting, search, and page sizing automatically.
 * Supports optional query parameter synchronization with the browser URL.
 */
export function useResourceTable<T extends { id: string } = any>(
	resource: string,
	options?: UseResourceTableOptions,
) {
	const context = useContext(QueryContext);
	const activeEngine = options?.engine || context?.engine || "live";

	// States for page, pageSize, sorter, search
	const [current, setCurrent] = useState(options?.initialCurrent || 1);
	const [pageSize, setPageSize] = useState(options?.initialPageSize || 10);
	const [sorter, setSorter] = useState<{ field: string; order: "asc" | "desc" } | null>(
		options?.initialSorter || null,
	);
	const [searchQuery, setSearchQuery] = useState("");

	// 1. Read initial state from URL on mount (if syncWithUrl is active)
	useEffect(() => {
		if (!options?.syncWithUrl || typeof window === "undefined") return;
		try {
			const url = new URL(window.location.href);
			const q = url.searchParams.get("q");
			const pageVal = url.searchParams.get("page");
			const limitVal = url.searchParams.get("limit");
			const sortVal = url.searchParams.get("sort");
			const orderVal = url.searchParams.get("order");

			if (q) setSearchQuery(q);
			if (pageVal) setCurrent(parseInt(pageVal, 10) || 1);
			if (limitVal) setPageSize(parseInt(limitVal, 10) || 10);
			if (sortVal) setSorter({ field: sortVal, order: (orderVal as "asc" | "desc") || "asc" });
		} catch (e) {
			console.warn("[useResourceTable] Failed to parse URL search params:", e);
		}
	}, []);

	// 2. Write changes back to URL query parameters
	useEffect(() => {
		if (!options?.syncWithUrl || typeof window === "undefined") return;
		try {
			const url = new URL(window.location.href);

			if (searchQuery) url.searchParams.set("q", searchQuery);
			else url.searchParams.delete("q");

			url.searchParams.set("page", String(current));
			url.searchParams.set("limit", String(pageSize));

			if (sorter) {
				url.searchParams.set("sort", sorter.field);
				url.searchParams.set("order", sorter.order);
			} else {
				url.searchParams.delete("sort");
				url.searchParams.delete("order");
			}

			window.history.replaceState({}, "", url.toString());
		} catch (e) {
			console.warn("[useResourceTable] Failed to update URL search params:", e);
		}
	}, [current, pageSize, sorter, searchQuery, options?.syncWithUrl]);

	// Combine query parameters
	const combinedQueryParams = useMemo(() => {
		const params = {
			...options?.queryParams,
			page: current,
			limit: pageSize,
		};
		if (sorter) {
			params.sort = sorter.field;
			params.order = sorter.order;
		}
		if (searchQuery) {
			params.q = searchQuery;
		}
		return params;
	}, [options?.queryParams, current, pageSize, sorter, searchQuery]);

	// Fetch data using useResourceList
	const { items, pagination, loading, error, refetch, actions } = useResourceList<T>(resource, {
		queryParams: combinedQueryParams,
		engine: activeEngine,
		options: options?.options,
	});

	// Pagination actions
	const next = () => {
		if (pagination?.hasNext) {
			if (activeEngine === "live" && actions) {
				actions.next().catch(console.error);
			} else {
				setCurrent((c) => c + 1);
			}
		}
	};

	const prev = () => {
		if (pagination?.hasPrev) {
			if (activeEngine === "live" && actions) {
				actions.prev().catch(console.error);
			} else {
				setCurrent((c) => Math.max(1, c - 1));
			}
		}
	};

	const setPage = (pageNumber: number) => {
		if (activeEngine === "live" && actions) {
			actions.paginate(pageNumber, pageSize).catch(console.error);
		} else {
			setCurrent(pageNumber);
		}
	};

	const changePageSize = (size: number) => {
		setPageSize(size);
		setCurrent(1); // Reset to page 1 on page size change
		if (activeEngine === "live" && actions) {
			actions.paginate(1, size).catch(console.error);
		}
	};

	const changeSorter = (field: string, order?: "asc" | "desc") => {
		const newOrder = order || (sorter?.field === field && sorter?.order === "asc" ? "desc" : "asc");
		setSorter({ field, order: newOrder });
		if (activeEngine === "live" && actions) {
			actions.sort(field, newOrder).catch(console.error);
		}
	};

	const search = (query: string) => {
		setSearchQuery(query);
		setCurrent(1);
		if (activeEngine === "live" && actions) {
			actions.search(query).catch(console.error);
		}
	};

	return {
		tableData: items,
		pagination,
		loading,
		error,
		refetch,
		current,
		pageSize,
		sorter,
		searchQuery,
		next,
		prev,
		setPage,
		setPageSize: changePageSize,
		setSorter: changeSorter,
		setSearchQuery: search,
	};
}

export interface UseResourceSelectOptions<T> {
	resource: string;
	optionLabel?: keyof T | ((item: T) => string);
	optionValue?: keyof T;
	queryParams?: any;
	engine?: QueryEngine;
	options?: LiveQueryOptions;
}

/**
 * STANDARD SELECT HOOK: Inspired by Refine's useSelect.
 * Fetches a list of records and maps them into option dropdown collections (label/value objects).
 */
export function useResourceSelect<T extends { id: string } = any>(
	options: UseResourceSelectOptions<T>,
) {
	const context = useContext(QueryContext);
	const activeEngine = options.engine || context?.engine || "live";

	const { items, loading, error, refetch } = useResourceList<T>(options.resource, {
		queryParams: options.queryParams,
		engine: activeEngine,
		options: options.options,
	});

	const selectOptions = useMemo(() => {
		return items.map((item) => {
			const label = typeof options.optionLabel === "function"
				? options.optionLabel(item)
				: String(item[options.optionLabel || ("name" as keyof T)] || item.id);

			const value = item[options.optionValue || ("id" as keyof T)];

			return { label, value };
		});
	}, [items, options.optionLabel, options.optionValue]);

	return {
		options: selectOptions,
		loading,
		error,
		refetch,
	};
}

/**
 * Alias to maintain maximum compatibility with Refine useShow signature.
 */
export const useResourceShow = useResourceDetail;

export interface UseResourceOptions<T> {
	id?: string | null;
	queryParams?: any;
	engine?: QueryEngine;
	options?: LiveQueryOptions;
}

/**
 * UNIFIED STANDARD HOOK: Returns data (items or single detail), pagination, and CRUD mutators.
 * Handles both engines natively.
 */
export function useResource<T extends { id: string } = any>(
	resource: string,
	options?: UseResourceOptions<T>,
) {
	const context = useContext(QueryContext);
	const activeEngine = options?.engine || context?.engine || "live";

	const listHook = useResourceList<T>(resource, {
		queryParams: options?.queryParams,
		engine: activeEngine,
		options: options?.options,
	});

	const detailHook = useResourceDetail<T>(resource, options?.id || null, {
		engine: activeEngine,
		options: options?.options,
	});

	const actionsHook = useResourceActions<T>(resource, {
		engine: activeEngine,
		options: options?.options,
	});

	const loading = options?.id ? detailHook.loading : listHook.loading;
	const error = options?.id ? detailHook.error : listHook.error;
	const data = options?.id ? detailHook.data : listHook.items;

	return {
		data,
		pagination: options?.id ? null : listHook.pagination,
		loading,
		error,
		create: actionsHook.create,
		update: actionsHook.update,
		delete: actionsHook.delete,
		refetch: options?.id ? detailHook.refetch : listHook.refetch,
	};
}

// --- Composable Sub-Components (Shadcn UI Composition Style) ---

// --- ResourceList Context & Components ---

interface ResourceListContextProps<T> {
	resource: string;
	items: T[];
	pagination: PaginationMeta | null;
	loading: boolean;
	error: Error | null;
	searchQuery: string;
	setSearchQuery: (query: string) => void;
	page: number;
	setPage: React.Dispatch<React.SetStateAction<number>>;
	activeEngine: QueryEngine;
	actions: LiveQueryActions<T> | null;
}

const ResourceListContext = createContext<ResourceListContextProps<any> | null>(null);

export function useResourceListContext<T = any>() {
	const context = useContext(ResourceListContext);
	if (!context) {
		throw new Error("ResourceList sub-components must be used inside a ResourceList provider");
	}
	return context as ResourceListContextProps<T>;
}

export interface ResourceListProps<T extends { id: string }> {
	resource: string;
	queryParams?: any;
	options?: LiveQueryOptions;
	engine?: QueryEngine;
	className?: string;
	containerClassName?: string;
	itemClassName?: string;
	searchClassName?: string;
	paginationClassName?: string;
	renderItem?: (item: T, index: number, actions: LiveQueryActions<T> | null) => React.ReactNode;
	renderLoading?: () => React.ReactNode;
	renderError?: (error: Error) => React.ReactNode;
	renderEmpty?: () => React.ReactNode;
	showSearch?: boolean | Array<keyof T>; // If array, searches locally on those fields. If true, searches on server.
	showPagination?: boolean;
	onItemClick?: (item: T) => void;
	children?: React.ReactNode | ((item: T, index: number, actions: LiveQueryActions<T> | null) => React.ReactNode);
}

/**
 * Composable list component.
 * If passed a `children` React node, acts as a provider allowing composable Shadcn-style sub-components.
 * Otherwise, renders the default monolithic layout.
 */
export function ResourceList<T extends { id: string } = any>({
	resource,
	queryParams,
	options,
	engine,
	className,
	containerClassName,
	itemClassName,
	searchClassName,
	paginationClassName,
	renderItem,
	renderLoading,
	renderError,
	renderEmpty,
	showSearch = false,
	showPagination = false,
	onItemClick,
	children,
}: ResourceListProps<T>) {
	const context = useContext(QueryContext);
	const activeEngine = engine || context?.engine || "live";

	// Local search and page parameters
	const [localSearchQuery, setLocalSearchQuery] = useState("");
	const [page, setPage] = useState(1);

	const searchParams = useMemo(() => {
		const params = { ...queryParams };
		if (showSearch === true && localSearchQuery) {
			params.q = localSearchQuery;
		}
		if (showPagination) {
			params.page = page;
		}
		return params;
	}, [queryParams, localSearchQuery, showSearch, showPagination, page]);

	const { items, pagination, loading, error, actions } = useResourceList<T>(resource, {
		queryParams: searchParams,
		engine: activeEngine,
		options,
	});

	// Context value shared among all sub-components
	const contextValue = useMemo<ResourceListContextProps<T>>(() => ({
		resource,
		items,
		pagination,
		loading,
		error,
		searchQuery: localSearchQuery,
		setSearchQuery: setLocalSearchQuery,
		page,
		setPage,
		activeEngine,
		actions,
	}), [resource, items, pagination, loading, error, localSearchQuery, page, activeEngine, actions]);

	if (children && typeof children !== "function") {
		return (
			<ResourceListContext.Provider value={contextValue}>
				<div className={className}>{children}</div>
			</ResourceListContext.Provider>
		);
	}

	const activeRenderItem = typeof children === "function" ? children : renderItem;

	if (!activeRenderItem) {
		throw new Error("ResourceList: Either children (as a render function) or renderItem must be specified");
	}

	return (
		<ResourceListContext.Provider value={contextValue}>
			<div className={className}>
				{showSearch && (
					<ResourceListSearch className={searchClassName} />
				)}

				<ResourceListItems
					className={containerClassName}
					itemClassName={itemClassName}
					onItemClick={onItemClick}
					renderLoading={renderLoading}
					renderError={renderError}
					renderEmpty={renderEmpty}
				>
					{activeRenderItem}
				</ResourceListItems>

				{showPagination && (
					<ResourceListPagination className={paginationClassName} />
				)}
			</div>
		</ResourceListContext.Provider>
	);
}

/**
 * Composable search bar inspired by Shadcn UI.
 */
export function ResourceListSearch(props: React.InputHTMLAttributes<HTMLInputElement>) {
	const { resource, searchQuery, setSearchQuery, actions, setPage } = useResourceListContext();
	const components = useComponents();

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		setSearchQuery(val);

		if (actions) {
			// Using SWR / Live engine
			actions.search(val).catch(console.error);
		} else {
			// Using TanStack engine, reset to page 1 on search
			setPage(1);
		}
	};

	const InputTag = components.Input || "input";

	return (
		<InputTag
			type="search"
			value={searchQuery}
			onChange={handleSearchChange}
			placeholder={`Search ${resource}...`}
			aria-label={`Search ${resource}`}
			{...props}
		/>
	);
}

export interface ResourceListItemsProps<T> {
	className?: string;
	itemClassName?: string;
	onItemClick?: (item: T) => void;
	renderLoading?: () => React.ReactNode;
	renderError?: (error: Error) => React.ReactNode;
	renderEmpty?: () => React.ReactNode;
	children: (item: T, index: number, actions: LiveQueryActions<T> | null) => React.ReactNode;
}

/**
 * Composable items list container inspired by Shadcn UI.
 */
export function ResourceListItems<T extends { id: string } = any>({
	className,
	itemClassName,
	onItemClick,
	renderLoading,
	renderError,
	renderEmpty,
	children,
}: ResourceListItemsProps<T>) {
	const { resource, items, loading, error, actions } = useResourceListContext<T>();

	if (loading && items.length === 0) {
		return renderLoading ? <>{renderLoading()}</> : <div className="bq-loading">Loading {resource}...</div>;
	}

	if (error && items.length === 0) {
		return renderError ? <>{renderError(error)}</> : <div className="bq-error">Error: {error.message}</div>;
	}

	if (items.length === 0) {
		return renderEmpty ? <>{renderEmpty()}</> : <div className="bq-empty">No {resource} found.</div>;
	}

	return (
		<div className={className}>
			{items.map((item, idx) => (
				<div
					key={item.id}
					className={itemClassName}
					onClick={() => onItemClick?.(item)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							onItemClick?.(item);
						}
					}}
					role={onItemClick ? "button" : undefined}
					tabIndex={onItemClick ? 0 : undefined}
				>
					{children(item, idx, actions)}
				</div>
			))}
		</div>
	);
}

/**
 * Composable pagination control inspired by Shadcn UI.
 */
export function ResourceListPagination(props: React.HTMLAttributes<HTMLDivElement>) {
	const { pagination, loading, setPage, activeEngine, actions } = useResourceListContext();
	const components = useComponents();

	if (!pagination) return null;

	const ButtonTag = components.Button || "button";

	return (
		<div {...props}>
			<ButtonTag
				type="button"
				onClick={() => {
					if (activeEngine === "live") {
						actions?.prev();
					} else {
						setPage((p) => Math.max(1, p - 1));
					}
				}}
				disabled={!pagination.hasPrev || loading}
			>
				Previous
			</ButtonTag>
			<span className="bq-pagination-info">
				Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
			</span>
			<ButtonTag
				type="button"
				onClick={() => {
					if (activeEngine === "live") {
						actions?.next();
					} else {
						setPage((p) => p + 1);
					}
				}}
				disabled={!pagination.hasNext || loading}
			>
				Next
			</ButtonTag>
		</div>
	);
}

// --- ResourceDetail Context & Components ---

interface ResourceDetailContextProps<T> {
	resource: string;
	data: T | null;
	loading: boolean;
	error: Error | null;
	actions: LiveQueryActions<T> | null;
}

const ResourceDetailContext = createContext<ResourceDetailContextProps<any> | null>(null);

export function useResourceDetailContext<T = any>() {
	const context = useContext(ResourceDetailContext);
	if (!context) {
		throw new Error("ResourceDetail sub-components must be used inside a ResourceDetail provider");
	}
	return context as ResourceDetailContextProps<T>;
}

export interface ResourceDetailProps<T extends { id: string }> {
	resource: string;
	id: string;
	engine?: QueryEngine;
	options?: LiveQueryOptions;
	className?: string;
	children?: React.ReactNode | ((item: T, actions: LiveQueryActions<T> | null) => React.ReactNode);
	renderLoading?: () => React.ReactNode;
	renderError?: (error: Error) => React.ReactNode;
}

/**
 * Composable details provider component.
 */
export function ResourceDetail<T extends { id: string } = any>({
	resource,
	id,
	engine,
	options,
	className,
	children,
	renderLoading,
	renderError,
}: ResourceDetailProps<T>) {
	const context = useContext(QueryContext);
	const activeEngine = engine || context?.engine || "live";

	const { data, loading, error } = useResourceDetail<T>(resource, id, {
		engine: activeEngine,
		options,
	});

	// Capture live SWR actions
	const { actions } = useLiveQuery<T>(resource, options);

	const contextValue = useMemo<ResourceDetailContextProps<T>>(() => ({
		resource,
		data: data || null,
		loading,
		error,
		actions,
	}), [resource, data, loading, error, actions]);

	if (typeof children === "function") {
		// Legacy monolithic function layout
		if (loading && !data) {
			return renderLoading ? <>{renderLoading()}</> : <div className="bq-loading">Loading details...</div>;
		}

		if (error) {
			return renderError ? <>{renderError(error)}</> : <div className="bq-error">Error: {error.message}</div>;
		}

		if (!data) {
			return <div className="bq-empty">Record not found.</div>;
		}

		return <div className={className}>{children(data, actions)}</div>;
	}

	return (
		<ResourceDetailContext.Provider value={contextValue}>
			<div className={className}>{children}</div>
		</ResourceDetailContext.Provider>
	);
}

export interface ResourceDetailContentProps<T> {
	renderLoading?: () => React.ReactNode;
	renderError?: (error: Error) => React.ReactNode;
	renderEmpty?: () => React.ReactNode;
	children: (item: T, actions: LiveQueryActions<T> | null) => React.ReactNode;
}

/**
 * Composable detail content wrapper inspired by Shadcn UI.
 */
export function ResourceDetailContent<T = any>({
	renderLoading,
	renderError,
	renderEmpty,
	children,
}: ResourceDetailContentProps<T>) {
	const { resource, data, loading, error, actions } = useResourceDetailContext<T>();

	if (loading && !data) {
		return renderLoading ? <>{renderLoading()}</> : <div className="bq-loading">Loading details...</div>;
	}

	if (error) {
		return renderError ? <>{renderError(error)}</> : <div className="bq-error">Error: {error.message}</div>;
	}

	if (!data) {
		return renderEmpty ? <>{renderEmpty()}</> : <div className="bq-empty">Record not found.</div>;
	}

	return <>{children(data, actions)}</>;
}

// --- ResourceForm Context & Components ---

interface ResourceFormContextProps {
	resource: string;
	id?: string;
	form: UseFormReturn<any>;
	fields: FormFieldDescriptor[];
	isSubmitting: boolean;
	error: Error | null;
}

const ResourceFormContext = createContext<ResourceFormContextProps | null>(null);

export function useResourceFormContext() {
	const context = useContext(ResourceFormContext);
	if (!context) {
		throw new Error("ResourceForm sub-components must be used inside a ResourceForm provider");
	}
	return context;
}

export interface FormFieldDescriptor {
	name: string;
	label: string;
	type: "text" | "number" | "checkbox" | "select" | "date" | "textarea";
	required?: boolean;
	placeholder?: string;
	options?: Array<{ label: string; value: any }>;
	default?: any;
}

export interface ResourceFormProps<T extends { id: string }> {
	resource: string;
	id?: string; // If provided, fetches and edits the record. Otherwise, creates a new one.
	schema?: any; // Zod schema to auto-extract fields from
	fields?: FormFieldDescriptor[]; // Custom field descriptions
	defaultValues?: Partial<T>;
	onSubmitSuccess?: (data: T) => void;
	onSubmitError?: (error: Error) => void;
	engine?: QueryEngine;
	options?: LiveQueryOptions;
	className?: string;
	fieldClassName?: string;
	labelClassName?: string;
	inputClassName?: string;
	submitButtonClassName?: string;
	submitLabel?: string;
	renderForm?: (props: {
		form: UseFormReturn<any>;
		fields: React.ReactNode;
		isSubmitting: boolean;
		error: Error | null;
	}) => React.ReactNode;
	children?: React.ReactNode;
}

/**
 * Helper to dynamically extract input field descriptors from a Zod schema
 */
function getFieldsFromSchema(schema?: any): FormFieldDescriptor[] {
	if (!schema) return [];

	// Extract shape from ZodObject or ZodEffects
	let shape = schema.shape || schema._def?.shape;
	if (!shape && schema._def?.schema) {
		shape = schema._def.schema.shape || schema._def.schema._def?.shape;
	}

	if (!shape) return [];

	const fields: FormFieldDescriptor[] = [];
	for (const [key, field] of Object.entries(shape)) {
		if (key === "id" || key === "createdAt" || key === "updatedAt") continue;

		let innerType = field as any;
		let required = true;
		let defaultValue: any = undefined;
		let type: FormFieldDescriptor["type"] = "text";
		let options: FormFieldDescriptor["options"] = [];

		// Unwrap defaults, optionals, nullables
		while (innerType && innerType._def) {
			const typeName = innerType._def.typeName;
			if (typeName === "ZodOptional" || typeName === "ZodNullable") {
				required = false;
				innerType = innerType.unwrap();
			} else if (typeName === "ZodDefault") {
				defaultValue = innerType._def.defaultValue();
				innerType = innerType._def.innerType;
			} else if (typeName === "ZodEffects") {
				innerType = innerType._def.schema;
			} else {
				break;
			}
		}

		if (!innerType || !innerType._def) continue;

		const typeName = innerType._def.typeName;
		if (typeName === "ZodNumber") {
			type = "number";
		} else if (typeName === "ZodBoolean") {
			type = "checkbox";
		} else if (typeName === "ZodDate") {
			type = "date";
		} else if (typeName === "ZodEnum") {
			type = "select";
			const values = innerType._def.values || [];
			options = values.map((val: string) => ({ label: val, value: val }));
		} else if (
			key.toLowerCase().includes("description") ||
			key.toLowerCase().includes("content")
		) {
			type = "textarea";
		}

		fields.push({
			name: key,
			label: key
				.charAt(0)
				.toUpperCase()
				.concat(key.slice(1).replace(/([A-Z])/g, " $1")),
			type,
			required,
			default: defaultValue,
			options,
		});
	}

	return fields;
}

/**
 * Composable form component.
 * Integrates React Hook Form, handles component mapping overrides (Shadcn UI), and validates using Zod resolvers.
 */
export function ResourceForm<T extends { id: string } = any>({
	resource,
	id,
	schema,
	fields: customFields,
	defaultValues,
	onSubmitSuccess,
	onSubmitError,
	engine,
	options,
	className,
	fieldClassName,
	labelClassName,
	inputClassName,
	submitButtonClassName,
	submitLabel,
	renderForm,
	children,
}: ResourceFormProps<T>) {
	const { form, onSubmit, isSubmitting } = useResourceForm<T>({
		resource,
		id,
		schema,
		defaultValues,
		onSubmitSuccess,
		onSubmitError,
		engine,
		options,
	});

	const formFields = useMemo(() => {
		if (customFields && customFields.length > 0) return customFields;
		return getFieldsFromSchema(schema);
	}, [schema, customFields]);

	// Extract root-level errors
	const formError = form.formState.errors.root
		? new Error(form.formState.errors.root.message)
		: null;

	const contextValue = useMemo<ResourceFormContextProps>(() => ({
		resource,
		id,
		form,
		fields: formFields,
		isSubmitting,
		error: formError,
	}), [resource, id, form, formFields, isSubmitting, formError]);

	// Legacy layout with renderForm callback
	if (renderForm) {
		const defaultFieldsList = (
			<ResourceFormFields
				fieldClassName={fieldClassName}
				labelClassName={labelClassName}
				inputClassName={inputClassName}
			/>
		);
		return (
			<ResourceFormContext.Provider value={contextValue}>
				<form onSubmit={onSubmit} className={className}>
					{renderForm({
						form,
						fields: defaultFieldsList,
						isSubmitting,
						error: formError,
					})}
				</form>
			</ResourceFormContext.Provider>
		);
	}

	if (children) {
		return (
			<ResourceFormContext.Provider value={contextValue}>
				<form onSubmit={onSubmit} className={className}>
					{children}
				</form>
			</ResourceFormContext.Provider>
		);
	}

	// Default Monolithic Layout
	return (
		<ResourceFormContext.Provider value={contextValue}>
			<form onSubmit={onSubmit} className={className}>
				<ResourceFormFields
					fieldClassName={fieldClassName}
					labelClassName={labelClassName}
					inputClassName={inputClassName}
				/>
				<ResourceFormSubmit className={submitButtonClassName}>
					{submitLabel}
				</ResourceFormSubmit>
			</form>
		</ResourceFormContext.Provider>
	);
}

export interface ResourceFormFieldsProps {
	className?: string;
	fieldClassName?: string;
	labelClassName?: string;
	inputClassName?: string;
}

/**
 * Composable field iterator inspired by Shadcn UI.
 */
export function ResourceFormFields({
	className,
	fieldClassName,
	labelClassName,
	inputClassName,
}: ResourceFormFieldsProps) {
	const { resource, form, fields } = useResourceFormContext();
	const components = useComponents();

	// Component tags
	const InputTag = components.Input || "input";
	const SelectTag = components.Select || "select";
	const TextareaTag = components.Textarea || "textarea";
	const CheckboxTag = components.Checkbox || "input";
	const LabelTag = components.Label || "label";
	const FormItemTag = components.FormItem || "div";

	return (
		<div className={className}>
			{fields.map((field) => {
				const fieldId = `bq-form-${resource}-${field.name}`;
				const error = form.formState.errors[field.name];

				return (
					<FormItemTag key={field.name} className={fieldClassName}>
						<LabelTag htmlFor={fieldId} className={labelClassName}>
							{field.label}
							{field.required && <span className="bq-required-star"> *</span>}
						</LabelTag>

						{field.type === "textarea" ? (
							<TextareaTag
								id={fieldId}
								placeholder={field.placeholder}
								className={inputClassName}
								{...form.register(field.name, { required: field.required })}
							/>
						) : field.type === "select" ? (
							<SelectTag
								id={fieldId}
								className={inputClassName}
								{...form.register(field.name, { required: field.required })}
							>
								<option value="">Select option...</option>
								{field.options?.map((opt: any) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</SelectTag>
						) : field.type === "checkbox" ? (
							<CheckboxTag
								id={fieldId}
								type="checkbox"
								className={inputClassName}
								{...form.register(field.name, { required: field.required })}
							/>
						) : (
							<InputTag
								id={fieldId}
								type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
								placeholder={field.placeholder}
								className={inputClassName}
								{...form.register(field.name, {
									required: field.required,
									valueAsNumber: field.type === "number",
								})}
							/>
						)}

						{error && (
							<span className="bq-field-error" style={{ color: "red", fontSize: "0.8rem" }}>
								{String(error.message || "Field is invalid")}
							</span>
						)}
					</FormItemTag>
				);
			})}
		</div>
	);
}

export interface ResourceFormSubmitProps {
	className?: string;
	children?: React.ReactNode;
	disabled?: boolean;
}

/**
 * Composable form submit button.
 */
export function ResourceFormSubmit({
	className,
	children,
	disabled,
}: ResourceFormSubmitProps) {
	const { isSubmitting, id, resource } = useResourceFormContext();
	const components = useComponents();
	const ButtonTag = components.Button || "button";

	return (
		<ButtonTag
			type="submit"
			disabled={isSubmitting || disabled}
			className={className}
		>
			{isSubmitting ? "Saving..." : children || (id ? `Update ${resource}` : `Create ${resource}`)}
		</ButtonTag>
	);
}

export interface ResourceFormFieldProps {
	name: string;
	label?: string;
	description?: string;
	render?: (props: { field: any; fieldState: any; formState: any }) => React.ReactElement;
	children?: React.ReactNode;
	className?: string;
	labelClassName?: string;
	descriptionClassName?: string;
	messageClassName?: string;
}

/**
 * Composable field controller component inspired by Shadcn UI.
 * Integrates directly with the form context. Supports auto-rendering based on schema,
 * wrapping element children (with automatic value/onChange bindings), or custom render functions.
 */
export function ResourceFormField({
	name,
	label,
	description,
	render,
	children,
	className,
	labelClassName,
	descriptionClassName,
	messageClassName,
}: ResourceFormFieldProps) {
	const { form, fields, resource } = useResourceFormContext();

	// Locate the schema field details if available
	const schemaField = fields?.find((f) => f.name === name);
	const displayLabel = label !== undefined ? label : (schemaField?.label || name);

	const renderControl = (fieldProps: any) => {
		if (render) {
			return render(fieldProps);
		}

		if (React.isValidElement(children)) {
			const childElement = children as React.ReactElement<any>;
			// Automatically inject field props into child component
			return React.cloneElement(childElement, {
				...fieldProps.field,
				...childElement.props,
			});
		}

		// Fallback: auto-generate standard input matching schema field type
		if (schemaField) {
			const components = useComponents();
			const InputTag = components.Input || "input";
			const SelectTag = components.Select || "select";
			const TextareaTag = components.Textarea || "textarea";
			const CheckboxTag = components.Checkbox || "input";

			const inputProps = {
				id: `bq-form-${resource}-${name}`,
				...fieldProps.field,
				placeholder: schemaField.placeholder,
			};

			if (schemaField.type === "textarea") {
				return <TextareaTag {...inputProps} />;
			}
			if (schemaField.type === "select") {
				return (
					<SelectTag {...inputProps}>
						<option value="">Select option...</option>
						{schemaField.options?.map((opt: any) => (
							<option key={opt.value} value={opt.value}>
								{opt.label}
							</option>
						))}
					</SelectTag>
				);
			}
			if (schemaField.type === "checkbox") {
				return <CheckboxTag type="checkbox" {...inputProps} checked={!!fieldProps.field.value} />;
			}
			return (
				<InputTag
					type={schemaField.type === "number" ? "number" : schemaField.type === "date" ? "date" : "text"}
					{...inputProps}
					value={fieldProps.field.value ?? ""}
				/>
			);
		}

		return null;
	};

	return (
		<Controller
			name={name}
			control={form.control}
			render={(fieldProps) => (
				<ResourceFormItem className={className}>
					{displayLabel && (
						<ResourceFormLabel className={labelClassName} htmlFor={`bq-form-${resource}-${name}`}>
							{displayLabel}
							{schemaField?.required && <span className="bq-required-star"> *</span>}
						</ResourceFormLabel>
					)}
					<ResourceFormControl>
						{renderControl(fieldProps)}
					</ResourceFormControl>
					{description && (
						<ResourceFormDescription className={descriptionClassName}>
							{description}
						</ResourceFormDescription>
					)}
					<ResourceFormMessage name={name} className={messageClassName} />
				</ResourceFormItem>
			)}
		/>
	);
}

/**
 * Composable FormItem wrapper inspired by Shadcn UI.
 */
export function ResourceFormItem({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	const components = useComponents();
	const FormItemTag = components.FormItem || "div";
	return (
		<FormItemTag className={className} {...props}>
			{children}
		</FormItemTag>
	);
}

/**
 * Composable FormLabel element inspired by Shadcn UI.
 */
export function ResourceFormLabel({ children, className, htmlFor, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
	const components = useComponents();
	const LabelTag = components.Label || "label";
	return (
		<LabelTag className={className} htmlFor={htmlFor} {...props}>
			{children}
		</LabelTag>
	);
}

/**
 * Composable FormControl container inspired by Shadcn UI.
 */
export function ResourceFormControl({ children }: { children: React.ReactNode }) {
	return <>{children}</>;
}

/**
 * Composable FormDescription block inspired by Shadcn UI.
 */
export function ResourceFormDescription({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
	return (
		<p className={className} style={{ fontSize: "0.8rem", color: "gray" }} {...props}>
			{children}
		</p>
	);
}

/**
 * Composable FormMessage validation error label inspired by Shadcn UI.
 */
export function ResourceFormMessage({ name, className, ...props }: { name: string; className?: string } & React.HTMLAttributes<HTMLSpanElement>) {
	const { form } = useResourceFormContext();
	const error = form.formState.errors[name];
	if (!error) return null;
	return (
		<span className={className} style={{ color: "red", fontSize: "0.8rem" }} {...props}>
			{String(error.message || "Field is invalid")}
		</span>
	);
}

// --- ResourceDelete Primitive ---

export interface ResourceDeleteProps {
	resource: string;
	id: string;
	engine?: QueryEngine;
	options?: LiveQueryOptions;
	confirmMessage?: string;
	onSuccess?: () => void;
	onError?: (error: Error) => void;
	className?: string;
	children?: React.ReactNode;
}

/**
 * Headless, unstyled button that deletes a resource record on click.
 */
export function ResourceDelete({
	resource,
	id,
	engine,
	options,
	confirmMessage,
	onSuccess,
	onError,
	className,
	children,
}: ResourceDeleteProps) {
	const components = useComponents();
	const { delete: deleteAction, isPending } = useResourceActions(resource, { engine, options });

	const [deleting, setDeleting] = useState(false);

	const handleDelete = async () => {
		if (confirmMessage && !window.confirm(confirmMessage)) {
			return;
		}

		setDeleting(true);
		try {
			await deleteAction(id);
			onSuccess?.();
		} catch (err: any) {
			const errorInstance = err instanceof Error ? err : new Error(String(err));
			onError?.(errorInstance);
		} finally {
			setDeleting(false);
		}
	};

	const ButtonTag = components.Button || "button";

	return (
		<ButtonTag
			type="button"
			onClick={handleDelete}
			disabled={deleting || isPending}
			className={className}
		>
			{deleting || isPending ? "Deleting..." : children || "Delete"}
		</ButtonTag>
	);
}

// --- Prefix-free API surface aliases (Clean Imports) ---

// Hooks
export const useQuery = useResource;
export const useList = useResourceList;
export const useMany = useResourceList;
export const useDetail = useResourceDetail;
export const useShow = useResourceDetail;
export const useOne = useResourceDetail;
export const useRecord = useResourceDetail;
export const useActions = useResourceActions;
export const useForm = useResourceForm;
export const useTable = useResourceTable;
export const useSelect = useResourceSelect;

// --- Pre-built Better Auth UI Form Components ---

export interface LoginFormProps {
	auth: any;
	onSuccess?: (data: any) => void;
	onError?: (error: Error) => void;
	className?: string;
	showLabels?: boolean;
}

export function LoginForm({ auth, onSuccess, onError, className, showLabels = true }: LoginFormProps) {
	const components = useComponents();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [errorMsg, setErrorMsg] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!auth?.signIn?.email) {
			throw new Error("Invalid Better Auth client passed to LoginForm");
		}

		setLoading(true);
		setErrorMsg("");

		try {
			const res = await auth.signIn.email({
				email,
				password,
			});
			if (res?.error) {
				throw new Error(res.error.message || "Failed to sign in");
			}
			onSuccess?.(res?.data);
		} catch (err: any) {
			const msg = err.message || String(err);
			setErrorMsg(msg);
			onError?.(err instanceof Error ? err : new Error(msg));
		} finally {
			setLoading(false);
		}
	};

	const InputTag = components.Input || "input";
	const ButtonTag = components.Button || "button";
	const LabelTag = components.Label || "label";

	return (
		<form onSubmit={handleSubmit} className={className} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			{errorMsg && (
				<div style={{ color: "red", fontSize: "0.85rem" }}>
					{errorMsg}
				</div>
			)}
			<div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
				{showLabels && <LabelTag htmlFor="bq-login-email">Email</LabelTag>}
				<InputTag
					id="bq-login-email"
					type="email"
					required
					placeholder="name@example.com"
					value={email}
					onChange={(e: any) => setEmail(e.target.value)}
				/>
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
				{showLabels && <LabelTag htmlFor="bq-login-password">Password</LabelTag>}
				<InputTag
					id="bq-login-password"
					type="password"
					required
					placeholder="••••••••"
					value={password}
					onChange={(e: any) => setPassword(e.target.value)}
				/>
			</div>
			<ButtonTag type="submit" disabled={loading}>
				{loading ? "Signing in..." : "Sign In"}
			</ButtonTag>
		</form>
	);
}

export interface RegisterFormProps {
	auth: any;
	onSuccess?: (data: any) => void;
	onError?: (error: Error) => void;
	className?: string;
	showLabels?: boolean;
}

export function RegisterForm({ auth, onSuccess, onError, className, showLabels = true }: RegisterFormProps) {
	const components = useComponents();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [errorMsg, setErrorMsg] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!auth?.signUp?.email) {
			throw new Error("Invalid Better Auth client passed to RegisterForm");
		}

		setLoading(true);
		setErrorMsg("");

		try {
			const res = await auth.signUp.email({
				email,
				password,
				name,
			});
			if (res?.error) {
				throw new Error(res.error.message || "Failed to sign up");
			}
			onSuccess?.(res?.data);
		} catch (err: any) {
			const msg = err.message || String(err);
			setErrorMsg(msg);
			onError?.(err instanceof Error ? err : new Error(msg));
		} finally {
			setLoading(false);
		}
	};

	const InputTag = components.Input || "input";
	const ButtonTag = components.Button || "button";
	const LabelTag = components.Label || "label";

	return (
		<form onSubmit={handleSubmit} className={className} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			{errorMsg && (
				<div style={{ color: "red", fontSize: "0.85rem" }}>
					{errorMsg}
				</div>
			)}
			<div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
				{showLabels && <LabelTag htmlFor="bq-register-name">Name</LabelTag>}
				<InputTag
					id="bq-register-name"
					type="text"
					required
					placeholder="John Doe"
					value={name}
					onChange={(e: any) => setName(e.target.value)}
				/>
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
				{showLabels && <LabelTag htmlFor="bq-register-email">Email</LabelTag>}
				<InputTag
					id="bq-register-email"
					type="email"
					required
					placeholder="name@example.com"
					value={email}
					onChange={(e: any) => setEmail(e.target.value)}
				/>
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
				{showLabels && <LabelTag htmlFor="bq-register-password">Password</LabelTag>}
				<InputTag
					id="bq-register-password"
					type="password"
					required
					placeholder="••••••••"
					value={password}
					onChange={(e: any) => setPassword(e.target.value)}
				/>
			</div>
			<ButtonTag type="submit" disabled={loading}>
				{loading ? "Signing up..." : "Sign Up"}
			</ButtonTag>
		</form>
	);
}

export interface UserProfileFormProps {
	auth: any;
	onSuccess?: (data: any) => void;
	onError?: (error: Error) => void;
	className?: string;
	showLabels?: boolean;
}

export function UserProfileForm({ auth, onSuccess, onError, className, showLabels = true }: UserProfileFormProps) {
	const components = useComponents();
	
	// Hook to session if available in better-auth SDK
	const sessionHook = auth?.useSession?.();
	const sessionUser = sessionHook?.data?.user;

	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [errorMsg, setErrorMsg] = useState("");
	const [successMsg, setSuccessMsg] = useState("");

	// Populate values when session loads
	useEffect(() => {
		if (sessionUser) {
			setName(sessionUser.name || "");
			setEmail(sessionUser.email || "");
		}
	}, [sessionUser]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!auth?.updateUser) {
			throw new Error("Invalid Better Auth client or missing updateUser method");
		}

		setLoading(true);
		setErrorMsg("");
		setSuccessMsg("");

		try {
			const res = await auth.updateUser({
				name,
				email,
			});
			if (res?.error) {
				throw new Error(res.error.message || "Failed to update profile");
			}
			setSuccessMsg("Profile updated successfully!");
			onSuccess?.(res?.data);
		} catch (err: any) {
			const msg = err.message || String(err);
			setErrorMsg(msg);
			onError?.(err instanceof Error ? err : new Error(msg));
		} finally {
			setLoading(false);
		}
	};

	const InputTag = components.Input || "input";
	const ButtonTag = components.Button || "button";
	const LabelTag = components.Label || "label";

	return (
		<form onSubmit={handleSubmit} className={className} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			{errorMsg && (
				<div style={{ color: "red", fontSize: "0.85rem" }}>
					{errorMsg}
				</div>
			)}
			{successMsg && (
				<div style={{ color: "green", fontSize: "0.85rem" }}>
					{successMsg}
				</div>
			)}
			<div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
				{showLabels && <LabelTag htmlFor="bq-profile-name">Name</LabelTag>}
				<InputTag
					id="bq-profile-name"
					type="text"
					required
					value={name}
					onChange={(e: any) => setName(e.target.value)}
				/>
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
				{showLabels && <LabelTag htmlFor="bq-profile-email">Email</LabelTag>}
				<InputTag
					id="bq-profile-email"
					type="email"
					required
					value={email}
					onChange={(e: any) => setEmail(e.target.value)}
				/>
			</div>
			<ButtonTag type="submit" disabled={loading}>
				{loading ? "Updating..." : "Update Profile"}
			</ButtonTag>
		</form>
	);
}

export interface AuthenticatedProps {
	auth: any;
	children: React.ReactNode;
	fallback?: React.ReactNode;
	loadingFallback?: React.ReactNode;
}

/**
 * Page guarding component. Only renders children if user session is active.
 */
export function Authenticated({
	auth,
	children,
	fallback = null,
	loadingFallback = <div>Loading session...</div>,
}: AuthenticatedProps) {
	const sessionHook = auth?.useSession?.();
	const isPending = sessionHook?.isPending;
	const user = sessionHook?.data?.user;

	if (isPending) {
		return <>{loadingFallback}</>;
	}

	if (!user) {
		return <>{fallback}</>;
	}

	return <>{children}</>;
}

export interface SelectFieldProps extends Omit<ResourceFormFieldProps, "children" | "render"> {
	resource: string;
	optionLabel?: string | ((item: any) => string);
	optionValue?: string;
	queryParams?: any;
	placeholder?: string;
}

/**
 * Automates foreign-key / relationship selections.
 * Fetches matching items and maps them directly into drop-down fields.
 */
export function SelectField({
	resource,
	optionLabel = "name",
	optionValue = "id",
	queryParams,
	placeholder = "Select...",
	...formFieldProps
}: SelectFieldProps) {
	const { options, loading } = useResourceSelect({
		resource,
		optionLabel: optionLabel as any,
		optionValue: optionValue as any,
		queryParams,
	});

	const components = useComponents();
	const SelectTag = components.Select || "select";

	return (
		<ResourceFormField {...formFieldProps}>
			<SelectTag disabled={loading}>
				<option value="">{loading ? "Loading..." : placeholder}</option>
				{options.map((opt: any) => (
					<option key={opt.value} value={opt.value}>
						{opt.label}
					</option>
				))}
			</SelectTag>
		</ResourceFormField>
	);
}

export interface UploadFieldProps extends Omit<ResourceFormFieldProps, "children" | "render"> {
	uploadPath?: string;
	onUploadSuccess?: (result: { url: string; key: string }) => void;
	onUploadError?: (error: Error) => void;
	placeholder?: string;
}

/**
 * Handles file and image uploads. Integrates with the storagePlugin
 * to upload the file, render a preview, and bind the final URL to the form.
 */
export function UploadField({
	uploadPath = "/upload",
	onUploadSuccess,
	onUploadError,
	placeholder = "Choose file to upload...",
	...formFieldProps
}: UploadFieldProps) {
	const context = useContext(QueryContext);
	if (!context) {
		throw new Error("UploadField must be used inside QueryProvider");
	}
	const { client } = context;

	const [uploading, setUploading] = useState(false);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	return (
		<ResourceFormField
			render={({ field }: { field: any }) => {
				const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
					const file = e.target.files?.[0];
					if (!file) return;

					setUploading(true);
					const formData = new FormData();
					formData.append("file", file);

					try {
						// Send upload request using the client's api client instance
						// This ensures auth headers / cookies are automatically included!
						const res = await (client as any).api(uploadPath, {
							method: "POST",
							body: formData,
						});

						if (res?.error) {
							throw new Error(res.error.message || "Upload failed");
						}

						const data = res?.data || res;
						if (data?.url) {
							// Update React Hook Form value
							field.onChange(data.url);
							setPreviewUrl(data.url);
							onUploadSuccess?.(data);
						} else {
							throw new Error("No URL returned from upload response");
						}
					} catch (err: any) {
						const errorObj = err instanceof Error ? err : new Error(err?.message || "Upload failed");
						onUploadError?.(errorObj);
					} finally {
						setUploading(false);
					}
				};

				// Initial preview state from existing form value
				if (!previewUrl && field.value) {
					setPreviewUrl(field.value);
				}

				return (
					<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
						{previewUrl && (
							<div style={{ maxWidth: "150px", maxHeight: "150px", overflow: "hidden", borderRadius: "0.375rem", border: "1px solid #e5e7eb" }}>
								<img src={previewUrl} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
							</div>
						)}
						<input
							type="file"
							disabled={uploading}
							onChange={handleFileChange}
						/>
						{uploading && <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>Uploading...</span>}
					</div>
				);
			}}
			{...formFieldProps}
		/>
	);
}

// Components Exports
export const Form = ResourceForm;
export const FormField = ResourceFormField;
export const FormItem = ResourceFormItem;
export const FormLabel = ResourceFormLabel;
export const FormControl = ResourceFormControl;
export const FormDescription = ResourceFormDescription;
export const FormMessage = ResourceFormMessage;
export const FormSubmit = ResourceFormSubmit;
export const List = ResourceList;
export const ListSearch = ResourceListSearch;
export const ListItems = ResourceListItems;
export const ListPagination = ResourceListPagination;
export const Detail = ResourceDetail;
export const Show = ResourceDetail;
export const Delete = ResourceDelete;
export const UserLoginForm = LoginForm;
export const UserRegisterForm = RegisterForm;
export const UserProfileFormCard = UserProfileForm;
export const UserAuthenticated = Authenticated;
export const RelationSelect = SelectField;
export const FileUploadField = UploadField;

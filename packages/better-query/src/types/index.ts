import { Endpoint } from "better-call";
import { ZodSchema, z } from "zod";
import { QueryAdapter } from "./adapter";
import { Plugin } from "./plugins";
import { AuthOptions } from "./auth";

export type QueryOperation = "create" | "read" | "update" | "delete" | "list";
export type CrudOperation = QueryOperation;

export type RelationType = "hasOne" | "hasMany" | "belongsTo" | "belongsToMany";

export interface RelationshipConfig {
	type: RelationType;
	target: string;
	foreignKey?: string;
	targetKey?: string;
	through?: string;
	sourceKey?: string;
	targetForeignKey?: string;
	includeByDefault?: boolean;
	maxDepth?: number;
}

export interface QueryResourceConfig {
	name: string;
	schema: ZodSchema;
	tableName?: string;
	relationships?: Record<string, RelationshipConfig>;
	endpoints?: {
		create?: boolean;
		read?: boolean;
		update?: boolean;
		delete?: boolean;
		list?: boolean;
	};
	customEndpoints?: Record<string, Endpoint>;
	middlewares?: QueryMiddleware[];
	policies?: {
		create?: (context: QueryPermissionContext) => Promise<boolean | Record<string, any>> | boolean | Record<string, any>;
		read?: (context: QueryPermissionContext) => Promise<boolean | Record<string, any>> | boolean | Record<string, any>;
		update?: (context: QueryPermissionContext) => Promise<boolean | Record<string, any>> | boolean | Record<string, any>;
		delete?: (context: QueryPermissionContext) => Promise<boolean | Record<string, any>> | boolean | Record<string, any>;
		list?: (context: QueryPermissionContext) => Promise<boolean | Record<string, any>> | boolean | Record<string, any>;
	};
	scopes?: {
		create?: string[];
		read?: string[];
		update?: string[];
		delete?: string[];
		list?: string[];
	};
	ownership?: {
		field: string;
		strategy: "strict" | "flexible";
	};
	hooks?: {
		onCreate?: (context: QueryHookContext) => Promise<void> | void;
		onUpdate?: (context: QueryHookContext) => Promise<void> | void;
		onDelete?: (context: QueryHookContext) => Promise<void> | void;
		beforeCreate?: (context: QueryHookContext) => Promise<void> | void;
		beforeUpdate?: (context: QueryHookContext) => Promise<void> | void;
		beforeDelete?: (context: QueryHookContext) => Promise<void> | void;
		beforeRead?: (context: QueryHookContext) => Promise<void> | void;
		beforeList?: (context: QueryHookContext) => Promise<void> | void;
		afterCreate?: (context: QueryHookContext) => Promise<void> | void;
		afterUpdate?: (context: QueryHookContext) => Promise<void> | void;
		afterDelete?: (context: QueryHookContext) => Promise<void> | void;
		afterRead?: (context: QueryHookContext) => Promise<void> | void;
		afterList?: (context: QueryHookContext) => Promise<void> | void;
	};
	sanitization?: {
		fields?: Record<string, SanitizationRule[]>;
		global?: SanitizationRule[];
	};
	softDelete?: {
		enabled?: boolean;
		field?: string;
	};
	computed?: Record<string, (record: any) => any | Promise<any>>;
	stateMachine?: {
		field: string;
		states: string[];
		transitions: Array<{
			from: string | string[];
			to: string;
			permission?: (ctx: QueryPermissionContext) => boolean | Promise<boolean>;
		}>;
	};
	fields?: Record<string, {
		hidden?: boolean | ((ctx: QueryPermissionContext) => boolean | Promise<boolean>);
		readOnly?: boolean | ((ctx: QueryPermissionContext) => boolean | Promise<boolean>);
		defaultValue?: any | ((ctx: QueryHookContext) => any | Promise<any>);
	}>;
	aggregations?: Record<string, {
		relation: string;
		type: "count" | "sum" | "avg" | "min" | "max";
		field?: string;
	}>;
	search?: {
		fields: string[];
		strategy?: "contains" | "startsWith" | "exact" | "fuzzy";
		caseSensitive?: boolean;
	};
	multiTenancy?: {
		enabled: boolean;
		field?: string;
		contextKey?: string;
	};
	actions?: Record<string, {
		method?: "GET" | "POST" | "PUT" | "DELETE";
		handler: (ctx: QueryActionContext) => Promise<any>;
		permission?: (ctx: QueryPermissionContext) => boolean | Promise<boolean>;
	}>;
	masking?: Record<string, (value: any, ctx: QueryPermissionContext) => any>;
}

export interface QueryActionContext extends QueryHookContext {
	params: any;
}

export type CrudResourceConfig = QueryResourceConfig;

export interface QueryPermissionContext {
	user?: any;
	resource: string;
	operation: QueryOperation;
	data?: any;
	id?: string;
	request?: any;
	scopes?: string[];
	existingData?: any;
}

export type CrudPermissionContext = QueryPermissionContext;

export interface QueryHookContext {
	user?: any;
	resource: string;
	operation: QueryOperation;
	data?: any;
	id?: string;
	existingData?: any;
	result?: any;
	request?: any;
	adapter: QueryAdapter & { context?: any };
	params?: any;
	context: any;
}

export type CrudHookContext = QueryHookContext;

export interface SanitizationRule {
	type: "trim" | "escape" | "lowercase" | "uppercase" | "strip" | "custom";
	options?: any;
	customFn?: (value: any) => any;
}

export interface UserScope {
	name: string;
	permissions: string[];
}

export interface QueryOptions {
	resources: QueryResourceConfig[];
	database: QueryDatabaseOptions;
	basePath?: string;
	requireAuth?: boolean;
	middlewares?: QueryMiddleware[];
	plugins?: Plugin[];
	auth?: AuthOptions;
	/** Enable debug logging */
	debug?: boolean;
	hooks?: {
		onCreate?: (context: QueryHookContext) => Promise<void> | void;
		onUpdate?: (context: QueryHookContext) => Promise<void> | void;
		onDelete?: (context: QueryHookContext) => Promise<void> | void;
		beforeCreate?: (context: QueryHookContext) => Promise<void> | void;
		beforeUpdate?: (context: QueryHookContext) => Promise<void> | void;
		beforeDelete?: (context: QueryHookContext) => Promise<void> | void;
		beforeRead?: (context: QueryHookContext) => Promise<void> | void;
		beforeList?: (context: QueryHookContext) => Promise<void> | void;
		afterCreate?: (context: QueryHookContext) => Promise<void> | void;
		afterUpdate?: (context: QueryHookContext) => Promise<void> | void;
		afterDelete?: (context: QueryHookContext) => Promise<void> | void;
		afterRead?: (context: QueryHookContext) => Promise<void> | void;
		afterList?: (context: QueryHookContext) => Promise<void> | void;
	};
	security?: {
		rateLimit?: {
			windowMs: number;
			max: number;
		};
		cors?: {
			origin: string | string[];
			credentials?: boolean;
		};
		sanitization?: {
			enabled: boolean;
			rules: SanitizationRule[];
		};
		globalPermissions?: (
			context: QueryPermissionContext,
		) => Promise<boolean> | boolean;
	};
	audit?: {
		enabled: boolean;
		logOperations?: QueryOperation[];
		auditLogger?: (event: AuditEvent) => Promise<void> | void;
	};
}

export type CrudOptions = QueryOptions;

export interface QueryDatabaseConfig {
	provider: "sqlite" | "postgres" | "mysql";
	url: string;
	autoMigrate?: boolean;
}

export type QueryDatabaseOptions =
	| QueryDatabaseConfig
	| { adapter: QueryAdapter };

export type CrudDatabaseConfig = QueryDatabaseConfig;
export type CrudDatabaseOptions = QueryDatabaseOptions;

export interface QueryMiddleware {
	path?: string;
	handler: (context: QueryMiddlewareContext) => Promise<void> | void;
}

export interface QueryMiddlewareContext {
	user?: any;
	resource: string;
	operation: QueryOperation;
	data?: any;
	id?: string;
	request?: any;
	scopes?: string[];
	existingData?: any;
}

export type CrudMiddleware = QueryMiddleware;

export interface QueryContext {
	db: any;
	user?: any;
	impersonator?: any;
	session?: any;
	adapter: QueryAdapter;
	options: QueryOptions;
	relationships: Map<string, Record<string, RelationshipConfig>>;
	schemas: Map<string, { fields: Record<string, FieldAttribute> }>;
	pluginManager?: any;
	broadcast: (message: {
		type: string;
		channel: string;
		payload: any;
	}) => void;
}

export type CrudContext = QueryContext;

export interface FieldAttribute {
	type: "string" | "number" | "boolean" | "date" | "json";
	required?: boolean;
	unique?: boolean;
	default?: any;
	length?: number;
	references?: {
		model: string;
		field: string;
		onDelete?:
			| "cascade"
			| "restrict"
			| "set null"
			| "set default"
			| "no action";
		onUpdate?:
			| "cascade"
			| "restrict"
			| "set null"
			| "set default"
			| "no action";
	};
}

export interface IncludeOptions {
	include?: string[];
	select?: Record<string, IncludeOptions | boolean>;
	maxDepth?: number;
}

export interface PaginationParams {
	page?: number;
	limit?: number;
	search?: string;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}

export interface QueryParams extends PaginationParams {
	include?: string | string[];
	select?: Record<string, any>;
	where?: Record<string, any>;
	q?: string;
	orderBy?: Array<{
		field: string;
		direction: "asc" | "desc";
		relation?: string;
	}>;
	searchFields?: string | string[];
	filters?: Record<
		string,
		{
			operator:
				| "eq"
				| "ne"
				| "gt"
				| "gte"
				| "lt"
				| "lte"
				| "in"
				| "notin"
				| "like"
				| "ilike"
				| "between";
			value: any;
		}
	>;
	dateRange?: {
		field: string;
		start?: string;
		end?: string;
	};
}

export type CrudQueryParams = QueryParams;

export interface AuditEvent {
	timestamp: Date;
	user?: any;
	resource: string;
	operation: QueryOperation;
	recordId?: string;
	dataBefore?: any;
	dataAfter?: any;
	ipAddress?: string;
	userAgent?: string;
	metadata?: Record<string, any>;
}

export interface SecurityContext {
	user?: any;
	impersonator?: any;
	scopes?: string[];
	ipAddress?: string;
	userAgent?: string;
	session?: any;
	rateLimit?: {
		windowMs: number;
		max: number;
	};
}

export interface PaginationResult<T> {
	items: T[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasNext: boolean;
		hasPrev: boolean;
	};
}

export type QueryEndpoint = Endpoint<any>;
export type CrudEndpoint = QueryEndpoint;
export * from "./auth";

import { QueryContext } from "./index";

/**
 * Interface for Authentication Providers
 * This allows abstracting different auth systems (Better Auth, JWT, Clerk, etc.)
 */
export interface AuthProvider {
	/** Unique identifier for the provider */
	id: string;
	/** Function to resolve the session from the request */
	getSession: (context: { request: Request }) => Promise<any> | any;
	/** Optional initialization logic */
	init?: (context: QueryContext) => Promise<void> | void;
	/** Optional cleanup logic */
	destroy?: () => Promise<void> | void;
}

/**
 * Authentication and session configuration for Better Query
 */
export interface AuthOptions {
	/** The auth provider to use */
	provider?: AuthProvider;
	/** Whether authentication is mandatory by default for all resources */
	requireAuth?: boolean;
	/** Custom session resolver (shortcut for simple cases) */
	getSession?: (context: { request: Request }) => Promise<any> | any;
}

/**
 * Resource context for Better Admin
 * Manages registered resources and provides access to them throughout the app
 */

import { createContext, useContext } from "react";
import type { ResourceConfig } from "./types.js";

/**
 * Context value for managing resources
 */
export interface ResourceContextValue {
	/** All registered resources */
	resources: ResourceConfig[];
	/** Register a new resource */
	registerResource: (resource: ResourceConfig) => void;
	/** Get a resource by name */
	getResource: (name: string) => ResourceConfig | undefined;
	/** Data provider (better-query instance) */
	dataProvider?: any;
	/** Auth provider (better-auth instance) */
	authProvider?: any;
	/** Base path for admin routes */
	basePath: string;
}

/**
 * Context for managing resources in the admin
 */
export const ResourceContext = createContext<ResourceContextValue | null>(null);

/**
 * Hook to access the resource context
 * @throws Error if used outside of Admin component
 */
export function useResourceContext(): ResourceContextValue {
	const context = useContext(ResourceContext);
	if (!context) {
		throw new Error(
			"useResourceContext must be used within an Admin component",
		);
	}
	return context;
}

/**
 * Hook to get a specific resource by name
 * @param name - Resource name
 * @returns The resource config or undefined
 */
export function useResource(name: string): ResourceConfig | undefined {
	const { getResource } = useResourceContext();
	return getResource(name);
}

/**
 * Hook to get all registered resources
 * @returns Array of all resources
 */
export function useResources(): ResourceConfig[] {
	const { resources } = useResourceContext();
	return resources;
}

/**
 * Hook to get the data provider
 * @returns The data provider instance
 */
export function useDataProvider(): any {
	const { dataProvider } = useResourceContext();
	return dataProvider;
}

/**
 * Hook to get the auth provider
 * @returns The auth provider instance
 */
export function useAuthProvider(): any {
	const { authProvider } = useResourceContext();
	return authProvider;
}

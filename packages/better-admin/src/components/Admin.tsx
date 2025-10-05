/**
 * Admin component - Root wrapper for Better Admin
 * Provides context and manages resources declaratively
 */

import React from "react";
import type { ReactElement } from "react";
import { useCallback, useMemo, useState } from "react";
import { ResourceContext } from "./resource-context.js";
import type { AdminProps, ResourceConfig, ResourceProps } from "./types.js";

/**
 * Admin component - Root container for declarative resource management
 *
 * @example
 * ```tsx
 * import { Admin, Resource } from 'better-admin';
 *
 * export default function App() {
 *   return (
 *     <Admin dataProvider={queryClient} authProvider={authProvider}>
 *       <Resource name="users" />
 *       <Resource name="posts" />
 *     </Admin>
 *   );
 * }
 * ```
 */
export function Admin({
	authProvider,
	dataProvider,
	children,
	basePath = "/admin",
}: AdminProps) {
	const [resources, setResources] = useState<ResourceConfig[]>([]);

	// Register a new resource
	const registerResource = useCallback((resource: ResourceConfig) => {
		setResources((prev: ResourceConfig[]) => {
			// Check if resource already exists
			const exists = prev.some((r: ResourceConfig) => r.name === resource.name);
			if (exists) {
				// Update existing resource
				return prev.map((r: ResourceConfig) => (r.name === resource.name ? resource : r));
			}
			// Add new resource
			return [...prev, resource];
		});
	}, []);

	// Get a resource by name
	const getResource = useCallback(
		(name: string) => {
			return resources.find((r: ResourceConfig) => r.name === name);
		},
		[resources],
	);

	// Context value
	const contextValue = useMemo(
		() => ({
			resources,
			registerResource,
			getResource,
			dataProvider,
			authProvider,
			basePath,
		}),
		[
			resources,
			registerResource,
			getResource,
			dataProvider,
			authProvider,
			basePath,
		],
	);

	return (
		<ResourceContext.Provider value={contextValue}>
			{children}
		</ResourceContext.Provider>
	);
}

/**
 * Check if a child is a Resource component
 */
function isResourceElement(child: any): child is ReactElement<ResourceProps> {
	return child?.type?.displayName === "Resource";
}

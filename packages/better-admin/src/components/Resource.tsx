/**
 * Resource component - Declarative resource registration
 * This component doesn't render anything, it just registers the resource
 */

import { useEffect } from "react";
import { useResourceContext } from "./resource-context.js";
import type { ResourceProps } from "./types.js";

/**
 * Resource component - Registers a resource with the admin
 *
 * @example
 * ```tsx
 * // Basic usage - auto-generates all CRUD pages
 * <Resource name="users" />
 *
 * // With custom components
 * <Resource
 *   name="users"
 *   list={UserList}
 *   create={UserCreate}
 *   edit={UserEdit}
 * />
 * ```
 */
export function Resource({
	name,
	list,
	create,
	edit,
	show,
	icon,
	label,
}: ResourceProps) {
	const { registerResource } = useResourceContext();

	useEffect(() => {
		registerResource({
			name,
			list,
			create,
			edit,
			show,
			icon,
			label: label || name,
		});
	}, [name, list, create, edit, show, icon, label, registerResource]);

	// This component doesn't render anything
	return null;
}

// Add display name for identification
Resource.displayName = "Resource";

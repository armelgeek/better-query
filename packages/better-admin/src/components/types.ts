/**
 * Types for Better Admin declarative resource components
 */

import type { ComponentType, ReactNode } from "react";

/**
 * Resource configuration for declarative admin setup
 */
export interface ResourceConfig {
	/** Resource name (e.g., "users", "posts") */
	name: string;
	/** Optional custom list component */
	list?: ComponentType<any>;
	/** Optional custom create component */
	create?: ComponentType<any>;
	/** Optional custom edit component */
	edit?: ComponentType<any>;
	/** Optional custom show/detail component */
	show?: ComponentType<any>;
	/** Optional icon for the resource */
	icon?: ReactNode;
	/** Optional label for the resource (defaults to name) */
	label?: string;
}

/**
 * Admin component props
 */
export interface AdminProps {
	/** Authentication provider */
	authProvider?: any;
	/** Data provider (better-query instance) */
	dataProvider?: any;
	/** Children (usually Resource components) */
	children?: ReactNode;
	/** Optional dashboard component */
	dashboard?: ComponentType<any>;
	/** Optional custom layout */
	layout?: ComponentType<any>;
	/** Optional login page */
	loginPage?: ComponentType<any>;
	/** Title for the admin interface */
	title?: string;
	/** Base path for admin routes */
	basePath?: string;
}

/**
 * Resource component props
 */
export interface ResourceProps {
	/** Resource name (e.g., "users", "posts") */
	name: string;
	/** Optional custom list component */
	list?: ComponentType<any>;
	/** Optional custom create component */
	create?: ComponentType<any>;
	/** Optional custom edit component */
	edit?: ComponentType<any>;
	/** Optional custom show/detail component */
	show?: ComponentType<any>;
	/** Optional icon for the resource */
	icon?: ReactNode;
	/** Optional label for the resource (defaults to name) */
	label?: string;
}

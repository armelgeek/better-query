/**
 * Auto-generated List page component
 * Renders a list of resources using DataTable
 */

import type { ComponentType } from "react";

export interface AutoListProps {
	/** Resource name */
	resourceName: string;
	/** Columns configuration for the table */
	columns?: any[];
	/** Custom actions for each row */
	actions?: any[];
	/** Custom DataTable component to use */
	DataTableComponent?: ComponentType<any>;
	/** Empty state message */
	emptyMessage?: string;
}

/**
 * Auto-generated List component
 * This is a placeholder that will be used when no custom list component is provided
 */
export function AutoList({
	resourceName,
	columns,
	actions,
	DataTableComponent,
	emptyMessage = "No items found",
}: AutoListProps) {
	// This is a simple implementation
	// In a real app, this would fetch data and render a table
	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-bold capitalize">{resourceName}</h1>
				<div>
					<a
						href={`/${resourceName}/create`}
						className="inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
					>
						Create {resourceName}
					</a>
				</div>
			</div>

			<div className="rounded-md border p-8 text-center">
				<p className="text-muted-foreground">
					Auto-generated list view for <strong>{resourceName}</strong>
				</p>
				<p className="text-sm text-muted-foreground mt-2">
					To customize this view, provide a custom <code>list</code> component
					to the Resource.
				</p>
			</div>
		</div>
	);
}

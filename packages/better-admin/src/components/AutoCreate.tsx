/**
 * Auto-generated Create page component
 * Renders a form for creating new resources
 */

export interface AutoCreateProps {
	/** Resource name */
	resourceName: string;
	/** Fields configuration for the form */
	fields?: any[];
	/** Callback after successful creation */
	onSuccess?: () => void;
}

/**
 * Auto-generated Create component
 * This is a placeholder that will be used when no custom create component is provided
 */
export function AutoCreate({
	resourceName,
	fields,
	onSuccess,
}: AutoCreateProps) {
	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-bold">
					Create {resourceName}
				</h1>
				<a
					href={`/${resourceName}`}
					className="inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 border"
				>
					Back to List
				</a>
			</div>

			<div className="rounded-md border p-8 text-center">
				<p className="text-muted-foreground">
					Auto-generated create view for <strong>{resourceName}</strong>
				</p>
				<p className="text-sm text-muted-foreground mt-2">
					To customize this view, provide a custom <code>create</code>{" "}
					component to the Resource.
				</p>
			</div>
		</div>
	);
}

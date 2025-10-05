/**
 * Auto-generated Edit page component
 * Renders a form for editing existing resources
 */

export interface AutoEditProps {
	/** Resource name */
	resourceName: string;
	/** Resource ID */
	id: string;
	/** Fields configuration for the form */
	fields?: any[];
	/** Callback after successful update */
	onSuccess?: () => void;
}

/**
 * Auto-generated Edit component
 * This is a placeholder that will be used when no custom edit component is provided
 */
export function AutoEdit({
	resourceName,
	id,
	fields,
	onSuccess,
}: AutoEditProps) {
	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-bold">
					Edit {resourceName} #{id}
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
					Auto-generated edit view for <strong>{resourceName}</strong>
				</p>
				<p className="text-sm text-muted-foreground mt-2">
					To customize this view, provide a custom <code>edit</code> component
					to the Resource.
				</p>
			</div>
		</div>
	);
}

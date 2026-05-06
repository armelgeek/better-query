import { QueryPermissionContext, QueryResourceConfig } from "../types";

/**
 * Validates a state transition based on resource configuration
 */
export async function validateStateTransition(
	config: QueryResourceConfig,
	oldData: any,
	newData: any,
	ctx: QueryPermissionContext
): Promise<{ valid: boolean; error?: string }> {
	if (!config.stateMachine) return { valid: true };

	const stateField = config.stateMachine.field;
	const oldState = oldData[stateField];
	const newState = newData[stateField];

	// If state hasn't changed, it's valid
	if (oldState === newState) return { valid: true };

	// Find authorized transitions
	const transition = config.stateMachine.transitions.find(t => {
		const fromMatch = Array.isArray(t.from) 
			? t.from.includes(oldState) 
			: t.from === oldState;
		return fromMatch && t.to === newState;
	});

	if (!transition) {
		return { 
			valid: false, 
			error: `Invalid state transition from "${oldState}" to "${newState}"` 
		};
	}

	// Check transition permission if defined
	if (transition.permission && !(await transition.permission(ctx))) {
		return { 
			valid: false, 
			error: `You don't have permission to perform this state transition` 
		};
	}

	return { valid: true };
}

/**
 * Applies field-level security by hiding or protecting fields
 */
export async function applyFieldSecurity(
	config: QueryResourceConfig,
	data: any,
	ctx: QueryPermissionContext,
	mode: "read" | "write"
): Promise<any> {
	if (!config.fields || !data) return data;

	const result = { ...data };
	for (const [fieldName, fieldConfig] of Object.entries(config.fields)) {
		if (mode === "read" && fieldConfig.hidden) {
			const isHidden = typeof fieldConfig.hidden === "function" 
				? await fieldConfig.hidden(ctx) 
				: fieldConfig.hidden;
			if (isHidden) delete result[fieldName];
		}

		if (mode === "write" && fieldConfig.readOnly) {
			const isReadOnly = typeof fieldConfig.readOnly === "function" 
				? await fieldConfig.readOnly(ctx) 
				: fieldConfig.readOnly;
			if (isReadOnly) delete result[fieldName];
		}
	}
	return result;
}

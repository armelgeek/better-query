import { QueryHookContext } from "../types";
import { Plugin } from "../types/plugins";

export interface HistoryPluginOptions {
	/** Name of the history table (default: model_history) */
	tableNamePattern?: (model: string) => string;
	/** Resources to track history for */
	resources?: string[];
}

/**
 * History Plugin
 * Saves a snapshot of the record before any update or delete
 */
export function historyPlugin(options: HistoryPluginOptions = {}): Plugin {
	const {
		tableNamePattern = (model: string) => `${model}_history`,
		resources = []
	} = options;

	const shouldTrack = (resource: string) => {
		return resources.length === 0 || resources.includes(resource);
	};

	const saveSnapshot = async (ctx: QueryHookContext, action: "update" | "delete") => {
		if (!shouldTrack(ctx.resource) || !ctx.existingData) return;

		const historyTable = tableNamePattern(ctx.resource);
		
		try {
			// Save to history table
			await ctx.context.adapter.create({
				model: historyTable,
				data: {
					originalId: ctx.id,
					snapshotData: JSON.stringify(ctx.existingData),
					action,
					changedBy: (ctx as any).user?.id,
					timestamp: new Date()
				}
			});
		} catch (e) {
			console.error(`[History] Failed to save snapshot for ${ctx.resource}:`, e);
		}
	};

	return {
		id: "history",
		init: () => {},
		hooks: {
			// Capture before change
			beforeUpdate: async (ctx) => saveSnapshot(ctx, "update"),
			beforeDelete: async (ctx) => saveSnapshot(ctx, "delete"),
		}
	};
}

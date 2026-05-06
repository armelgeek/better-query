import { createEndpoint } from "better-call";
import { z } from "zod";
import { Plugin } from "../types/plugins";
import { QueryHookContext } from "../types";

export interface HistoryPluginOptions {
	tableNamePattern?: (model: string) => string;
	resources?: string[];
	autoMigrate?: boolean;
}

export function historyPlugin(options: HistoryPluginOptions = {}): Plugin {
	const {
		tableNamePattern = (model: string) => `${model}_history`,
		resources = [],
	} = options;

	let adapter: any;

	const shouldTrack = (resource: string) => {
		return resources.length === 0 || resources.includes(resource);
	};

	const saveSnapshot = async (ctx: QueryHookContext, action: "create" | "update" | "delete") => {
		if (!shouldTrack(ctx.resource)) return;

		const historyTable = tableNamePattern(ctx.resource);
		
		const dataToSnapshot = action === "create" ? ctx.data : ctx.existingData;
		if (!dataToSnapshot) return;

		try {
			await adapter.create({
				model: historyTable,
				data: {
					originalId: ctx.id || (dataToSnapshot as any).id,
					snapshotData: JSON.stringify(dataToSnapshot),
					action,
					changedBy: (ctx as any).user?.id || "system",
					timestamp: new Date(),
					version: action === "create" ? 1 : undefined
				}
			});
		} catch (e) {
			console.error(`[History] Failed to save snapshot for ${ctx.resource}:`, e);
		}
	};

	return {
		id: "history",
		
		init: (ctx) => {
			adapter = ctx.adapter;
		},

		endpoints: {
			getHistory: createEndpoint("/:resource/:id/history", {
				method: "GET",
				params: z.object({
					resource: z.string(),
					id: z.string()
				}),
			}, async (ctx) => {
				const { resource, id } = ctx.params;
				const historyTable = tableNamePattern(resource);
				
				const history = await adapter.findMany({
					model: historyTable,
					where: [{ field: "originalId", value: id, operator: "eq" }],
					orderBy: [{ field: "timestamp", direction: "desc" }]
				});

				return history.map((item: any) => ({
					...item,
					snapshotData: JSON.parse(item.snapshotData)
				}));
			}),

			restoreVersion: createEndpoint("/:resource/:id/restore", {
				method: "POST",
				params: z.object({
					resource: z.string(),
					id: z.string()
				}),
				body: z.object({
					historyId: z.string()
				}),
			}, async (ctx) => {
				const { resource, id } = ctx.params;
				const { historyId } = ctx.body;
				const historyTable = tableNamePattern(resource);

				const version = await adapter.findFirst({
					model: historyTable,
					where: [{ field: "id", value: historyId, operator: "eq" }]
				});

				if (!version) {
					throw new Error("Version not found");
				}

				const snapshot = JSON.parse(version.snapshotData);
				
				return await adapter.update({
					model: resource,
					where: [{ field: "id", value: id, operator: "eq" }],
					data: snapshot
				});
			})
		},

		hooks: {
			afterCreate: async (ctx) => saveSnapshot(ctx, "create"),
			beforeUpdate: async (ctx) => saveSnapshot(ctx, "update"),
			beforeDelete: async (ctx) => saveSnapshot(ctx, "delete"),
		}
	};
}

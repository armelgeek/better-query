import { QueryHookContext } from "../types";
import { Plugin } from "../types/plugins";

export interface WebhookConfig {
	url: string;
	events: Array<"create" | "update" | "delete">;
	secret?: string; // For signature
}

export interface WebhookPluginOptions {
	/** Global webhooks */
	webhooks: WebhookConfig[];
	/** Resource-specific webhooks mapping */
	resourceWebhooks?: Record<string, WebhookConfig[]>;
}

/**
 * Webhook Plugin
 * Sends HTTP POST requests when data changes
 */
export function webhookPlugin(options: WebhookPluginOptions): Plugin {
	const { webhooks, resourceWebhooks = {} } = options;

	const triggerWebhooks = async (ctx: QueryHookContext, event: "create" | "update" | "delete") => {
		const targetWebhooks = [
			...webhooks,
			...(resourceWebhooks[ctx.resource] || [])
		].filter(w => w.events.includes(event));

		for (const webhook of targetWebhooks) {
			try {
				// We use a fire-and-forget approach or background task
				fetch(webhook.url, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Better-Query-Event": event,
						"X-Better-Query-Resource": ctx.resource,
						// Add signature if secret provided
					},
					body: JSON.stringify({
						event,
						resource: ctx.resource,
						data: ctx.result || ctx.data,
						timestamp: new Date().toISOString()
					})
				}).catch(err => console.error(`[Webhook] Failed to send to ${webhook.url}:`, err));
			} catch (e) {
				console.error(`[Webhook] Error triggering webhook:`, e);
			}
		}
	};

	return {
		id: "webhooks",
		init: () => {},
		hooks: {
			afterCreate: async (ctx) => triggerWebhooks(ctx, "create"),
			afterUpdate: async (ctx) => triggerWebhooks(ctx, "update"),
			afterDelete: async (ctx) => triggerWebhooks(ctx, "delete"),
		}
	};
}

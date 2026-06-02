import { QueryHookContext } from "../types";
import { Plugin } from "../types/plugins";

export interface WebhookOptions {
	url: string;
	events: Array<"create" | "update" | "delete">;
	headers?: Record<string, string>;
	secret?: string;
}

/**
 * Webhook plugin for BetterQuery
 * Sends outgoing HTTP requests when data changes
 */
export const webhooks = (options: WebhookOptions[]): Plugin => {
	return {
		id: "webhooks",
		hooks: {
			afterCreate: async (context: QueryHookContext) => {
				await triggerWebhooks("create", context, options);
			},
			afterUpdate: async (context: QueryHookContext) => {
				await triggerWebhooks("update", context, options);
			},
			afterDelete: async (context: QueryHookContext) => {
				await triggerWebhooks("delete", context, options);
			},
		},
	};
};

async function triggerWebhooks(
	event: "create" | "update" | "delete",
	context: QueryHookContext,
	options: WebhookOptions[],
) {
	const relevantWebhooks = options.filter((o) => o.events.includes(event));

	for (const webhook of relevantWebhooks) {
		try {
			const payload = {
				event,
				resource: context.resource,
				timestamp: new Date().toISOString(),
				data: context.result,
				user: context.user
					? {
							id: context.user.id,
							email: context.user.email,
						}
					: null,
			};

			await fetch(webhook.url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(webhook.secret && { "X-Webhook-Secret": webhook.secret }),
					...webhook.headers,
				},
				body: JSON.stringify(payload),
			});
		} catch (error) {
			console.error(
				`[Webhook] Failed to trigger webhook for ${webhook.url}:`,
				error,
			);
		}
	}
}

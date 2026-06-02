import { CrudHookContext, Plugin } from "../types";

export interface BetterAuthRLSOptions {
	/** Field name used for ownership (default: "userId") */
	ownershipField?: string;
	/** Whether to bypass RLS for admins (requires "admin" role in Better Auth) */
	adminBypass?: boolean;
	/** Custom role field name (default: "role") */
	roleField?: string;
}

/**
 * Better Auth RLS Plugin
 * Automatically filters queries based on the authenticated user ID.
 * If a resource has the ownership field, queries will be restricted to the user's own data.
 */
export const betterAuthRLS = (options: BetterAuthRLSOptions = {}): Plugin => {
	const ownershipField = options.ownershipField || "userId";
	const adminBypass = options.adminBypass ?? true;
	const roleField = options.roleField || "role";

	return {
		id: "better-auth-rls",
		hooks: {
			beforeList: async (ctx: CrudHookContext) => {
				const user = ctx.user;
				if (!user) return;

				// Bypass for admins if enabled
				if (adminBypass && user[roleField] === "admin") return;

				// Check if the resource has the ownership field
				const resourceSchema = ctx.context.schemas.get(ctx.resource);
				if (resourceSchema?.fields[ownershipField]) {
					ctx.params = ctx.params || {};
					ctx.params.where = {
						...ctx.params.where,
						[ownershipField]: user.id,
					};
				}
			},
			beforeRead: async (ctx: CrudHookContext) => {
				const user = ctx.user;
				if (!user) return;

				if (adminBypass && user[roleField] === "admin") return;

				const resourceSchema = ctx.context.schemas.get(ctx.resource);
				if (resourceSchema?.fields[ownershipField]) {
					ctx.params = ctx.params || {};
					ctx.params.where = {
						...ctx.params.where,
						[ownershipField]: user.id,
					};
				}
			},
			beforeUpdate: async (ctx: CrudHookContext) => {
				const user = ctx.user;
				if (!user) return;

				if (adminBypass && user[roleField] === "admin") return;

				const resourceSchema = ctx.context.schemas.get(ctx.resource);
				if (resourceSchema?.fields[ownershipField]) {
					ctx.params = ctx.params || {};
					ctx.params.where = {
						...ctx.params.where,
						[ownershipField]: user.id,
					};
				}
			},
			beforeDelete: async (ctx: CrudHookContext) => {
				const user = ctx.user;
				if (!user) return;

				if (adminBypass && user[roleField] === "admin") return;

				const resourceSchema = ctx.context.schemas.get(ctx.resource);
				if (resourceSchema?.fields[ownershipField]) {
					ctx.params = ctx.params || {};
					ctx.params.where = {
						...ctx.params.where,
						[ownershipField]: user.id,
					};
				}
			},
			beforeCreate: async (ctx: CrudHookContext) => {
				const user = ctx.user;
				if (!user) return;

				// For creation, we automatically assign the owner
				const resourceSchema = ctx.context.schemas.get(ctx.resource);
				if (resourceSchema?.fields[ownershipField]) {
					ctx.data = ctx.data || {};
					ctx.data[ownershipField] = user.id;
				}
			},
		},
	};
};

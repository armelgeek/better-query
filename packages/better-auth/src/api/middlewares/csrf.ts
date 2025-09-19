import { APIError } from "better-call";
import { z } from "zod";
import { hs256 } from "../../crypto";
import { createAuthMiddleware } from "../call";

export const csrfMiddleware = createAuthMiddleware(
	{
		body: z
			.object({
				csrfToken: z.string().optional(),
			})
			.optional(),
	},
	async (ctx) => {
		if (
			ctx.request?.method !== "POST" ||
			ctx.context.options.advanced?.disableCSRFCheck
		)
			return;
		const csrfToken = ctx.body?.csrfToken;
		const csrfCookie = await ctx.getSignedCookie(
			ctx.context.authCookies.csrfToken.name,
			ctx.context.options.secret,
		);
		const [token, hash] = csrfCookie?.split("!") || [null, null];
		if (
			!csrfToken ||
			!csrfCookie ||
			!token ||
			!hash ||
			csrfCookie !== csrfToken
		) {
			ctx.setCookie(ctx.context.authCookies.csrfToken.name, "", {
				maxAge: 0,
			});
			throw new APIError("UNAUTHORIZED", {
				message: "Invalid CSRF Token",
			});
		}
		const expectedHash = await hs256(ctx.context.options.secret, token);
		if (hash !== expectedHash) {
			ctx.setCookie(ctx.context.authCookies.csrfToken.name, "", {
				maxAge: 0,
			});
			throw new APIError("UNAUTHORIZED", {
				message: "Invalid CSRF Token",
			});
		}
	},
);

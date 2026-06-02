import { Endpoint, EndpointOptions, createEndpoint } from "better-call";

/**
 * Simple wrapper around better-call endpoint creation for CRUD plugins
 * This follows the same pattern as better-auth's createAuthEndpoint
 */
export function createCrudEndpoint(
	path: string,
	options: EndpointOptions,
	handler: (ctx: any) => Promise<Response> | Response,
): Endpoint {
	return createEndpoint(path, options, async (ctx) => {
		return await handler(ctx);
	});
}

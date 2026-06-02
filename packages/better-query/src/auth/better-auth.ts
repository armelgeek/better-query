import { AuthProvider } from "../types/auth";

/**
 * Built-in Better Auth Provider factory
 * This abstracts the interaction with a Better Auth instance
 */
export function betterAuthProvider(betterAuthInstance: any): AuthProvider {
	return {
		id: "better-auth",
		getSession: async ({ request }) => {
			if (!betterAuthInstance?.api?.getSession) {
				throw new Error("Invalid Better Auth instance provided to provider");
			}

			// Better Auth's getSession expects headers or the request object
			const session = await betterAuthInstance.api.getSession({
				headers: request.headers,
			});

			if (!session) {
				return null;
			}

			return {
				user: session.user,
				session: session.session,
				impersonator: session.session?.impersonatedBy
					? { id: session.session.impersonatedBy }
					: null,
			};
		},
	};
}

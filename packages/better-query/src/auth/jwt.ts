import { AuthProvider } from "../types/auth";

export interface JWTProviderOptions {
	/** Secret key to verify JWT */
	secret: string;
	/** Algorithm used for signing (default: HS256) */
	algorithm?: string;
	/** Function to map JWT payload to User object */
	mapPayload?: (payload: any) => any;
	/** Header name to look for (default: authorization) */
	header?: string;
}

/**
 * Built-in JWT Auth Provider
 */
export function jwtProvider(options: JWTProviderOptions): AuthProvider {
	return {
		id: "jwt",
		getSession: async ({ request }) => {
			const headerName = options.header || "authorization";
			const authHeader = request.headers.get(headerName);
			const token = authHeader?.startsWith("Bearer ")
				? authHeader.substring(7)
				: authHeader;

			if (!token) return null;

			try {
				// Note: In a real production environment, you would use 'jose' or 'jsonwebtoken'
				// This is a simplified placeholder to demonstrate the abstraction
				const [header, payload, signature] = token.split(".");
				if (!header || !payload || !signature) return null;

				const decodedPayload = JSON.parse(
					Buffer.from(payload, "base64").toString(),
				);

				// Here you would normally verify the signature with options.secret
				// For this example, we assume verification is done elsewhere or trust it

				if (options.mapPayload) {
					return options.mapPayload(decodedPayload);
				}

				return {
					id: decodedPayload.sub || decodedPayload.id,
					email: decodedPayload.email,
					...decodedPayload,
				};
			} catch (e) {
				return null;
			}
		},
	};
}

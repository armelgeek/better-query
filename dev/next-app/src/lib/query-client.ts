import { betterQuery } from "../../../../packages/better-query/src/query";
import { createResource } from "../../../../packages/better-query/src";
import { createQueryClient } from "../../../../packages/better-query/src/client";
import { 
	productSchema,
} from "./schemas";

export const query = betterQuery({
	basePath: "/api/query",
	database: {
		provider: "sqlite",
		url: "data.db",
		autoMigrate: true,
	},
	resources: [
		// Product resource - demonstrates full CRUD with complex permissions
		createResource({
			name: "product",
			schema: productSchema,
			// Demonstrate hooks for business logic
			/**hooks: {
				beforeCreate: async (context) => {
					// Generate slug from name if not provided
					if (!context.data.seo?.slug && context.data.name) {
						const slug = context.data.name
							.toLowerCase()
							.replace(/[^a-z0-9]+/g, '-')
							.replace(/(^-|-$)/g, '');
						context.data.seo = { ...context.data.seo, slug };
					}
					
					// Set default status if not provided
					if (!context.data.status) {
						context.data.status = "draft";
					}
				},
				beforeUpdate: async (context) => {
					// Always update the updatedAt field
					context.data.updatedAt = new Date();
					
					// Update slug if name changed
					if (context.data.name && context.existingData?.name !== context.data.name) {
						const slug = context.data.name
							.toLowerCase()
							.replace(/[^a-z0-9]+/g, '-')
							.replace(/(^-|-$)/g, '');
						context.data.seo = { ...context.data.seo, slug };
					}
				},
				afterCreate: async (context) => {
					console.log(`Product created: ${context.result.name} (ID: ${context.result.id})`);
				},
			},**/
			endpoints: {
				create: true,
				read: true,
				update: true,
				delete: true,
				list: true,
			},
		}),
	],
	
	hooks: {
		beforeCreate: async (context) => {
			console.log(`Creating ${context.resource}:`, context.data);
		},
		afterCreate: async (context) => {
			console.log(`Created ${context.resource} with ID:`, context.result.id);
		},
		beforeUpdate: async (context) => {
			console.log(`Updating ${context.resource}:`, context.data);
		},
		afterUpdate: async (context) => {
			console.log(`Updated ${context.resource}:`, context.result.id);
		},
		beforeDelete: async (context) => {
			console.log(`Deleting ${context.resource}:`, context.id);
		},
		afterDelete: async (context) => {
			console.log(`Deleted ${context.resource} with ID:`, context.id);
		},
	},
	cors: {
		origin: ["http://localhost:3000"],
		credentials: true,
	},
});

export const queryClient = createQueryClient<typeof query>({
	baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/query",
});

export type Query = typeof query;
export type QueryClient = typeof queryClient;

export const crud = query;
export const crudClient = queryClient;
export type Crud = typeof query;

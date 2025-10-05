/**
 * Example: Declarative Resource Management with Better Admin
 *
 * This example shows how to use the new declarative API to set up
 * an admin interface with automatic CRUD pages for resources.
 */

// ============================================================================
// 1. Setup Better Auth and Better Query (same as before)
// ============================================================================
import { betterAuth } from "better-auth";
import { betterQuery, createResource } from "better-query";
import { z } from "zod";

export const auth = betterAuth({
	database: {
		provider: "sqlite",
		url: "app.db",
	},
	emailAndPassword: {
		enabled: true,
	},
});

// Define User resource
const userSchema = z.object({
	id: z.string().optional(),
	name: z.string().min(1),
	email: z.string().email(),
	role: z.enum(["user", "admin"]).default("user"),
	createdAt: z.date().optional(),
	updatedAt: z.date().optional(),
});

const userResource = createResource({
	name: "user",
	schema: userSchema,
	permissions: {
		create: async (context) => {
			const user = context.user as any;
			return user?.role === "admin";
		},
		read: async (context) => !!context.user,
		update: async (context) => {
			const user = context.user as any;
			return user?.role === "admin" || context.existingData?.id === user?.id;
		},
		delete: async (context) => {
			const user = context.user as any;
			return user?.role === "admin";
		},
	},
});

// Define Post resource
const postSchema = z.object({
	id: z.string().optional(),
	title: z.string().min(1),
	content: z.string(),
	authorId: z.string(),
	published: z.boolean().default(false),
	createdAt: z.date().optional(),
	updatedAt: z.date().optional(),
});

const postResource = createResource({
	name: "post",
	schema: postSchema,
	permissions: {
		create: async (context) => !!context.user,
		read: async (context) => true,
		update: async (context) => {
			const user = context.user as any;
			return context.existingData?.authorId === user?.id;
		},
		delete: async (context) => {
			const user = context.user as any;
			return context.existingData?.authorId === user?.id;
		},
	},
});

export const query = betterQuery({
	database: {
		provider: "sqlite",
		url: "app.db",
	},
	resources: [userResource, postResource],
});

// ============================================================================
// 2. Create Auth Client
// ============================================================================
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

// ============================================================================
// 3. Setup Admin with Declarative Resources (NEW APPROACH!)
// ============================================================================
import { Admin, Resource } from "better-admin";
import {
	createAuthProvider,
	createQueryProvider,
} from "better-admin";

const authProvider = createAuthProvider({
	authClient,
});

const dataProvider = createQueryProvider({
	queryClient: query,
});

/**
 * Main Admin App - Declarative Setup
 *
 * This is the NEW way! Just declare your resources and you're done.
 * No need to manually create List, Create, Edit pages for each resource.
 */
export default function App() {
	return (
		<Admin
			authProvider={authProvider}
			dataProvider={dataProvider}
			title="My Admin"
		>
			{/* 
				Just declare resources and get automatic CRUD pages!
				Each Resource automatically generates:
				- /{name} - List page
				- /{name}/create - Create page
				- /{name}/:id/edit - Edit page
			*/}
			<Resource name="user" label="Users" />
			<Resource name="post" label="Posts" />
		</Admin>
	);
}

// ============================================================================
// 4. With Custom Components (if needed)
// ============================================================================

import { CrudForm } from "@/components/ui/crud-form";
// You can still provide custom components for specific operations
import { DataTable } from "@/components/ui/data-table";
import { useQuery } from "better-admin";

function CustomUserList() {
	const { list } = useQuery("user", query);
	const { data, isLoading } = list.useQuery();

	const columns = [
		{ accessorKey: "name", header: "Name" },
		{ accessorKey: "email", header: "Email" },
		{ accessorKey: "role", header: "Role" },
	];

	if (isLoading) return <div>Loading...</div>;

	return <DataTable columns={columns} data={data || []} />;
}

export function AppWithCustomComponents() {
	return (
		<Admin
			authProvider={authProvider}
			dataProvider={dataProvider}
			title="My Admin"
		>
			{/* Use auto-generated pages for most resources */}
			<Resource name="post" label="Posts" />

			{/* But provide custom components when needed */}
			<Resource
				name="user"
				label="Users"
				list={CustomUserList}
				// create and edit still auto-generated
			/>
		</Admin>
	);
}

// ============================================================================
// Comparison: OLD vs NEW Approach
// ============================================================================

/*
OLD APPROACH (Manual):
----------------------
You had to create separate pages for each operation:

📁 app/admin/users/
  ├── page.tsx (List)
  ├── create/
  │   └── page.tsx (Create)
  └── [id]/
      └── edit/
          └── page.tsx (Edit)

📁 app/admin/posts/
  ├── page.tsx (List)
  ├── create/
  │   └── page.tsx (Create)
  └── [id]/
      └── edit/
          └── page.tsx (Edit)

NEW APPROACH (Declarative):
---------------------------
Just declare resources in one place:

<Admin>
  <Resource name="users" />
  <Resource name="posts" />
</Admin>

That's it! All pages auto-generated. ✨
*/

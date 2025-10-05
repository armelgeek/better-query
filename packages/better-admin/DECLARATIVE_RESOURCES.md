# Declarative Resource Management

Better Admin now supports declarative resource management, similar to React Admin's approach. This allows you to quickly set up admin interfaces by just declaring resources.

## Quick Start

### Basic Usage

```tsx
import { Admin, Resource } from 'better-admin';
import { createBetterAuthProvider, createBetterQueryProvider } from 'better-admin';

// Setup your providers
const authProvider = createBetterAuthProvider({ authClient });
const dataProvider = createBetterQueryProvider({ queryClient: query });

export default function App() {
  return (
    <Admin
      authProvider={authProvider}
      dataProvider={dataProvider}
      title="My Admin"
    >
      <Resource name="users" label="Users" />
      <Resource name="posts" label="Posts" />
      <Resource name="comments" label="Comments" />
    </Admin>
  );
}
```

That's it! Each `Resource` automatically generates:
- `/{name}` - List page
- `/{name}/create` - Create page  
- `/{name}/:id/edit` - Edit page

## Custom Components

You can provide custom components for any operation:

```tsx
import { UserList } from './components/UserList';
import { UserCreate } from './components/UserCreate';
import { UserEdit } from './components/UserEdit';

<Admin authProvider={authProvider} dataProvider={dataProvider}>
  {/* Fully customized resource */}
  <Resource 
    name="users" 
    label="Users"
    list={UserList}
    create={UserCreate}
    edit={UserEdit}
  />
  
  {/* Auto-generated resource */}
  <Resource name="posts" label="Posts" />
  
  {/* Partially customized resource */}
  <Resource 
    name="comments" 
    label="Comments"
    list={CommentList}
    // create and edit are auto-generated
  />
</Admin>
```

## Available Hooks

Access resources and providers anywhere in your app:

```tsx
import {
  useResources,
  useResource,
  useDataProvider,
  useAuthProvider,
  useResourceContext
} from 'better-admin';

function MyComponent() {
  // Get all resources
  const resources = useResources();
  
  // Get a specific resource
  const userResource = useResource('users');
  
  // Get the data provider (better-query instance)
  const dataProvider = useDataProvider();
  
  // Get the auth provider
  const authProvider = useAuthProvider();
  
  // Get the entire context
  const { resources, basePath, registerResource } = useResourceContext();
}
```

## Admin Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `authProvider` | `any` | No | Authentication provider from `createBetterAuthProvider` |
| `dataProvider` | `any` | No | Data provider from `createBetterQueryProvider` |
| `children` | `ReactNode` | No | Resource components and other content |
| `dashboard` | `ComponentType` | No | Custom dashboard component |
| `layout` | `ComponentType` | No | Custom layout component |
| `loginPage` | `ComponentType` | No | Custom login page component |
| `title` | `string` | No | Title for the admin interface (default: "Admin") |
| `basePath` | `string` | No | Base path for admin routes (default: "/admin") |

## Resource Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | Yes | Resource name (e.g., "users", "posts") |
| `label` | `string` | No | Display label (defaults to name) |
| `list` | `ComponentType` | No | Custom list component |
| `create` | `ComponentType` | No | Custom create component |
| `edit` | `ComponentType` | No | Custom edit component |
| `show` | `ComponentType` | No | Custom show/detail component |
| `icon` | `ReactNode` | No | Icon for the resource |

## Comparison: Old vs New Approach

### Old Approach (Manual)

You had to create separate pages for each operation:

```
📁 app/admin/users/
  ├── page.tsx              # List page
  ├── create/
  │   └── page.tsx         # Create page
  └── [id]/
      └── edit/
          └── page.tsx     # Edit page

📁 app/admin/posts/
  ├── page.tsx              # List page
  ├── create/
  │   └── page.tsx         # Create page
  └── [id]/
      └── edit/
          └── page.tsx     # Edit page
```

Each file had to:
1. Import and set up the data hooks
2. Handle loading states
3. Define columns/fields
4. Handle errors
5. Navigate between pages

### New Approach (Declarative)

Just declare resources in one place:

```tsx
<Admin authProvider={authProvider} dataProvider={dataProvider}>
  <Resource name="users" />
  <Resource name="posts" />
</Admin>
```

That's it! All pages auto-generated. ✨

## Integration with Better Query

The declarative approach works seamlessly with your Better Query resources:

```tsx
// Define your resource in Better Query
const userResource = createResource({
  name: "user",
  schema: userSchema,
  permissions: {
    create: async (context) => context.user?.role === "admin",
    read: async (context) => !!context.user,
    // ...
  },
});

export const query = betterQuery({
  resources: [userResource],
});

// Then use it in Better Admin
<Admin dataProvider={query}>
  <Resource name="user" />
</Admin>
```

The Resource component automatically uses the schema and permissions from your Better Query resource.

## Examples

See the complete examples:
- `packages/better-admin/examples/declarative-resources-example.tsx` - Full example with Better Auth and Better Query integration

## Next Steps

1. Add icons to your resources
2. Customize the layout
3. Add a dashboard
4. Implement custom components for specific operations
5. Add resource-specific permissions and validation

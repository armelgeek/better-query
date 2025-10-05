# Better Admin - Quick Reference

## Installation

```bash
npm install better-auth better-query better-admin
npx better-admin init
```

## Setup

### 1. Auth Provider

```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
});

// lib/admin-auth.ts
import { createAuthProvider } from "better-admin";
export const authProvider = createAuthProvider({ authClient });
```

### 2. Data Provider

```typescript
// lib/query.ts
import { betterQuery, createResource } from "better-query";
export const query = betterQuery({
  database: db,
  resources: [userResource, postResource],
});

// lib/admin-data.ts
import { createQueryProvider } from "better-admin";
export const dataProvider = createQueryProvider({ 
  queryClient: query 
});
```

## Usage

### Authentication

```typescript
import { useBetterAuth } from "better-admin";

const { user, isLoading, signOut } = useBetterAuth(authClient);
```

### Data Operations

```typescript
import { useQuery } from "better-admin";

// List
const { list } = useQuery("user", query);
const { data } = list.useQuery();

// Create
const { create } = useQuery("user", query);
await create.mutateAsync({ name: "John", email: "john@example.com" });

// Update
const { update } = useQuery("user", query);
await update.mutateAsync({ where: { id }, data: { name: "Jane" } });

// Delete
const { remove } = useQuery("user", query);
await remove.mutateAsync({ where: { id } });
```

## Components

```bash
# Install components
npx better-admin add data-table
npx better-admin add crud-form
npx better-admin add resource-list

# List components
npx better-admin list
npx better-admin list --category data-display
```

## Common Patterns

### List Page

```tsx
const { list } = useQuery("user", query);
const { data, isLoading } = list.useQuery();

return <DataTable columns={columns} data={data || []} />;
```

### Create Page

```tsx
const { create } = useQuery("user", query);

<CrudForm 
  fields={fields}
  onSubmit={create.mutateAsync}
/>
```

### Edit Page

```tsx
const { get, update } = useQuery("user", query);
const { data } = get.useQuery({ where: { id } });

<CrudForm 
  fields={fields}
  defaultValues={data}
  onSubmit={(data) => update.mutateAsync({ where: { id }, data })}
/>
```

## Documentation

- [Quick Start](/docs/better-admin/quick-start)
- [Auth Provider](/docs/better-admin/auth-provider)
- [Data Provider](/docs/better-admin/data-provider)
- [Components](/docs/better-admin/components)
- [API Reference](/docs/better-admin/api-reference)
- [Migration Guide](/docs/better-admin/migration)

## Examples

See [examples/](./examples/) for complete working examples:
- `auth-provider-example.tsx` - Authentication setup
- `data-provider-example.tsx` - Data operations
- `complete-setup-example.tsx` - Full admin application

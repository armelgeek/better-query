# Declarative Resources Demo

This directory would contain a working demo of the declarative resources feature.

## Setup

1. Create a Next.js app with App Router
2. Install better-auth, better-query, and better-admin
3. Set up your database and resources
4. Use the declarative Admin and Resource components

## File Structure

```
demo-app/
├── lib/
│   ├── auth.ts              # Better Auth setup
│   ├── auth-client.ts       # Better Auth client
│   ├── query.ts             # Better Query setup with resources
│   └── admin-providers.ts   # Auth and Data providers
├── app/
│   ├── admin/
│   │   └── layout.tsx       # Admin layout with <Admin> component
│   └── api/
│       └── auth/[...all]/route.ts
└── components/
    └── admin/
        └── ... (auto-generated components)
```

## Usage

```tsx
// app/admin/layout.tsx
import { Admin, Resource } from 'better-admin';
import { authProvider, dataProvider } from '@/lib/admin-providers';

export default function AdminLayout({ children }) {
  return (
    <Admin authProvider={authProvider} dataProvider={dataProvider}>
      <Resource name="user" label="Users" />
      <Resource name="post" label="Posts" />
      <Resource name="comment" label="Comments" />
      {children}
    </Admin>
  );
}
```

## What Gets Generated

When you declare `<Resource name="user" />`, you automatically get:

### List Page: `/admin/user`
- Data table with all users
- Search and filtering
- Pagination
- Sort columns
- Bulk actions
- "Create User" button

### Create Page: `/admin/user/create`
- Form with all fields from the schema
- Validation based on Zod schema
- Success/error handling
- Back to list button

### Edit Page: `/admin/user/:id/edit`
- Form pre-filled with existing data
- Same validation as create
- Update button
- Cancel/back button

## Customization

You can override any auto-generated page:

```tsx
<Resource 
  name="user" 
  label="Users"
  list={CustomUserList}        // Custom list page
  create={CustomUserCreate}    // Custom create page
  edit={CustomUserEdit}        // Custom edit page
/>
```

Or keep some auto-generated:

```tsx
<Resource 
  name="user" 
  label="Users"
  list={CustomUserList}
  // create and edit are auto-generated
/>
```

## Benefits

✅ **10x faster** - No need to create pages manually
✅ **Consistent** - All resources follow the same patterns
✅ **Maintainable** - Update the Resource component, all pages update
✅ **Flexible** - Override anything you need custom
✅ **Type-safe** - Full TypeScript support throughout

## Next Steps

1. Try the demo
2. Add your own resources
3. Customize the auto-generated pages
4. Add custom actions and buttons
5. Implement role-based permissions

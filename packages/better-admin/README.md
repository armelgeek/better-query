# Better Admin

A comprehensive admin interface solution with **78 production-ready components**, built specifically for **better-auth** and **better-query** integration. No ra-core, no ra-data-simple-rest, just pure better-query goodness.

**✨ Key Features:**
- 🔐 **better-auth** for authentication (not ra-core)
- 📊 **better-query** for data operations (not ra-data-simple-rest)
- ⚡ **Declarative Resources** - Auto-generate admin pages
- 🎯 Full TypeScript type safety
- 📦 78 components across 10 categories
- 🚀 Built on shadcn/ui
- 🔧 CLI for easy installation

## Why Better Admin?

Unlike traditional admin frameworks like react-admin:
- ✅ **Direct database access** via better-query (no REST API required)
- ✅ **Full type safety** from database to UI
- ✅ **Declarative resources** - Generate CRUD pages instantly
- ✅ **Modern stack**: React Query, better-auth, better-query
- ✅ **Smaller bundle**: No Material-UI, no Redux
- ✅ **100% customizable**: Components copied to your project

## Architecture

```
better-admin/
├── Auth Provider → better-auth integration
├── Data Provider → better-query integration  
└── 78 Components
    ├── Data Display (11)
    ├── Forms (18)
    ├── Layout (10)
    ├── Buttons (13)
    ├── Fields (9)
    ├── Feedback (5)
    ├── Views (3)
    ├── Auth (2)
    ├── UI (4)
    └── Toolbars (2)
```

## Installation

Initialize Better Admin in your project:

```bash
npx better-admin init
```

This creates a `better-admin.json` configuration file.

## Providers

Better Admin integrates with better-auth and better-query, **not** ra-core or react-admin:

### Auth Provider (better-auth)

```typescript
import { createBetterAuthProvider } from "better-admin";
import { authClient } from "./auth-client";

export const authProvider = createBetterAuthProvider({
  authClient,
});
```

### Data Provider (better-query)

```typescript
import { createBetterQueryProvider } from "better-admin";
import { query } from "./query";

export const dataProvider = createBetterQueryProvider({
  queryClient: query,
});
```

All components use **better-query hooks** directly, not ra-core data providers.

## Quick Start

### Declarative Resource Management (NEW! ⚡)

The fastest way to create an admin interface - just declare your resources:

```tsx
import { Admin, Resource } from 'better-admin';
import { createBetterAuthProvider, createBetterQueryProvider } from 'better-admin';

export default function App() {
  return (
    <Admin
      authProvider={createBetterAuthProvider({ authClient })}
      dataProvider={createBetterQueryProvider({ queryClient: query })}
    >
      <Resource name="users" />
      <Resource name="posts" />
      <Resource name="comments" />
    </Admin>
  );
}
```

**That's it!** Each resource automatically gets:
- 📋 List page with data table
- ➕ Create page with form
- ✏️ Edit page with form

**Want to customize?** Just provide your own components:

```tsx
<Resource name="users" list={CustomUserList} />
```

📖 **[Learn more about Declarative Resources →](./DECLARATIVE_RESOURCES.md)**

---

### Manual Component Installation

Prefer more control? Install components individually:

### 1. List Available Components

```bash
npx better-admin list
```

**Filter by category:**
```bash
npx better-admin list --category data-display
npx better-admin list --category forms
```

### 2. Install Components

```bash
# Install data table
npx better-admin add data-table

# Install CRUD form
npx better-admin add crud-form

# Install authentication
npx better-admin add login-page

# Install multiple components
npx better-admin add data-table crud-form login-page
```

### 3. Use with better-query

All components use **better-query** for data operations:

```tsx title="app/admin/users/page.tsx"
import { useBetterQuery } from "better-admin";
import { query } from "@/lib/query";
import { DataTable } from "@/components/admin/data-table";

export function UsersPage() {
  const { list } = useBetterQuery("user", query);
  const { data, isLoading } = list.useQuery();
  
  if (isLoading) return <div>Loading...</div>;
  
  const columns = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "email", header: "Email" },
  ];
  
  return <DataTable columns={columns} data={data || []} />;
}
```

### 4. CRUD Operations

```tsx title="app/admin/users/create/page.tsx"
import { useBetterQuery } from "better-admin";
import { query } from "@/lib/query";
import { CrudForm } from "@/components/admin/crud-form";

export function UserCreate() {
  const { create } = useBetterQuery("user", query);
  
  const fields = [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "email", label: "Email", type: "email", required: true },
  ];
  
  return (
    <CrudForm
      fields={fields}
      onSubmit={create.mutateAsync}
      submitLabel="Create User"
    />
  );
}
```

## Component Categories

Better Admin includes **78 production-ready components** organized into 10 categories:

### Data Display (`data-display`) - 11 components

Components for displaying data from better-query:

- **data-table**: Powerful data table with sorting, filtering, pagination, and bulk actions
- **list**: List view component with filtering, pagination, and export
- **text-field**: Display text data in a formatted way
- **number-field**: Display numeric data with formatting options
- **date-field**: Display dates with formatting and localization
- **email-field**: Display email addresses with mailto links
- **url-field**: Display URLs with clickable links
- **badge-field**: Display status badges and tags
- **file-field**: Display file information with download links
- **record-field**: Display nested record data
- **resource-list**: Display resource lists with navigation

### Forms (`forms`) - 18 components

Form components with validation and better-query mutations:

- **form**: Base form component with validation and submission
- **crud-form**: Flexible CRUD form builder with validation
- **simple-form**: Simplified form layout for common use cases
- **text-input**: Text input field with validation
- **number-input**: Number input field with formatting
- **boolean-input**: Checkbox/toggle for boolean values
- **select-input**: Dropdown select input
- **radio-button-group-input**: Radio button group for single selection
- **file-input**: File upload input with preview
- **array-input**: Input for array/list data
- **autocomplete-input**: Autocomplete search input
- **autocomplete-array-input**: Autocomplete for multiple selections
- **reference-input**: Input for selecting related records
- **reference-array-input**: Input for selecting multiple related records
- **simple-form-iterator**: Repeatable form fields for arrays
- **filter-form**: Form for filtering list data
- **search-input**: Search input with debouncing
- **field-toggle**: Toggle field visibility

### Layout (`layout`) - 10 components

Structural components for admin interfaces:

- **admin**: Main admin application wrapper
- **layout**: Base layout component with sidebar and navigation
- **app-sidebar**: Collapsible sidebar navigation
- **breadcrumb**: Breadcrumb navigation trail
- **list-pagination**: Pagination controls for lists
- **show**: Show/detail view component
- **simple-show-layout**: Simplified show layout
- **create**: Create/new record view
- **edit**: Edit record view
- **example-card**: Simple example card component

### Feedback (`feedback`) - 5 components

Loading states, errors, and notifications:

- **loading**: Loading spinner and states
- **error**: Error display component
- **notification**: Toast notifications
- **spinner**: Loading spinner
- **confirm**: Confirmation dialog

### Buttons (`buttons`) - 13 components

Action buttons for common operations:

- **create-button**: Button to navigate to create view
- **edit-button**: Button to navigate to edit view
- **show-button**: Button to navigate to show view
- **delete-button**: Button to delete records with confirmation
- **export-button**: Button to export data
- **refresh-button**: Button to refresh data
- **cancel-button**: Button to cancel forms
- **bulk-delete-button**: Button for bulk delete operations
- **bulk-export-button**: Button for bulk export
- **sort-button**: Button to sort columns
- **toggle-filter-button**: Button to toggle filter visibility
- **columns-button**: Button to toggle column visibility
- **icon-button-with-tooltip**: Icon button with tooltip
- **locales-menu-button**: Language selection menu

### Fields (`fields`) - 9 components

Field components for displaying and editing data:

- **reference-field**: Display related record data
- **reference-array-field**: Display multiple related records
- **reference-many-field**: Display many-to-many relationships
- **reference-many-count**: Count of related records
- **array-field**: Display array data
- **select-field**: Display select/enum values
- **single-field-list**: List with single field display
- **count**: Display count of records
- **input-helper-text**: Helper text for inputs

### Views (`views`) - 3 components

Auto-generated view components (guessers):

- **edit-guesser**: Auto-generate edit views
- **list-guesser**: Auto-generate list views
- **show-guesser**: Auto-generate show views

### Authentication (`auth`) - 2 components

Authentication and login components:

- **authentication**: Authentication provider
- **login-page**: Login page component

### UI Components (`ui`) - 4 components

Common UI components and utilities:

- **theme-provider**: Theme context provider
- **theme-mode-toggle**: Dark/light mode toggle
- **user-menu**: User profile menu
- **saved-queries**: Saved query filters

### Toolbars (`toolbars`) - 2 components

Toolbar and action bar components:

- **bulk-actions-toolbar**: Toolbar for bulk actions
- **ready**: Ready state indicator

## better-query Integration

All components are designed to work seamlessly with **better-query**, not ra-core:

### List View Pattern

```tsx
import { useBetterQuery } from "better-admin";
import { query } from "@/lib/query";

const { list } = useBetterQuery("resource", query);
const { data, isLoading, error } = list.useQuery();

<DataTable data={data || []} columns={columns} />
```

### Create Pattern

```tsx
import { useBetterQuery } from "better-admin";
import { query } from "@/lib/query";

const { create } = useBetterQuery("resource", query);

<CrudForm 
  fields={fields} 
  onSubmit={create.mutateAsync} 
/>
```

### Edit Pattern

```tsx
import { useBetterQuery } from "better-admin";
import { query } from "@/lib/query";

const { get, update } = useBetterQuery("resource", query);
const { data } = get.useQuery({ where: { id } });

<CrudForm 
  defaultValues={data}
  onSubmit={(formData) => update.mutateAsync({ where: { id }, data: formData })}
/>
```

## Featured Components

### data-table

A powerful data table with sorting, filtering, and pagination.

**Dependencies:**
- shadcn/ui: table, button, input, dropdown-menu, select
- npm: @tanstack/react-table

**better-query:** `list` operation

**Example:**
```tsx
import { useBetterQuery } from "better-admin";
import { query } from "@/lib/query";

const { list } = useBetterQuery("user", query);
const { data } = list.useQuery();

<DataTable 
  columns={columns} 
  data={data || []}
  searchKey="name"
/>
```

### crud-form

Flexible form builder with automatic validation.

**Dependencies:**
- shadcn/ui: form, input, button, label, select, textarea
- npm: react-hook-form, @hookform/resolvers, zod

**better-query:** `create`, `update` operations

**Example:**
```tsx
import { useBetterQuery } from "better-admin";
import { query } from "@/lib/query";

const { create } = useBetterQuery("user", query);

<CrudForm
  fields={[
    { name: "name", label: "Name", type: "text", required: true },
    { name: "email", label: "Email", type: "email", required: true },
  ]}
  onSubmit={create.mutateAsync}
/>
```

### resource-list

Card-based grid layout for displaying resources.

**Dependencies:**
- shadcn/ui: card, button, badge

**better-query:** `list` operation

**Example:**
```tsx
import { useBetterQuery } from "better-admin";
import { query } from "@/lib/query";

const { list } = useBetterQuery("project", query);
const { data } = list.useQuery();

<ResourceList
  items={data || []}
  renderTitle={(item) => item.name}
  renderDescription={(item) => item.description}
  actions={[
    { label: "View", onClick: (item) => viewItem(item) },
    { label: "Edit", onClick: (item) => editItem(item) },
  ]}
/>
```

## CLI Commands

### init

Initialize Better Admin configuration:

```bash
npx better-admin init [--yes]
```

Options:
- `--yes`: Skip prompts and use defaults

### add

Add a component to your project:

```bash
npx better-admin add <component> [options]
```

Options:
- `--yes`: Skip confirmation prompts
- `--overwrite`: Overwrite existing files
- `--path <path>`: Custom installation path

### list

List available components:

```bash
npx better-admin list [options]
```

Options:
- `--category <category>`: Filter by category
- `--with-query`: Show only Better Query integrated components

## Configuration

The `better-admin.json` file configures paths and aliases:

```json
{
  "$schema": "https://better-admin.dev/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  },
  "registry": "https://raw.githubusercontent.com/armelgeek/better-kit/master/packages/better-admin/registry"
}
```

## Examples

See the [examples](./examples) directory for complete, working examples:

- **users-list.tsx**: User management with DataTable
- **user-create.tsx**: Create user form with CrudForm
- **user-edit.tsx**: Edit user form with get + update
- **projects-list.tsx**: Projects display with ResourceList

## Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: Detailed architecture guide
- **[ADDING_COMPONENTS.md](./ADDING_COMPONENTS.md)**: Guide for adding new components
- **[USAGE.md](./USAGE.md)**: Comprehensive usage guide
- **[examples/README.md](./examples/README.md)**: Examples and patterns

## How It Works

1. **Component Registry**: Each component has JSON metadata defining dependencies
2. **Dependency Detection**: CLI reads metadata to identify shadcn/ui and npm dependencies
3. **Automatic Installation**: Missing dependencies are installed automatically
4. **File Copying**: Component files are copied with correct paths from config

## Example Workflow

```bash
# 1. Initialize Better Admin
npx better-admin init

# 2. Browse components by category
npx better-admin list --category data-display

# 3. Add a component
npx better-admin add data-table

# The CLI automatically:
# ✓ Installs shadcn/ui components (table, button, input, dropdown-menu, select)
# ✓ Installs npm packages (@tanstack/react-table)
# ✓ Copies data-table.tsx to components/ui/

# 4. Use in your app with Better Query
```

## Architecture

Better Admin uses a modular architecture with:

- **Registry System**: Structured component metadata with categories
- **Better Query Integration**: Built-in patterns and helpers
- **Template System**: Reusable component templates
- **Category Organization**: Components grouped by purpose
- **Validation**: Metadata validation and type checking

See [ARCHITECTURE.md](./ARCHITECTURE.md) for details.

## Contributing

We welcome contributions! To add a component:

1. Create your component following our patterns
2. Add component metadata JSON
3. Update registry index
4. Test locally
5. Submit pull request

See [ADDING_COMPONENTS.md](./ADDING_COMPONENTS.md) for detailed instructions.

## Documentation

- **[USAGE_GUIDE.md](./USAGE_GUIDE.md)** - Comprehensive usage guide with examples for all 76 components
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Architecture and design patterns
- **[ADDING_COMPONENTS.md](./ADDING_COMPONENTS.md)** - Guide for adding new components
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Implementation details

## Troubleshooting

### Config Not Found
```bash
npx better-admin init
```

### Component Already Exists
```bash
npx better-admin add <component> --overwrite
```

### Custom Registry
```json
{
  "registry": "https://your-domain.com/registry"
}
```

### Local Development
```json
{
  "registry": "file:///path/to/local/registry"
}
```

## Why Not react-admin?

Better Admin is specifically designed to use **better-query** and **better-auth** instead of react-admin's architecture:

| Feature | react-admin | better-admin |
|---------|-------------|--------------|
| **Auth** | ra-core | better-auth |
| **Data Layer** | ra-data-simple-rest | better-query |
| **Type Safety** | Partial | Full (DB to UI) |
| **Backend** | REST required | Direct DB access |
| **State Management** | Redux | React Query |
| **Bundle Size** | Large (~500KB) | Smaller |
| **UI Components** | Material-UI | shadcn/ui |
| **Customization** | Complex | Simple (copied files) |

### Key Advantages

1. **No REST API Required**: Direct database access via better-query
2. **Full Type Safety**: TypeScript inference from database schema to UI
3. **Modern Stack**: React Query, better-auth, shadcn/ui
4. **Smaller Bundle**: Tree-shakeable components
5. **Easy Customization**: All components copied to your project
6. **Better DX**: Simpler API, less boilerplate

## Inspiration

This project is inspired by [shadcn-admin-kit](https://marmelab.com/shadcn-admin-kit/) and follows similar patterns for admin component architecture while adding deep better-query and better-auth integration instead of using ra-core.

## License

MIT

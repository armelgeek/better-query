# Copilot Instructions for better-query

## Project Overview
- **better-query** is a modular, type-safe CRUD generator for TypeScript, inspired by Better-Auth and built atop `better-call`.
- It auto-generates RESTful endpoints for resources defined with Zod schemas, supporting SQLite, PostgreSQL, and MySQL via Kysely adapters.
- The system is highly extensible via plugins (audit, cache, validation, OpenAPI, etc.) and supports custom adapters.
- The demo Next.js app (`dev/next-app`) showcases full-stack integration, including React hooks and API routes.

## Architecture & Patterns
- **Resources**: Defined in server code with Zod schemas, permissions, and optional hooks. See `lib/crud-auth.ts` and `packages/better-query/src/query.ts`.
- **Endpoints**: Auto-generated for each resource (CRUD + list/search). Example: `GET /api/product/:id`, `POST /api/product`.
- **Adapters**: Database abstraction via Kysely (default), with support for custom adapters. See `src/adapters/`.
- **Plugins**: Extend core with features like audit logging, OpenAPI docs, validation, and caching. See `src/plugins/`.
- **Client SDK**: Type-safe client for frontend use. In Next.js, use API routes for all data access; do NOT import server code in client components.

## Developer Workflows
- **Build**: `npm run build` or `pnpm build` in package directories.
- **Test**: `npm test` or `pnpm test` (uses Vitest). Test files are in `src/` and `tests/`.
- **Database**: Configure via `database` field in resource setup. Auto-migration is supported for SQLite.
- **Next.js Integration**: API routes in `src/app/api/query/` proxy requests to better-query. Frontend uses custom hooks (`hooks/useCrud.ts`) and fetches from API endpoints.
- **Environment Variables**: Set `DATABASE_URL`, `NEXT_PUBLIC_API_URL`, etc. in `.env.local`.

## Conventions & Patterns
- **Type Safety**: All schemas and endpoints use Zod for validation and TypeScript for types.
- **Permissions**: Per-operation permission functions; see resource definitions for examples.
- **Hooks**: `beforeCreate`, `afterUpdate`, etc. for business logic and data transformation.
- **Testing**: Use Vitest for unit/integration tests. Test adapters and plugins in isolation.
- **File Structure**:
  - `packages/better-query/`: Core library
  - `dev/next-app/`: Demo Next.js app
  - `src/adapters/`: Database adapters
  - `src/plugins/`: Plugins
  - `src/app/api/query/`: API routes for Next.js
  - `src/components/examples/`: Demo React components
  - `src/hooks/`: Custom React hooks
  - `src/lib/`: Schemas and configuration

## Integration Points
- **OpenAPI**: Add the OpenAPI plugin to auto-generate docs (`/openapi/schema`, `/reference`).
- **Custom Adapters/Plugins**: Extend via the adapter/plugin system; see examples in `src/adapters/` and `src/plugins/`.
- **Frontend/Backend Separation**: Never import Node.js/server code in client components. Use API routes for all data access.

## Example Patterns
- **Resource Definition**:
  ```typescript
  const productSchema = z.object({ ... });
  export const query = betterQuery({
    resources: [createResource({ name: "product", schema: productSchema, ... })],
    ...
  });
  ```
- **API Route (Next.js)**:
  ```typescript
  // src/app/api/query/[...any]/route.ts
  export { handler as GET, handler as POST, ... } from "better-query/next";
  ```
- **React Hook (Frontend)**:
  ```typescript
  // src/hooks/useCrud.ts
  export const useProducts = () => useResource<Product>("product");
  ```

---

If any section is unclear or missing, please specify what needs improvement or more detail.
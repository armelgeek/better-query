# Better Query 🚀

**The framework-agnostic CRUD engine for Enterprise applications.**

Better Query automates your REST API creation while providing the advanced features your professional apps actually need: Multi-Tenancy, Custom Business Actions, and Field-Level Security.

## ✨ Why Better Query?

- **Framework Agnostic**: Works with Hono, Express, Next.js, or any Node.js environment.
- **Enterprise Ready**: Native Multi-Tenancy, Custom Actions, and Field Security.
- **End-to-End Type Safety**: From your database to your client code.
- **Lightweight & Fast**: Built on top of Kysely and better-call for maximum performance.

## 🚀 Quick Start

### 1. Install
```bash
npm install better-query kysely zod
```

### 2. Define your API
```typescript
import { betterQuery, createResource } from "better-query";
import { z } from "zod";

export const { handler } = betterQuery({
  database: myKyselyDb,
  resources: [
    createResource({
      name: "project",
      schema: z.object({
        name: z.string(),
        status: z.enum(["active", "archived"]),
      }),
      multiTenancy: { enabled: true }
    })
  ]
});
```

### 3. Mount anywhere
```typescript
// Hono example
app.all("/api/query/*", (ctx) => handler(ctx.req.raw));
```

## 📖 Documentation

Check out our [Simplified Documentation Site](./docs/content/docs/introduction.mdx) for full guides on:
- [Installation](./docs/content/docs/installation.mdx)
- [Defining Resources](./docs/content/docs/resources.mdx)
- [Enterprise Features](./docs/content/docs/enterprise.mdx) (Multi-Tenancy, Actions, Security)
- [Universal Client](./docs/content/docs/client.mdx)

## 🏗️ Monorepo Structure

- `packages/better-query`: The core engine.
- `packages/shared`: Shared utilities.
- `docs`: Documentation site.

## 📄 License

MIT
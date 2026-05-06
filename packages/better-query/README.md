# Better Query Core 🚀

The standalone, type-safe CRUD engine for professional Node.js applications.

## ✨ Features

- **🛡️ Enterprise Ready**: Multi-Tenancy, Custom Actions, and Field-Level Security.
- **⚡ Performance**: Built on Kysely for type-safe database queries and better-call for lightweight routing.
- **🔒 Security**: Native GDPR masking and field-level permissions.
- **🔄 Extensible**: Powerful plugin system (Audit, History, Cache, Webhooks).

## 🚀 Quick Start

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

## 📖 Full Documentation

Visit the [Documentation Site](../../docs/content/docs/introduction.mdx) for detailed guides.
# Migration Guide: Upgrading to v0.2.0

`better-query` has been refactored into a lightweight, modular **Query Engine**. This update improves performance, reduces maintenance burden, and enforces separation of concerns.

## ⚠️ Breaking Changes

### 1. Modular Plugins (Bloat Extraction)
Non-core plugins have been removed from the main `better-query` package to reduce dependency bloat.

- **Removed Plugins:** `audit`, `mail`, `realtime`, `sse`, `upload`, `storage`.
- **Action:** If you were using these, you must now implement them manually or use community-maintained packages. They have been moved to `packages/better-query/src/plugins-deprecated/` if you need to reference the legacy code to implement your own version.

### 2. API Proxy Removal
The deep-nested Proxy (`createNestedApiProxy`) has been removed in favor of a direct, explicit object structure.

- **Legacy:** `api.resource.action()` (via Proxy).
- **New:** Use the explicit endpoints object provided by the `betterQuery` return value.

### 3. Client-Side Extraction
All client-side functionality (including `LiveQuery`) has been moved to a new dedicated package.

- **Legacy Import:** `import { createLiveQuery } from "better-query"`
- **New Import:** `import { createLiveQuery } from "@better-query/client"`

---

## Migration Steps

1. **Update `package.json`**:
   - Remove deprecated dependencies (`nodemailer`, `ws`, `aws-sdk`, etc.) if you no longer use them.
   - Add `@better-query/client` to your dependencies if you use the client-side features.

2. **Update Imports**:
   - Update all imports of `createLiveQuery`, `BetterLiveQuery`, or `createClient` to point to `@better-query/client`.

3. **Verify API Usage**:
   - If your code breaks due to the Proxy removal, verify that you are accessing endpoints through the explicit object returned by `betterQuery`.

4. **Verify Transformation**:
   - The manual data transformations (`transformFromData`, `transformToData`) have been removed from the Kysely adapter. Ensure your ORM/Adapter handles types correctly according to your database schema.

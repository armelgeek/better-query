# BetterAuth Development Guide

## Architecture Overview

**BetterAuth** is a modular authentication library built as a TypeScript monorepo. The core `packages/better-auth` package provides authentication primitives, while `dev/` contains example applications.

### Key Components

- **Core Auth System**: `packages/better-auth/src/auth.ts` - Main `betterAuth()` factory function
- **API Router**: `packages/better-auth/src/api/` - Endpoint definitions using `better-call` router
- **Client Libraries**: `packages/better-auth/src/client/` - Frontend integration with nanostores
- **Database Layer**: `packages/better-auth/src/adapters/` - Kysely-based database abstraction
- **Plugin System**: `packages/better-auth/src/plugins/` - Extensible functionality modules
- **Providers**: `packages/better-auth/src/providers/` - OAuth provider implementations

## Development Patterns

### API Endpoint Conventions
```typescript
// Route paths must be lowercase without hyphens/underscores
// ✅ Good: /signin/oauth
// ❌ Bad: /sign-in/oauth or /sign_in_oauth

// Only GET and POST methods supported
// - GET: requests without body
// - POST: requests with body
```

### Plugin Architecture
Plugins extend core functionality through a standardized interface:
```typescript
// Plugin structure in src/plugins/
export const myPlugin = (): Plugin => ({
  id: "my-plugin",
  endpoints: {
    // Additional API endpoints
  },
  schema: {
    // Database schema extensions
  }
})
```

### Provider Pattern
OAuth providers follow the `toBetterAuthProvider` pattern:
```typescript
// src/providers/example.ts
export const example = toBetterAuthProvider("example", ExampleSDK, {
  async getUserInfo(token) {
    // Fetch and normalize user data
    return { id, email, name, image, emailVerified, createdAt, updatedAt }
  }
})
```

### Client-Server Type Safety
The client automatically infers types from server configuration:
```typescript
// Client inherits server API types
const client = createAuthClient<typeof auth>()
// All endpoints are fully typed
```

## Build System

### Monorepo Structure
- **Turborepo**: Manages builds with dependency graph (`turbo.json`)
- **PNPM**: Package manager with workspace support (`pnpm-workspace.yaml`)
- **TSUP**: Build tool for packages with multi-entry configuration (`tsup.config.ts`)

### Entry Points
The main package exports multiple entry points:
```json
{
  ".": "./dist/index.js",
  "./provider": "./dist/provider.js", 
  "./client": "./dist/client.js",
  "./cli": "./dist/cli.js",
  "./react": "./dist/react.js",
  "./plugins": "./dist/plugins.js"
}
```

### Development Workflow
```bash
# Install dependencies
pnpm install

# Development mode (watch)
pnpm dev  # Runs turbo --filter "./packages/*" dev

# Build packages
pnpm build  # Builds only packages/, not dev/ apps

# Code quality
pnpm lint  # Biome linting with tab indentation
pnpm typecheck  # TypeScript checking across workspace
```

## Database Architecture

### Schema System
- **Base Schema**: User, Session, Account models in `src/adapters/schema.ts`
- **Field Extensions**: Plugins can extend models via `additionalFields`
- **Adapter Pattern**: Database-agnostic through Kysely query builder
- **Migration Support**: Auto-migration capability for schema changes

### Database Configuration
```typescript
// Supports multiple providers
database: {
  provider: "sqlite" | "postgres" | "mysql",
  url: "connection-string",
  autoMigrate?: boolean
}
```

## Client Architecture

### State Management
- **Nanostores**: Reactive session state with `$session` atom
- **Better-Fetch**: HTTP client with plugin system (CSRF, redirects)
- **Framework Integration**: React hooks via `createReactAuthClient`

### Security Features
- **CSRF Protection**: Automatic token injection via client plugin
- **Secure Cookies**: Configurable secure/httpOnly cookie handling
- **Environment Detection**: Auto-infers base URLs from environment variables

## Testing Strategy

- **Vitest**: Primary test runner (`bun vitest`)
- **Test Utils**: Shared utilities in `src/test-utils/`
- **Integration Tests**: Real database testing with adapters

## Code Style

- **Biome**: Formatter and linter with tab indentation
- **TypeScript**: Strict mode with `type-fest` utilities
- **Import Style**: Barrel exports for clean public APIs

## Key Files to Reference

- `packages/better-auth/src/auth.ts` - Core factory function
- `packages/better-auth/src/api/index.ts` - Router configuration
- `packages/better-auth/src/types/options.ts` - Configuration types
- `dev/next-app/src/lib/auth.ts` - Example server setup
- `dev/next-app/src/lib/client.ts` - Example client setup
- `packages/better-auth/Notes.md` - API design conventions

## Common Tasks

### Adding New Providers
1. Create provider file in `src/providers/`
2. Use `toBetterAuthProvider` helper
3. Implement `getUserInfo` function
4. Export from `src/providers/index.ts`

### Creating Plugins
1. Define plugin in `src/plugins/`
2. Extend endpoints, schema, or both
3. Follow plugin interface pattern
4. Export from `src/plugins/index.ts`

### Database Changes
1. Modify base schema in `src/adapters/schema.ts`
2. Update adapter interfaces in `src/types/adapter.ts`
3. Test with multiple database providers
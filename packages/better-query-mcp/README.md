# Better Query MCP Server

A **Model Context Protocol (MCP)** server for [better-query](../better-query), enabling AI assistants to seamlessly discover and interact with better-query APIs.

## What is MCP?

The [Model Context Protocol](https://modelcontextprotocol.io) is an open standard that allows AI applications to connect to external data sources and tools. This MCP server exposes better-query's CRUD operations, resource schemas, and plugin system to AI assistants like Claude Desktop, enabling them to understand and work with your better-query APIs.

## Features

- 🔍 **Resource Discovery** - List and explore all resources and their schemas
- 📊 **CRUD Operations** - Create, read, update, and delete resource items
- 🔗 **Relationship Navigation** - Discover and traverse resource relationships
- 🧩 **Plugin Information** - Query active plugins and their capabilities
- 🎯 **Custom Operations** - Execute adapter-specific custom operations
- 📝 **API Documentation** - Get auto-generated API endpoint information

## Installation

### Using npm/pnpm

```bash
# Install globally
npm install -g better-query-mcp

# Or with pnpm
pnpm add -g better-query-mcp
```

### From Source

```bash
# Clone the repository
git clone https://github.com/armelgeek/better-query.git
cd better-query/packages/better-query-mcp

# Install dependencies
pnpm install

# Build
pnpm build
```

## Quick Start

### 1. Configure MCP Client

Add to your MCP client configuration (e.g., Claude Desktop):

**MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "better-query": {
      "command": "npx",
      "args": ["better-query-mcp"]
    }
  }
}
```

### 2. Start Using

Once configured, AI assistants can use tools like:

- `list_resources` - Discover available resources
- `get_resource_schema` - View resource schemas
- `list_resource_items` - Query resource data
- `create_resource_item` - Create new items
- And more!

## Available Tools

### Resource Management

#### `list_resources`
Lists all available resources with their schemas and configurations.

```typescript
// No parameters required
```

#### `get_resource_schema`
Gets detailed schema for a specific resource.

```typescript
{
  resourceName: "user" // Name of the resource
}
```

### CRUD Operations

#### `list_resource_items`
Lists items from a resource with filtering and pagination.

```typescript
{
  resourceName: "user",
  filters?: { email: "test@example.com" },
  limit?: 50,
  offset?: 0,
  orderBy?: "createdAt",
  orderDirection?: "desc"
}
```

#### `get_resource_item`
Gets a single item by ID.

```typescript
{
  resourceName: "user",
  id: "123"
}
```

#### `create_resource_item`
Creates a new item.

```typescript
{
  resourceName: "user",
  data: {
    name: "John Doe",
    email: "john@example.com"
  }
}
```

#### `update_resource_item`
Updates an existing item.

```typescript
{
  resourceName: "user",
  id: "123",
  data: {
    name: "Jane Doe"
  }
}
```

#### `delete_resource_item`
Deletes an item by ID.

```typescript
{
  resourceName: "user",
  id: "123"
}
```

### Relationships

#### `get_resource_relationships`
Gets relationship information for a resource.

```typescript
{
  resourceName: "user"
}
```

#### `get_related_items`
Gets items related through a specific relationship.

```typescript
{
  resourceName: "user",
  itemId: "123",
  relationshipName: "posts"
}
```

### Plugin System

#### `list_plugins`
Lists all active plugins.

```typescript
// No parameters required
```

#### `get_plugin_info`
Gets detailed information about a plugin.

```typescript
{
  pluginId: "audit-log"
}
```

### Advanced

#### `execute_custom_operation`
Executes adapter-specific custom operations.

```typescript
{
  operationName: "bulkImport",
  params: {
    data: [...],
    options: {}
  }
}
```

#### `get_api_endpoints`
Lists all generated API endpoints.

```typescript
// No parameters required
```

## Integration Examples

### With Better Query Application

```typescript
// Your better-query setup
import { betterQuery, createResource } from 'better-query';
import { z } from 'zod';

const query = betterQuery({
  database: {
    provider: "sqlite",
    url: "./data.db"
  },
  resources: [
    createResource({
      name: "user",
      schema: z.object({
        name: z.string(),
        email: z.string().email(),
      })
    }),
    createResource({
      name: "post",
      schema: z.object({
        title: z.string(),
        content: z.string(),
        userId: z.string(),
      })
    })
  ]
});

// MCP server can now discover and interact with these resources!
```

### Using with AI Assistant

**User**: "Show me all the resources available in this API"

**AI (using `list_resources`)**: 
```
Found 2 resources:
1. user - Schema: { name: string, email: string }
2. post - Schema: { title: string, content: string, userId: string }
```

**User**: "Create a new user named Alice"

**AI (using `create_resource_item`)**:
```
Created user:
{
  id: "cuid123...",
  name: "Alice",
  email: "alice@example.com"
}
```

## Architecture

The MCP server acts as a bridge between AI assistants and better-query instances:

```
┌─────────────┐         ┌──────────────┐         ┌────────────────┐
│ AI Assistant│ ◄─MCP──►│ MCP Server   │ ◄─────► │ Better Query   │
│ (Claude)    │         │ (this pkg)   │         │ Instance       │
└─────────────┘         └──────────────┘         └────────────────┘
```

## Development

### Building

```bash
pnpm build
```

### Running Locally

```bash
# Build and run
pnpm build
node dist/index.js

# Or in development mode
pnpm dev
```

### Testing

```bash
pnpm test
```

## Configuration

The MCP server can be configured through environment variables:

```bash
# Future configuration options
BETTER_QUERY_BASE_URL=http://localhost:3000/api
BETTER_QUERY_API_KEY=your-api-key
```

## Troubleshooting

### MCP Server Not Appearing

1. Check your MCP client configuration file path
2. Ensure `better-query-mcp` is installed globally or path is correct
3. Restart your MCP client application

### Tools Not Working

1. Verify your better-query instance is running
2. Check connection configuration
3. Review MCP client logs for errors

### Permission Issues

```bash
# Make script executable
chmod +x dist/index.js
```

## Use Cases

- 🤖 **AI-Powered Admin Dashboards** - Let AI help manage your data
- 📊 **Natural Language Queries** - Query databases with plain language
- 🔄 **Data Migration** - AI-assisted data transformations
- 📝 **Documentation** - Auto-generate API documentation
- 🧪 **Testing** - AI-driven test data generation

## Roadmap

- [ ] Real-time connection to running better-query instances
- [ ] WebSocket support for live updates
- [ ] Advanced filtering and search capabilities
- [ ] Bulk operations support
- [ ] Transaction management
- [ ] Schema migrations through MCP
- [ ] Plugin marketplace integration

## Contributing

Contributions are welcome! Please see the [Contributing Guide](../../CONTRIBUTING.md).

## License

MIT - see [LICENSE](../../LICENSE)

## Related

- [better-query](../better-query) - The main CRUD library
- [Model Context Protocol](https://modelcontextprotocol.io) - MCP specification
- [Claude Desktop](https://claude.ai/download) - AI assistant with MCP support

---

**Need help?** Open an issue on [GitHub](https://github.com/armelgeek/better-query/issues)

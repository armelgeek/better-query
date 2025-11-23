# MCP Integration Guide

This guide explains how to integrate the Better Query MCP server with your better-query application and AI assistants.

## Overview

The Better Query MCP server enables AI assistants to:
- Discover and understand your better-query resources
- Perform CRUD operations through natural language
- Navigate relationships between resources
- Access plugin information
- Execute custom operations

## Integration Steps

### 1. Install the MCP Server

```bash
# Global installation (recommended for AI assistants)
npm install -g better-query-mcp

# Or use npx (no installation needed)
npx better-query-mcp
```

### 2. Configure Your AI Assistant

#### For Claude Desktop

**Location:**
- **MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**Configuration:**
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

#### For Other MCP Clients

Use the same pattern - the MCP server runs via stdio and follows the standard MCP protocol.

### 3. Set Up Your Better Query Application

```typescript
// server.ts
import { betterQuery, createResource } from 'better-query';
import { z } from 'zod';

const query = betterQuery({
  database: {
    provider: "sqlite",
    url: "./data.db",
    autoMigrate: true
  },
  basePath: "/api/query",
  resources: [
    createResource({
      name: "user",
      schema: z.object({
        name: z.string(),
        email: z.string().email(),
        role: z.enum(['admin', 'user']).default('user')
      }),
      relationships: {
        posts: {
          type: 'hasMany',
          resource: 'post',
          foreignKey: 'userId'
        }
      }
    }),
    createResource({
      name: "post",
      schema: z.object({
        title: z.string(),
        content: z.string(),
        userId: z.string()
      }),
      relationships: {
        author: {
          type: 'belongsTo',
          resource: 'user',
          foreignKey: 'userId'
        }
      }
    })
  ]
});

// Expose the handler
export default query.handler;
```

### 4. Start Your Application

```bash
# Start your better-query application
node server.js
# or with your framework (Next.js, Express, etc.)
npm run dev
```

### 5. Use the AI Assistant

Restart your AI assistant (e.g., Claude Desktop) and start asking questions:

#### Discovery
> "What resources are available in the better-query API?"

> "Show me the schema for the user resource"

#### CRUD Operations
> "Create a new user named Alice with email alice@example.com"

> "List all users"

> "Update user with ID abc123 to set their role to admin"

> "Delete user with ID xyz789"

#### Relationships
> "What relationships does the user resource have?"

> "Show me all posts by user abc123"

#### Advanced
> "What plugins are active?"

> "What API endpoints are available?"

## Example Conversations

### Creating a Complete Blog Post

**You:** "Create a new user named Bob with email bob@blog.com"

**AI:** *Uses `create_resource_item` tool*
```
Created user:
ID: abc123
Name: Bob
Email: bob@blog.com
Role: user
```

**You:** "Now create a blog post by Bob with title 'My First Post' and content 'Hello World!'"

**AI:** *Uses `create_resource_item` with userId abc123*
```
Created post:
ID: post456
Title: My First Post
Content: Hello World!
Author ID: abc123
```

**You:** "Show me all posts by Bob"

**AI:** *Uses `get_related_items`*
```
Found 1 post by user abc123:
1. My First Post (post456)
   Content: Hello World!
```

### Managing Data

**You:** "How many users do we have?"

**AI:** *Uses `list_resource_items`*
```
Total users: 5
- Alice (admin)
- Bob (user)
- Carol (user)
- Dave (admin)
- Eve (user)
```

**You:** "Promote Bob to admin"

**AI:** *Uses `update_resource_item`*
```
Updated user Bob:
Role changed from 'user' to 'admin'
```

## Architecture

```
┌─────────────────┐
│  AI Assistant   │
│ (Claude, etc.)  │
└────────┬────────┘
         │ MCP Protocol
         ▼
┌─────────────────┐
│  MCP Server     │
│ (this package)  │
└────────┬────────┘
         │ Tool Definitions
         │ + Examples
         ▼
┌─────────────────┐
│  Better Query   │
│  Application    │
└─────────────────┘
```

## Current Capabilities

✅ **Available Now:**
- Tool definitions for all CRUD operations
- Resource schema introspection
- Relationship navigation
- Plugin discovery
- API endpoint documentation

🚧 **Coming Soon:**
- Direct database connections
- Real-time data operations
- WebSocket support for live updates
- Batch operations
- Transaction management

## Configuration Options

### Environment Variables

```bash
# Future configuration options
BETTER_QUERY_BASE_URL=http://localhost:3000/api
BETTER_QUERY_API_KEY=your-api-key
BETTER_QUERY_DATABASE_URL=postgresql://...
```

## Troubleshooting

### MCP Server Not Found

```bash
# Verify installation
which better-query-mcp

# Or check with npx
npx better-query-mcp --version
```

### Tools Not Appearing

1. Check configuration file syntax
2. Restart the AI assistant
3. Check AI assistant logs

### Permission Denied

```bash
# Make the script executable
chmod +x $(which better-query-mcp)
```

## Best Practices

1. **Start with Discovery**: Ask about available resources first
2. **Understand Schemas**: Check field requirements before creating data
3. **Use Relationships**: Leverage the relationship tools for connected data
4. **Validate Data**: The AI will validate against schemas automatically
5. **Iterative Operations**: Break complex tasks into smaller steps

## Security Considerations

- MCP server runs locally and doesn't expose your data externally
- Always validate data before committing to your database
- Use proper authentication in your better-query application
- Review AI-generated operations before execution in production

## Next Steps

- Explore the [MCP Server README](../packages/better-query-mcp/README.md)
- Check [Better Query Documentation](../packages/better-query/README.md)
- Learn about [Model Context Protocol](https://modelcontextprotocol.io)
- Join discussions on [GitHub](https://github.com/armelgeek/better-query/discussions)

## Support

For issues or questions:
- [GitHub Issues](https://github.com/armelgeek/better-query/issues)
- [GitHub Discussions](https://github.com/armelgeek/better-query/discussions)

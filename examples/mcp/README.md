# Better Query MCP Examples

This directory contains examples of how to use the Better Query MCP server with AI assistants.

## Example 1: Basic Configuration

### Step 1: Configure Claude Desktop

**MacOS**: Edit `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: Edit `%APPDATA%\Claude\claude_desktop_config.json`

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

### Step 2: Restart Claude Desktop

After saving the configuration, restart Claude Desktop to load the MCP server.

### Step 3: Verify Connection

In Claude Desktop, you should now see "better-query" in the available tools. Try asking:

> "What tools do you have available for better-query?"

Claude should respond with information about the 13 available tools.

## Example 2: Discovering Resources

Ask Claude:

> "Can you show me what resources are available in the better-query API?"

Claude will use the `list_resources` tool to show you all configured resources.

## Example 3: Getting Resource Schema

Ask Claude:

> "What fields does the user resource have?"

Claude will use the `get_resource_schema` tool with the resource name "user".

## Example 4: Creating Data

Ask Claude:

> "Create a new user with the name 'Alice' and email 'alice@example.com'"

Claude will use the `create_resource_item` tool to create the user.

## Example 5: Querying Data

Ask Claude:

> "Show me all users in the database"

Claude will use the `list_resource_items` tool to fetch and display users.

## Example 6: Working with Relationships

Ask Claude:

> "What relationships does the user resource have?"

Then:

> "Show me all posts by user with ID '123'"

Claude will use `get_resource_relationships` and `get_related_items` to navigate relationships.

## Example 7: Plugin Discovery

Ask Claude:

> "What plugins are active in this better-query instance?"

Claude will use the `list_plugins` tool to show active plugins.

## Example 8: API Endpoint Documentation

Ask Claude:

> "What API endpoints are available for the user resource?"

Claude will use the `get_api_endpoints` tool to show all generated endpoints.

## Tips for AI Interaction

1. **Be Specific**: Mention the resource name clearly
2. **Natural Language**: Ask in plain English, the AI will translate to API calls
3. **Iterate**: Start with discovery, then move to operations
4. **Relationships**: Ask about relationships before trying to access related data
5. **Validation**: The AI will validate data against schemas before creating/updating

## Advanced: Custom Operations

If your adapter defines custom operations:

> "Execute the 'bulkImport' operation with these 100 user records..."

Claude will use the `execute_custom_operation` tool.

## Troubleshooting

### MCP Server Not Found

1. Ensure `better-query-mcp` is installed globally: `npm install -g better-query-mcp`
2. Or specify full path in config: `"command": "/full/path/to/better-query-mcp"`

### Tools Not Appearing

1. Check config file syntax is valid JSON
2. Restart Claude Desktop completely
3. Check Claude Desktop logs for errors

### Connection Issues

Currently, the MCP server provides tool definitions and examples. To connect to a live better-query instance, future versions will support:

- WebSocket connections
- HTTP API endpoints
- Configuration for database connections

## Next Steps

- Explore the [MCP Package Documentation](../../packages/better-query-mcp/README.md)
- Check the [Better Query Documentation](../../packages/better-query/README.md)
- Learn about [Model Context Protocol](https://modelcontextprotocol.io)

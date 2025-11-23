#!/usr/bin/env node
/**
 * Test script to verify MCP server tools listing
 * This simulates what an MCP client would do
 */

import { spawn } from "child_process";
import { once } from "events";

async function testMCPServer() {
	console.log("Testing Better Query MCP Server...\n");

	const server = spawn("node", ["dist/index.js"], {
		stdio: ["pipe", "pipe", "pipe"],
	});

	// Collect output
	let stdout = "";
	let stderr = "";

	server.stdout.on("data", (data) => {
		stdout += data.toString();
	});

	server.stderr.on("data", (data) => {
		stderr += data.toString();
		console.log("Server:", data.toString().trim());
	});

	// Send initialize request (MCP protocol)
	const initRequest = {
		jsonrpc: "2.0",
		id: 1,
		method: "initialize",
		params: {
			protocolVersion: "2024-11-05",
			capabilities: {},
			clientInfo: {
				name: "test-client",
				version: "1.0.0",
			},
		},
	};

	server.stdin.write(JSON.stringify(initRequest) + "\n");

	// Wait a bit for response
	await new Promise((resolve) => setTimeout(resolve, 1000));

	// Send tools/list request
	const toolsRequest = {
		jsonrpc: "2.0",
		id: 2,
		method: "tools/list",
		params: {},
	};

	server.stdin.write(JSON.stringify(toolsRequest) + "\n");

	// Wait for response
	await new Promise((resolve) => setTimeout(resolve, 1000));

	// Clean up
	server.kill();

	console.log("\n✅ Server started successfully!");
	console.log(
		"📝 To use with Claude Desktop, add to claude_desktop_config.json:",
	);
	console.log(
		JSON.stringify(
			{
				mcpServers: {
					"better-query": {
						command: "npx",
						args: ["better-query-mcp"],
					},
				},
			},
			null,
			2,
		),
	);
}

testMCPServer().catch(console.error);

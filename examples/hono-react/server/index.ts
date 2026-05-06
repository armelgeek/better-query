import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { betterQuery, createResource } from "../../../packages/better-query/src";
import { realtimePlugin } from "../../../packages/better-query/src/plugins/realtime";
import { z } from "zod";

const app = new Hono();

app.use("*", cors());

const query = betterQuery({
  basePath: "/api",
  database: {
    provider: "sqlite",
    url: ":memory:",
    autoMigrate: true
  },
  plugins: [
    realtimePlugin()
  ],
  resources: [
    createResource({
      name: "todo",
      schema: z.object({
        id: z.string(),
        title: z.string(),
        completed: z.boolean().default(false),
        createdAt: z.date().optional()
      })
    })
  ]
});

app.all("/api/*", (c) => query.handler(c.req.raw));

console.log("Server running on http://localhost:3000");

serve({
  fetch: app.fetch,
  port: 3000
});

export type Query = typeof query;

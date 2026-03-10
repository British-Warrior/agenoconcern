import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerListChallenges(server: McpServer) {
  server.tool(
    "list_challenges",
    "List available challenges with optional filters by domain, type, or required skills",
    {
      filters: z.object({
        domain: z.string().optional().describe("Filter by challenge domain (e.g. technology, finance, healthcare)"),
        type: z.string().optional().describe("Filter by challenge type (e.g. mentoring, consulting, project)"),
        skills: z.array(z.string()).optional().describe("Filter by required skills"),
      }).optional().describe("Optional filters to narrow challenge results"),
    },
    async ({ filters }) => ({
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          error: "NOT_IMPLEMENTED",
          message: "list_challenges will be implemented in Phase 3",
          tool: "list_challenges",
          received: { filters },
        }),
      }],
      isError: true,
    }),
  );
}

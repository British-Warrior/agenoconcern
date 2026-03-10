import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerGetContributorImpact(server: McpServer) {
  server.tool(
    "get_contributor_impact",
    "Retrieve a contributor's impact metrics including challenges completed, hours contributed, and community impact score",
    {
      contributor_id: z.string().uuid().describe("The contributor's unique ID"),
    },
    async ({ contributor_id }) => ({
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          error: "NOT_IMPLEMENTED",
          message: "get_contributor_impact will be implemented in Phase 4",
          tool: "get_contributor_impact",
          received: { contributor_id },
        }),
      }],
      isError: true,
    }),
  );
}

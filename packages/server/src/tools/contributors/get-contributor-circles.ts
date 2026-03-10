import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerGetContributorCircles(server: McpServer) {
  server.tool(
    "get_contributor_circles",
    "List all circles a contributor belongs to, including their role in each circle",
    {
      contributor_id: z.string().uuid().describe("The contributor's unique ID"),
    },
    async ({ contributor_id }) => ({
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          error: "NOT_IMPLEMENTED",
          message: "get_contributor_circles will be implemented in Phase 3",
          tool: "get_contributor_circles",
          received: { contributor_id },
        }),
      }],
      isError: true,
    }),
  );
}

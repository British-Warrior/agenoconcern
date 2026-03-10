import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerExpressInterest(server: McpServer) {
  server.tool(
    "express_interest",
    "Register a contributor's interest in a specific challenge for matching consideration",
    {
      challenge_id: z.string().uuid().describe("The challenge to express interest in"),
      contributor_id: z.string().uuid().describe("The contributor expressing interest"),
    },
    async ({ challenge_id, contributor_id }) => ({
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          error: "NOT_IMPLEMENTED",
          message: "express_interest will be implemented in Phase 3",
          tool: "express_interest",
          received: { challenge_id, contributor_id },
        }),
      }],
      isError: true,
    }),
  );
}

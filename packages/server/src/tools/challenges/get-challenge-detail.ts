import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerGetChallengeDetail(server: McpServer) {
  server.tool(
    "get_challenge_detail",
    "Get full details of a specific challenge including description, requirements, timeline, and payment terms",
    {
      challenge_id: z.string().uuid().describe("The challenge's unique ID"),
    },
    async ({ challenge_id }) => ({
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          error: "NOT_IMPLEMENTED",
          message: "get_challenge_detail will be implemented in Phase 3",
          tool: "get_challenge_detail",
          received: { challenge_id },
        }),
      }],
      isError: true,
    }),
  );
}

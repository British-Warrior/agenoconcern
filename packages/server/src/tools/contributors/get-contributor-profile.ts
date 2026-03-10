import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerGetContributorProfile(server: McpServer) {
  server.tool(
    "get_contributor_profile",
    "Retrieve a contributor's profile including expertise, skills, availability, and preferences",
    {
      contributor_id: z.string().uuid().describe("The contributor's unique ID"),
    },
    async ({ contributor_id }) => ({
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          error: "NOT_IMPLEMENTED",
          message: "get_contributor_profile will be implemented in Phase 2",
          tool: "get_contributor_profile",
          received: { contributor_id },
        }),
      }],
      isError: true,
    }),
  );
}

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerUpdateContributorProfile(server: McpServer) {
  server.tool(
    "update_contributor_profile",
    "Update a contributor's profile fields such as display name, bio, skills, availability, or preferences",
    {
      contributor_id: z.string().uuid().describe("The contributor's unique ID"),
      updates: z.object({
        display_name: z.string().optional().describe("New display name"),
        bio: z.string().optional().describe("Updated biography text"),
        skills: z.array(z.string()).optional().describe("Updated list of skills"),
        availability_hours: z.number().optional().describe("Weekly hours available for challenges"),
      }).describe("Fields to update on the contributor profile"),
    },
    async ({ contributor_id, updates }) => ({
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          error: "NOT_IMPLEMENTED",
          message: "update_contributor_profile will be implemented in Phase 2",
          tool: "update_contributor_profile",
          received: { contributor_id, updates },
        }),
      }],
      isError: true,
    }),
  );
}

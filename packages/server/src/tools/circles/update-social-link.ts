import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerUpdateSocialLink(server: McpServer) {
  server.tool(
    "update_social_link",
    "Add or update a social media or communication link for a circle",
    {
      circle_id: z.string().uuid().describe("The circle to update the social link for"),
      platform: z.enum(["slack", "discord", "teams", "whatsapp", "other"]).describe("The social platform"),
      url: z.string().url().describe("The URL or invite link for the social platform"),
    },
    async ({ circle_id, platform, url }) => ({
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          error: "NOT_IMPLEMENTED",
          message: "update_social_link will be implemented in Phase 3",
          tool: "update_social_link",
          received: { circle_id, platform, url },
        }),
      }],
      isError: true,
    }),
  );
}

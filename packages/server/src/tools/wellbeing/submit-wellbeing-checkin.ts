import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerSubmitWellbeingCheckin(server: McpServer) {
  server.tool(
    "submit_wellbeing_checkin",
    "Submit a periodic wellbeing check-in with UCLA loneliness and WEMWBS mental wellbeing scores",
    {
      contributor_id: z.string().uuid().describe("The contributor submitting the check-in"),
      ucla_score: z.number().int().min(20).max(80).describe("UCLA Loneliness Scale score (20-80, lower is less lonely)"),
      wemwbs_score: z.number().int().min(14).max(70).describe("Warwick-Edinburgh Mental Wellbeing Scale score (14-70, higher is better)"),
      freetext_note: z.string().max(2000).optional().describe("Optional free-text note about how the contributor is feeling"),
    },
    async ({ contributor_id, ucla_score, wemwbs_score, freetext_note }) => ({
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          error: "NOT_IMPLEMENTED",
          message: "submit_wellbeing_checkin will be implemented in Phase 6 (requires DPIA completion)",
          tool: "submit_wellbeing_checkin",
          received: { contributor_id, ucla_score, wemwbs_score, freetext_note },
        }),
      }],
      isError: true,
    }),
  );
}

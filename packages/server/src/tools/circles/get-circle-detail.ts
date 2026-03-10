import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerGetCircleDetail(server: McpServer) {
  server.tool(
    "get_circle_detail",
    "Get full details of a circle including members, challenge context, notes, and resolution status",
    {
      circle_id: z.string().uuid().describe("The circle's unique ID"),
    },
    async ({ circle_id }) => ({
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          error: "NOT_IMPLEMENTED",
          message: "get_circle_detail will be implemented in Phase 3",
          tool: "get_circle_detail",
          received: { circle_id },
        }),
      }],
      isError: true,
    }),
  );
}

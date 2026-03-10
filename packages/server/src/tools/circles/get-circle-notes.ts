import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerGetCircleNotes(server: McpServer) {
  server.tool(
    "get_circle_notes",
    "Retrieve all notes from a circle's discussion thread, ordered chronologically",
    {
      circle_id: z.string().uuid().describe("The circle to retrieve notes from"),
    },
    async ({ circle_id }) => ({
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          error: "NOT_IMPLEMENTED",
          message: "get_circle_notes will be implemented in Phase 3",
          tool: "get_circle_notes",
          received: { circle_id },
        }),
      }],
      isError: true,
    }),
  );
}

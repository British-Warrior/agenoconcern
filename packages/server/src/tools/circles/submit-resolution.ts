import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerSubmitResolution(server: McpServer) {
  server.tool(
    "submit_resolution",
    "Submit the final resolution or deliverable for a circle's challenge",
    {
      circle_id: z.string().uuid().describe("The circle submitting the resolution"),
      content: z.object({
        summary: z.string().describe("Brief summary of the resolution"),
        deliverables: z.array(z.string()).describe("List of deliverables completed"),
        notes: z.string().optional().describe("Additional notes or context"),
      }).describe("The resolution content and deliverables"),
    },
    async ({ circle_id, content }) => ({
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          error: "NOT_IMPLEMENTED",
          message: "submit_resolution will be implemented in Phase 3",
          tool: "submit_resolution",
          received: { circle_id, resolution: content },
        }),
      }],
      isError: true,
    }),
  );
}

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerAddCircleNote(server: McpServer) {
  server.tool(
    "add_circle_note",
    "Add a note to a circle's discussion thread for collaboration and knowledge sharing",
    {
      circle_id: z.string().uuid().describe("The circle to add a note to"),
      contributor_id: z.string().uuid().describe("The contributor adding the note"),
      content: z.string().min(1).max(10000).describe("The note content in plain text or markdown"),
      type: z.enum(["discussion", "update", "decision", "action"]).describe("The type of note being added"),
    },
    async ({ circle_id, contributor_id, content, type }) => ({
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          error: "NOT_IMPLEMENTED",
          message: "add_circle_note will be implemented in Phase 3",
          tool: "add_circle_note",
          received: { circle_id, contributor_id, content, note_type: type },
        }),
      }],
      isError: true,
    }),
  );
}

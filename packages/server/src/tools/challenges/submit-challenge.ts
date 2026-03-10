import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerSubmitChallenge(server: McpServer) {
  server.tool(
    "submit_challenge",
    "Submit a new challenge for community contributors to work on",
    {
      title: z.string().min(5).max(200).describe("Challenge title"),
      brief: z.string().min(20).max(5000).describe("Detailed challenge description and requirements"),
      domain: z.string().describe("Challenge domain (e.g. technology, finance, healthcare, education)"),
      skills_needed: z.array(z.string()).min(1).describe("Skills required to complete this challenge"),
      type: z.string().describe("Challenge type (e.g. mentoring, consulting, project, workshop)"),
      payment: z.object({
        amount: z.number().positive().describe("Payment amount in GBP"),
        type: z.enum(["fixed", "hourly"]).describe("Payment structure"),
      }).describe("Payment terms for the challenge"),
      deadline: z.string().datetime().optional().describe("Optional deadline in ISO 8601 format"),
    },
    async ({ title, brief, domain, skills_needed, type, payment, deadline }) => ({
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          error: "NOT_IMPLEMENTED",
          message: "submit_challenge will be implemented in Phase 3",
          tool: "submit_challenge",
          received: { title, brief, domain, skills_needed, type, payment, deadline },
        }),
      }],
      isError: true,
    }),
  );
}

import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { getEnv } from "../config/env.js";
import type { ParsedCvData } from "@agenoconcern/shared";

// Zod schema for structured CV output
const parsedCvSchema = z.object({
  name: z.string().describe("Full name of the candidate"),
  rolesAndTitles: z.array(z.string()).describe("Job titles and roles held"),
  skills: z.array(z.string()).describe("Technical and professional skills"),
  qualifications: z.array(z.string()).describe("Degrees, certifications, and qualifications"),
  sectors: z.array(z.string()).describe("Industry sectors worked in"),
  yearsOfExperience: z.number().int().min(0).describe("Total years of professional experience"),
  professionalSummary: z.string().describe("A concise professional summary (2-4 sentences)"),
  affirmationMessage: z
    .string()
    .describe(
      "An encouraging, warm message (1-2 sentences) for the contributor about how their experience can benefit communities",
    ),
});

function getOpenAIClient(): OpenAI {
  const env = getEnv();
  if (!env.OPENAI_API_KEY) {
    throw new Error("OpenAI not configured: OPENAI_API_KEY is required");
  }
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}

/**
 * Parse CV text into structured profile data using OpenAI structured output.
 */
export async function parseCvText(cvText: string): Promise<ParsedCvData> {
  const client = getOpenAIClient();

  const completion = await client.chat.completions.parse({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are an expert CV parser. Extract structured information from the provided CV text. " +
          "Be accurate and concise. For the affirmationMessage, be warm and encouraging about how their " +
          "skills and experience can make a positive impact on communities and organisations that need them.",
      },
      {
        role: "user",
        content: `Please parse the following CV:\n\n${cvText}`,
      },
    ],
    response_format: zodResponseFormat(parsedCvSchema, "parsed_cv"),
  });

  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed) {
    throw new Error("OpenAI returned an empty or unparseable response");
  }

  return parsed;
}

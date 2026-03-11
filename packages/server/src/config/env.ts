import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url().default("postgresql://postgres:postgres@localhost:5432/agenoconcern"),

  // Server
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),

  // JWT
  JWT_SECRET: z.string().min(1).default("dev-jwt-secret-change-in-production"),

  // OAuth - Google
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),

  // OAuth - LinkedIn
  LINKEDIN_CLIENT_ID: z.string().default(""),
  LINKEDIN_CLIENT_SECRET: z.string().default(""),

  // SMS - Twilio
  TWILIO_ACCOUNT_SID: z.string().default(""),
  TWILIO_AUTH_TOKEN: z.string().default(""),
  TWILIO_VERIFY_SERVICE_SID: z.string().default(""),

  // Email - Resend
  RESEND_API_KEY: z.string().default(""),

  // AWS S3 - CV storage
  AWS_REGION: z.string().default("eu-west-2"),
  AWS_ACCESS_KEY_ID: z.string().default(""),
  AWS_SECRET_ACCESS_KEY: z.string().default(""),
  S3_BUCKET: z.string().default(""),

  // OpenAI - CV parsing
  OPENAI_API_KEY: z.string().default(""),

  // Stripe - Connect
  STRIPE_SECRET_KEY: z.string().default(""),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (!_env) {
    _env = envSchema.parse(process.env);
  }
  return _env;
}

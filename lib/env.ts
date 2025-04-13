import { z } from 'zod';

const envSchema = z.object({
  // Required for Claude models
  ANTHROPIC_API_KEY: z.string().min(1, 'Anthropic API Key is required'),
  // Optional, potentially for other features or fallback
  OPENAI_API_KEY: z.string().optional(),
  // Add other required environment variables here as needed
  // e.g., DATABASE_URL: z.string().url().optional(), // If using a remote DB
  // e.g., NEXTAUTH_SECRET: z.string().min(1),
  // e.g., NEXTAUTH_URL: z.string().url().optional(),
});

// Validate process.env against the schema
// Use `process.env` directly here as this runs at build/startup time
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    '❌ Invalid environment variables:',
    parsedEnv.error.flatten().fieldErrors,
  );
  // Throwing an error causes the build to fail
  // This is intentional to prevent running with invalid configuration
  throw new Error('Invalid environment variables. Please check your .env file.');
}

// Export the validated environment variables for runtime use
export const env = parsedEnv.data; 
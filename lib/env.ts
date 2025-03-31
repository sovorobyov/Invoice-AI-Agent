import { z } from 'zod';

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API Key is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

function getNodeEnv() {
  return process.env.NODE_ENV || 'development';
}

export function validateEnv(): Env {
  const env = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    NODE_ENV: getNodeEnv(),
  };

  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('\n');
      throw new Error(`❌ Invalid environment variables:\n${missingVars}`);
    }
    throw error;
  }
}

// Validate environment variables at startup
validateEnv(); 
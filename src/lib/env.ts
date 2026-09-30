import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long'),
  SQLSERVER_HOST: z.string().default('localhost'),
  SQLSERVER_DATABASE: z.string().default('gpcl_finance_db'),
  SQLSERVER_USER: z.string().default('sa'),
  SQLSERVER_PASSWORD: z.string().default(''),
  SQLSERVER_INSTANCE: z.string().optional(),
  SQLSERVER_ENCRYPT: z.string().default('false').transform((v) => v === 'true'),
  SQLSERVER_TRUST: z.string().default('true').transform((v) => v === 'true'),
});

export type Env = z.infer<typeof envSchema>;

function getEnv(): Env {
  const fallbackSecret = 'prod-fallback-jwt-secret-key-32-chars-long!';
  
  const rawEnv = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    JWT_SECRET: process.env.JWT_SECRET || fallbackSecret,
    SQLSERVER_HOST: process.env.SQLSERVER_HOST || 'localhost',
    SQLSERVER_DATABASE: process.env.SQLSERVER_DATABASE || 'gpcl_finance_db',
    SQLSERVER_USER: process.env.SQLSERVER_USER || 'sa',
    SQLSERVER_PASSWORD: process.env.SQLSERVER_PASSWORD || '',
    SQLSERVER_INSTANCE: process.env.SQLSERVER_INSTANCE,
    SQLSERVER_ENCRYPT: process.env.SQLSERVER_ENCRYPT || 'false',
    SQLSERVER_TRUST: process.env.SQLSERVER_TRUST || 'true',
  };

  const parsed = envSchema.safeParse(rawEnv);
  return (parsed.success ? parsed.data : rawEnv) as Env;
}

export const env = getEnv();

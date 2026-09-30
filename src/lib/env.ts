import { z } from 'zod';

const bool = (def: 'true' | 'false') =>
  z
    .enum(['true', 'false'])
    .default(def)
    .transform((v) => v === 'true');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
    JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().max(7 * 24 * 3600).default(8 * 3600),
    SQLSERVER_HOST: z.string().min(1, 'SQLSERVER_HOST is required'),
    SQLSERVER_PORT: z.coerce.number().int().positive().default(1433),
    SQLSERVER_DATABASE: z.string().min(1, 'SQLSERVER_DATABASE is required'),
    SQLSERVER_USER: z.string().min(1, 'SQLSERVER_USER is required'),
    SQLSERVER_PASSWORD: z.string().min(1, 'SQLSERVER_PASSWORD is required'),
    SQLSERVER_INSTANCE: z.string().optional(),
    SQLSERVER_ENCRYPT: bool('true'),
    SQLSERVER_TRUST: bool('false'),
    DB_POOL_MAX: z.coerce.number().int().positive().default(20),
    // Set to true only when running behind a reverse proxy that overwrites X-Forwarded-For.
    TRUST_PROXY: bool('false'),
    // Set to false only for local development over plain http.
    COOKIE_SECURE: bool('true'),
    LOG_TO_FILE: bool('false'),
  })
  .superRefine((e, ctx) => {
    if (e.NODE_ENV === 'production' && e.JWT_SECRET.includes('change-me')) {
      ctx.addIssue({ code: 'custom', path: ['JWT_SECRET'], message: 'JWT_SECRET still has the example value' });
    }
  });

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/**
 * Validated environment. Parsed lazily (so `next build` works without secrets)
 * and throws on first use if anything required is missing or invalid; there are
 * deliberately no fallback secrets or credentials.
 */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(emptyToUndefined(process.env));
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Test helper: forget the cached environment so it is re-read. */
export function resetEnvCache(): void {
  cached = null;
}

function emptyToUndefined(src: NodeJS.ProcessEnv): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(src)) out[k] = v === '' ? undefined : v;
  return out;
}

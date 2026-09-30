import * as mssql from 'mssql';
import { getEnv } from './env';
import { logger } from './logger';

export type ConnectionPool = mssql.ConnectionPool;
export type IRecordSet<T = Record<string, unknown>> = mssql.IRecordSet<T>;
export type IProcedureResult<T = unknown> = mssql.IProcedureResult<T>;

export type { mssql as sqlTypes };

export const sql = mssql;

let poolPromise: Promise<mssql.ConnectionPool> | null = null;

function buildConfig(): mssql.config {
  const env = getEnv();
  return {
    server: env.SQLSERVER_HOST,
    port: env.SQLSERVER_INSTANCE ? undefined : env.SQLSERVER_PORT,
    database: env.SQLSERVER_DATABASE,
    user: env.SQLSERVER_USER,
    password: env.SQLSERVER_PASSWORD,
    connectionTimeout: 15_000,
    requestTimeout: 30_000,
    options: {
      instanceName: env.SQLSERVER_INSTANCE,
      encrypt: env.SQLSERVER_ENCRYPT,
      trustServerCertificate: env.SQLSERVER_TRUST,
      enableArithAbort: true,
      appName: 'gpcl-finance-service',
    },
    pool: {
      max: env.DB_POOL_MAX,
      min: 0,
      idleTimeoutMillis: 30_000,
    },
  };
}

/**
 * Returns the shared connection pool. Concurrent callers share one in-flight
 * connect; a failed connect is not cached so the next call retries.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- routes consume untyped recordsets
export async function getDb(): Promise<any> {
  if (!poolPromise) {
    const pool = new mssql.ConnectionPool(buildConfig());
    pool.on('error', (err) => {
      logger.error('SQL Server pool error', { error: err instanceof Error ? err.message : String(err) });
    });
    poolPromise = pool.connect().catch((err) => {
      poolPromise = null;
      throw err;
    });
  }
  return poolPromise;
}

/** Closes the pool (graceful shutdown / tests). */
export async function closeDb(): Promise<void> {
  const p = poolPromise;
  poolPromise = null;
  if (p) {
    try {
      await (await p).close();
    } catch {
      // already closed or never connected
    }
  }
}

/** Cheap connectivity probe for health checks. */
export async function pingDb(timeoutMs = 3000): Promise<boolean> {
  try {
    const db = await withTimeout(getDb(), timeoutMs);
    await withTimeout(db.request().query('SELECT 1 AS ok'), timeoutMs);
    return true;
  } catch {
    return false;
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- callers pick the row type
export async function query<T = any>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T> {
  const db = await getDb();
  const request = db.request();
  let queryStr = '';
  strings.forEach((s, i) => {
    queryStr += s;
    if (i < values.length) {
      const paramName = `p${i}`;
      request.input(paramName, values[i]);
      queryStr += `@${paramName}`;
    }
  });
  const result = await request.query(queryStr);
  return result.recordset as T;
}

import type * as sqlTypes from 'mssql';
import { env } from './env';

export type ConnectionPool = sqlTypes.ConnectionPool;
export type IRecordSet<T = Record<string, unknown>> = sqlTypes.IRecordSet<T>;
export type IProcedureResult<T = unknown> = sqlTypes.IProcedureResult<T>;

export type { sqlTypes };

let sqlModule: any = null;
if (typeof window === 'undefined') {
  // eslint-disable-next-line global-require
  sqlModule = require('mssql');
}

export const sql = sqlModule;

declare namespace sql {
  export type Request = sqlTypes.Request;
  export type Transaction = sqlTypes.Transaction;
  export type ConnectionPool = sqlTypes.ConnectionPool;
  export type IResult<T = Record<string, unknown>> = sqlTypes.IResult<T>;
}

const config: any = {
  server: env.SQLSERVER_HOST,
  database: env.SQLSERVER_DATABASE,
  user: env.SQLSERVER_USER,
  password: env.SQLSERVER_PASSWORD,
  options: {
    instanceName: env.SQLSERVER_INSTANCE,
    encrypt: env.SQLSERVER_ENCRYPT,
    trustServerCertificate: env.SQLSERVER_TRUST,
    enableArithAbort: true,
  },
  pool: {
    max: 20,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool: any = null;

export async function getDb(): Promise<any> {
  if (pool && pool.connected) return pool;
  pool = await new sqlModule.ConnectionPool(config).connect();
  return pool;
}

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

import { getDb } from '@/lib/db';
import sql from 'mssql';

export interface SystemSettingsConfig {
  companyName: string;
  tin: string;
  currency: string;
  fyStart: string;
  vatRate: number;
  nhilRate: number;
  getfundRate: number;
  whtRate: number;
  tolerance: number;
  autoPostGrn: boolean;
  allowOverdue: boolean;
  jwtTimeout: number;
  rateLimit: number;
}

const defaultSettings: SystemSettingsConfig = {
  companyName: 'Ghana Publishing Company Limited (GPCL)',
  tin: 'C0014892014',
  currency: 'GHS (Ghanaian Cedi)',
  fyStart: 'January 1',
  vatRate: 15.0,
  nhilRate: 2.5,
  getfundRate: 2.5,
  whtRate: 7.5,
  tolerance: 0.001,
  autoPostGrn: true,
  allowOverdue: false,
  jwtTimeout: 8,
  rateLimit: 100,
};

type SettingKey = keyof SystemSettingsConfig;

// Database keys/types as seeded by migration 007.
const STORAGE: Record<SettingKey, { key: string; type: string }> = {
  companyName: { key: 'company_name', type: 'company' },
  tin: { key: 'company_tin', type: 'company' },
  currency: { key: 'company_currency', type: 'company' },
  fyStart: { key: 'fy_start_month', type: 'company' },
  vatRate: { key: 'tax_vat_rate', type: 'tax' },
  nhilRate: { key: 'tax_nhil_rate', type: 'tax' },
  getfundRate: { key: 'tax_getfund_rate', type: 'tax' },
  whtRate: { key: 'tax_wht_rate', type: 'tax' },
  tolerance: { key: 'gl_imbalance_tolerance', type: 'accounting' },
  autoPostGrn: { key: 'gl_autopost_grn', type: 'accounting' },
  allowOverdue: { key: 'gl_allow_overdue', type: 'accounting' },
  jwtTimeout: { key: 'jwt_timeout_hours', type: 'security' },
  rateLimit: { key: 'api_rate_limit_per_minute', type: 'security' },
};

const BY_STORAGE_KEY = new Map(Object.entries(STORAGE).map(([field, s]) => [s.key, field as SettingKey]));

function parseValue(field: SettingKey, val: string): SystemSettingsConfig[SettingKey] {
  const def = defaultSettings[field];
  if (typeof def === 'boolean') return val === 'true' || val === '1';
  if (typeof def === 'number') {
    const n = parseFloat(val);
    return Number.isFinite(n) ? n : def;
  }
  return val;
}

export async function getSystemSettings(): Promise<SystemSettingsConfig> {
  const db = await getDb();
  const result = await db.request().query('SELECT SettingKey, SettingValue FROM SystemSettings');
  const config: Record<string, unknown> = { ...defaultSettings };
  for (const row of result.recordset as { SettingKey: string; SettingValue: string }[]) {
    const field = BY_STORAGE_KEY.get(row.SettingKey);
    if (field) config[field] = parseValue(field, row.SettingValue);
  }
  return config as unknown as SystemSettingsConfig;
}

/** Saves known settings only; unknown keys (including gl.* account mappings) are ignored. */
export async function updateSystemSettings(newSettings: Record<string, unknown>, userId: number) {
  const db = await getDb();
  for (const field of Object.keys(STORAGE) as SettingKey[]) {
    const val = newSettings[field];
    if (val === undefined || val === null) continue;
    if (typeof defaultSettings[field] === 'number' && !Number.isFinite(Number(val))) continue;
    const { key, type } = STORAGE[field];
    await db.request()
      .input('key', sql.NVarChar, key)
      .input('val', sql.NVarChar, String(val))
      .input('type', sql.NVarChar, type)
      .input('userId', sql.Int, userId)
      .query(`
        IF EXISTS (SELECT 1 FROM SystemSettings WHERE SettingKey = @key)
          UPDATE SystemSettings SET SettingValue = @val, UpdatedAt = GETDATE(), UpdatedBy = @userId WHERE SettingKey = @key
        ELSE
          INSERT INTO SystemSettings (SettingKey, SettingValue, SettingType, UpdatedAt, UpdatedBy)
          VALUES (@key, @val, @type, GETDATE(), @userId)
      `);
  }
  return getSystemSettings();
}

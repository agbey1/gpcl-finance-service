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

export async function getSystemSettings(): Promise<SystemSettingsConfig> {
  try {
    const db = await getDb();
    const result = await db.request().query('SELECT SettingKey, SettingValue FROM SystemSettings');

    const config: any = { ...defaultSettings };
    if (result.recordset) {
      result.recordset.forEach((row: any) => {
        const key = row.SettingKey;
        const val = row.SettingValue;

        if (key in defaultSettings) {
          if (typeof defaultSettings[key as keyof SystemSettingsConfig] === 'boolean') {
            config[key] = val === 'true' || val === '1';
          } else if (typeof defaultSettings[key as keyof SystemSettingsConfig] === 'number') {
            const parsed = parseFloat(val);
            config[key] = isNaN(parsed) ? defaultSettings[key as keyof SystemSettingsConfig] : parsed;
          } else {
            config[key] = val;
          }
        }
      });
    }

    return config;
  } catch (err) {
    console.error('Failed to load system settings from DB, using defaults:', err);
    return defaultSettings;
  }
}

export async function updateSystemSettings(newSettings: Partial<SystemSettingsConfig>, userId: number) {
  const db = await getDb();

  for (const [key, val] of Object.entries(newSettings)) {
    if (val === undefined || val === null) continue;
    const strVal = String(val);

    await db.request()
      .input('key', sql.NVarChar, key)
      .input('val', sql.NVarChar, strVal)
      .input('userId', sql.Int, userId)
      .query(`
        IF EXISTS (SELECT 1 FROM SystemSettings WHERE SettingKey = @key)
          UPDATE SystemSettings
          SET SettingValue = @val, UpdatedAt = GETDATE(), UpdatedBy = @userId
          WHERE SettingKey = @key
        ELSE
          INSERT INTO SystemSettings (SettingKey, SettingValue, UpdatedAt, UpdatedBy)
          VALUES (@key, @val, GETDATE(), @userId)
      `);
  }

  return getSystemSettings();
}

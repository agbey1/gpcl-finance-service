-- Migration 012: record when each user last signed in.
IF COL_LENGTH('dbo.Users', 'LastLoginAt') IS NULL
  ALTER TABLE dbo.Users ADD LastLoginAt DATETIME2 NULL;

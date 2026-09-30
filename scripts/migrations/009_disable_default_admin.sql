-- Migration 009: disable the default administrator if it still has the
-- published default password ("Password123!", documented in earlier releases).
-- Create or reset an administrator with: npm run create-admin
UPDATE Users
SET IsActive = 0, UpdatedAt = GETDATE()
WHERE Email = 'admin@gpcl.com'
  AND PasswordHash = '$2b$12$8s4Mq2jHRSa3rDjhkAKJuO0pHqk2yb5Oi.EOciq.dMgtZ7d8iqY/u'
  AND IsActive = 1;

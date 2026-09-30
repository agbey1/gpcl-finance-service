// Test-only configuration. Real deployments must supply their own values.
process.env.JWT_SECRET ??= 'test-only-jwt-secret-with-at-least-32-characters';
process.env.SQLSERVER_HOST ??= 'localhost';
process.env.SQLSERVER_DATABASE ??= 'gpcl_finance_test';
process.env.SQLSERVER_USER ??= 'test';
process.env.SQLSERVER_PASSWORD ??= 'test';

-- Migration 008: permissions introduced by the production-hardening release.
--   admin.users.manage       user administration (previously open to any signed-in user)
--   finance.invoices.void    voiding invoices (previously covered by finance.invoices.create)
--   accounting.journal.view  journal query endpoint
--   accounting.accounts.*    chart-of-accounts maintenance
-- ADMIN / SUPER_ADMIN roles are always granted everything by role, so these rows
-- matter for the other roles and for the Roles admin screen.

IF OBJECT_ID('dbo.RolePermissions', 'U') IS NOT NULL
BEGIN
    DECLARE @grants TABLE (RoleName NVARCHAR(100), PermissionId NVARCHAR(100));
    INSERT INTO @grants (RoleName, PermissionId) VALUES
        ('ADMIN', 'admin.users.manage'),
        ('ADMIN', 'finance.invoices.void'),
        ('ADMIN', 'accounting.journal.view'),
        ('ADMIN', 'accounting.accounts.create'),
        ('ADMIN', 'accounting.accounts.update'),
        ('SENIOR_ACCOUNTANT', 'finance.invoices.void'),
        ('SENIOR_ACCOUNTANT', 'accounting.journal.view'),
        ('AUDITOR', 'accounting.journal.view');

    INSERT INTO RolePermissions (RoleName, PermissionId)
    SELECT g.RoleName, g.PermissionId
    FROM @grants g
    WHERE EXISTS (SELECT 1 FROM Roles r WHERE r.Name = g.RoleName)
      AND NOT EXISTS (
          SELECT 1 FROM RolePermissions rp
          WHERE rp.RoleName = g.RoleName AND rp.PermissionId = g.PermissionId
      );
END;

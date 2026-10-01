-- Migration 011: let a role rename carry its permissions with it.
-- RolePermissions.RoleName references Roles.Name; without ON UPDATE CASCADE
-- renaming a role that has permissions is rejected by the foreign key.
IF EXISTS (
  SELECT 1 FROM sys.foreign_keys
  WHERE name = 'FK_RolePermissions_Roles' AND update_referential_action_desc <> 'CASCADE'
)
BEGIN
  ALTER TABLE dbo.RolePermissions DROP CONSTRAINT FK_RolePermissions_Roles;
  ALTER TABLE dbo.RolePermissions ADD CONSTRAINT FK_RolePermissions_Roles
    FOREIGN KEY (RoleName) REFERENCES dbo.Roles(Name) ON DELETE CASCADE ON UPDATE CASCADE;
END;

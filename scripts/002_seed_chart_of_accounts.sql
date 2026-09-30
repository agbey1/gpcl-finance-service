-- ============================================================================
-- GPCL Standalone Finance Service - Chart of Accounts Seed Data
-- Database: gpcl_finance_db
-- ============================================================================

USE gpcl_finance_db;
GO

-- Insert default Chart of Accounts
MERGE INTO Accounts AS target
USING (VALUES
    -- ASSETS (1000 - 1999)
    ('1001', 'Main Cash Account', 'ASSET', 0),
    ('1002', 'GCB Bank - Operating Account', 'ASSET', 0),
    ('1003', 'Ecobank - Operational Account', 'ASSET', 0),
    ('1100', 'Trade Receivables (Accounts Receivable)', 'ASSET', 1),
    ('1201', 'Finished Goods Inventory', 'ASSET', 1),
    ('1202', 'Materials Store Inventory', 'ASSET', 1),
    ('1202-QC', 'Materials QC Hold Inventory', 'ASSET', 1),
    ('1500', 'Plant & Equipment Assets', 'ASSET', 0),
    
    -- LIABILITIES (2000 - 2999)
    ('2001', 'Accounts Payable / Trade Payables', 'LIABILITY', 1),
    ('2100', 'VAT Payable (15%)', 'LIABILITY', 0),
    ('2102', 'NHIS Payable (2.5%)', 'LIABILITY', 0),
    ('2103', 'GETFund Payable (2.5%)', 'LIABILITY', 0),
    ('2200', 'WHT Payable Account', 'LIABILITY', 0),
    ('2300', 'PAYE Tax Payable Account', 'LIABILITY', 0),
    
    -- EQUITY (3000 - 3999)
    ('3001', 'Stated Capital / Equity', 'EQUITY', 0),
    ('3002', 'Retained Earnings', 'EQUITY', 0),
    ('3900', 'Opening Balance Contra Clearing Account', 'EQUITY', 0),
    
    -- REVENUE (4000 - 4999)
    ('4001', 'Commercial Printing Revenue', 'REVENUE', 0),
    ('4100', 'Gazette Publication Revenue', 'REVENUE', 0),
    ('4200', 'Sales Returns & Allowances', 'REVENUE', 0),
    
    -- EXPENSE (5000 - 6999)
    ('5001', 'Cost of Goods Sold (COGS)', 'EXPENSE', 0),
    ('6100', 'Salaries & Wages Expense', 'EXPENSE', 0),
    ('6150', 'Freight & Handling Expense', 'EXPENSE', 0),
    ('6200', 'Scrap, Waste & Loss Expense', 'EXPENSE', 0),
    ('6300', 'Bank Service Charges & Fees', 'EXPENSE', 0),
    ('6400', 'Utilities & Office Expenses', 'EXPENSE', 0)
) AS source (Code, Name, Type, IsControl)
ON target.Code = source.Code
WHEN NOT MATCHED THEN
    INSERT (Code, Name, Type, IsControl, IsActive)
    VALUES (source.Code, source.Name, source.Type, source.IsControl, 1);
GO

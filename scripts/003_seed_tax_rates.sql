-- ============================================================================
-- GPCL Standalone Finance Service - Statutory Tax Rates Seed Data
-- Database: gpcl_finance_db
-- ============================================================================

USE gpcl_finance_db;
GO

-- 1. Seed Statutory Ghana PAYE Tax Bands for 2026
INSERT INTO PAYEBands (EffectiveYear, BandOrder, LowerInclusive, UpperExclusive, Rate)
VALUES 
    (2026, 1, 0.00, 490.00, 0.0000),         -- First GHS 490 @ 0%
    (2026, 2, 490.00, 600.00, 0.0500),       -- Next GHS 110 @ 5%
    (2026, 3, 600.00, 730.00, 0.1000),       -- Next GHS 130 @ 10%
    (2026, 4, 730.00, 3896.67, 0.1750),      -- Next GHS 3,166.67 @ 17.5%
    (2026, 5, 3896.67, 19896.67, 0.2500),    -- Next GHS 16,000 @ 25%
    (2026, 6, 19896.67, 50416.67, 0.3000),   -- Next GHS 30,520 @ 30%
    (2026, 7, 50416.67, NULL, 0.3500);       -- Exceeding GHS 50,416.67 @ 35%
GO

-- 2. Seed Ghana Withholding Tax (WHT) Rates for 2026
INSERT INTO WHTRates (EffectiveYear, PayeeType, Description, Rate, IsActive)
VALUES 
    (2026, 'SERVICES_RESIDENT', 'Services rendered by resident individuals/companies', 0.0500, 1),
    (2026, 'SERVICES_NONRESIDENT', 'Services rendered by non-resident entities', 0.2000, 1),
    (2026, 'CONTRACTOR', 'Works & civil construction contracts', 0.0500, 1),
    (2026, 'GOODS_SUPPLY', 'Supply of goods & raw materials', 0.0300, 1),
    (2026, 'RENT_COMMERCIAL', 'Commercial property rent', 0.1500, 1),
    (2026, 'RENT_RESIDENTIAL', 'Residential property rent', 0.0800, 1),
    (2026, 'DIRECTORS_FEES', 'Directors fees & allowances', 0.2000, 1),
    (2026, 'DIVIDENDS', 'Dividend payments', 0.0800, 1),
    (2026, 'ROYALTY', 'Royalty payments', 0.1500, 1),
    (2026, 'INTEREST_NONBANK', 'Interest paid to non-bank entities', 0.0800, 1);
GO

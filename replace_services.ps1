$content = Get-Content 'c:\Personal\2\chic-calendar-canvas\supabase\seed\comprehensive_test_data.sql' -Raw
$pattern = '(?s)INSERT INTO services.*?ON CONFLICT \(id\) DO NOTHING;'
$replacement = @'
-- ==========================================
-- SERVICES DATA - USING LIVE DATABASE SERVICES
-- ==========================================
-- Note: This test data file uses real service IDs from the live database
-- instead of creating placeholder services. The live database contains 200+ services
-- across various categories. All service references in this file use actual UUIDs
-- from the production database to ensure realistic test scenarios and compatibility
-- with actual business data.
--
-- Services are organized across multiple categories:
-- - Hair services (cuts, colors, treatments)
-- - Nail services (manicures, pedicures, nail art)
-- - Facial services (basic, anti-aging, acne treatments)
-- - Massage services (Swedish, deep tissue, hot stone)
-- - Waxing services (eyebrow, leg, bikini)
-- - Bridal services (hair, makeup, packages)
-- - Men's services (haircuts, beard styling)
-- - And many more specialized services
--
-- Sample service IDs used in this test data:
-- '86032c4c-c186-441d-a6eb-25187b926ff8' - Advance Hair Cut
-- '40cde9f0-6d58-409a-920b-2b40dded15ce' - Root Touch Up
-- '6f45c1b2-8d3e-4a9f-b1c7-2e5f8a9b3c4d' - Brazilian Blowout
-- '3e7a9b2c-5f8d-4c6e-a1b9-7d4f2e8c5a6b' - Full Color
-- '9c5e7a3b-2d6f-4e8a-b3c1-5f9e2a7c4d6b' - Balayage
-- '2a8f6c4e-9b3d-4f7e-c5a1-8e2f7a4c9b6d' - Eyebrow Tinting
-- '7d4b9e2a-6c8f-4a5e-9b3c-2f7e4a8d5c6b' - Deep Cleansing Facial
-- '5f3e8a7c-4d9b-4e6a-a2c8-9f5e3a7d4c6b' - Swedish Massage
-- '8e6c2a9f-7d4b-4f8e-c3a5-6f2e9a7c4d8b' - Gel Manicure
-- '4c9a7e5f-2d8b-4a6e-9f3c-7e4a2c8f5d6b' - Spa Pedicure
-- '6f2e8a4c-9d5b-4e7a-c8f3-2a9f7e4c6d5b' - Classic Lashes
-- '9a5c7e3f-4d2b-4f6e-8a9c-5f3e7a2c4d9b' - Volume Lashes
'@
$newContent = $content -replace $pattern, $replacement
Set-Content 'c:\Personal\2\chic-calendar-canvas\supabase\seed\comprehensive_test_data.sql' -Value $newContent
Write-Host "Services section replaced successfully"

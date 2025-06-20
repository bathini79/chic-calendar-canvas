-- =====================================================================
-- PROFILES TEST DATA MIGRATION
-- Created: 2025-01-21
-- Purpose: Insert profiles records that correspond to auth.users
-- This must run AFTER auth users migration and BEFORE comprehensive test data
-- =====================================================================

BEGIN;

-- Set timezone for consistent timestamps
SET timezone = 'UTC';

-- =====================================================================
-- PROFILES - Employee and Customer Profile Records
-- These profiles reference the auth.users IDs via the user_id column
-- The employees table references these profiles via auth_id -> profiles.user_id
-- =====================================================================

INSERT INTO profiles (
    id, user_id, phone_number, phone_verified, full_name, lead_source,
    role, wallet_balance, communication_consent, communication_channel, visit_count
) VALUES
-- Employee Profiles (user_id matches auth.users.id, used by employees.auth_id)
('e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', 'e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', '+1234567890', true, 'Sarah Johnson', 'direct', 'employee', 0.00, true, 'email', 0),
('e2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c7', 'e2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c7', '+1234567891', true, 'Emily Rodriguez', 'direct', 'employee', 0.00, true, 'email', 0),
('e3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c8', 'e3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c8', '+1234567892', true, 'Michael Chen', 'direct', 'employee', 0.00, true, 'email', 0),
('e4a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c9', 'e4a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c9', '+1234567893', true, 'Jessica Martinez', 'direct', 'employee', 0.00, true, 'email', 0),
('e5a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d0', 'e5a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d0', '+1234567894', true, 'David Thompson', 'direct', 'employee', 0.00, true, 'email', 0),
('e6a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d1', 'e6a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d1', '+1234567895', true, 'Alex Rivera', 'direct', 'employee', 0.00, true, 'email', 0),
('e7a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d2', 'e7a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d2', '+1234567896', true, 'Maria Gonzalez', 'direct', 'employee', 0.00, true, 'email', 0),

-- Customer Profiles (user_id matches auth.users.id)
('c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', '+1555111001', true, 'Olivia Thompson', 'google', 'customer', 0.00, true, 'email', 8),
('c2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c7', 'c2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c7', '+1555111002', true, 'James Wilson', 'referral', 'customer', 15.25, true, 'sms', 12),
('c3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c8', 'c3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c8', '+1555111003', true, 'Sophia Brown', 'instagram', 'customer', 0.00, true, 'whatsapp', 3),
('c4a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c9', 'c4a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c9', '+1555111004', true, 'William Davis', 'website', 'customer', 8.75, true, 'email', 6),
('c5a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d0', 'c5a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d0', '+1555111005', true, 'Ava Martinez', 'facebook', 'customer', 22.50, true, 'email', 15),
('c6a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d1', 'c6a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d1', '+1555111006', true, 'Robert Anderson', 'google', 'customer', 5.00, true, 'sms', 4),
('c7a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d2', 'c7a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d2', '+1555111007', true, 'Jennifer Taylor', 'membership', 'customer', 0.00, true, 'email', 9),
('c8a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d3', 'c8a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d3', '+1555111008', true, 'Michael Thomas', 'referral', 'customer', 18.00, true, 'whatsapp', 2),
('c9a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d4', 'c9a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d4', '+1555111009', true, 'Lisa Garcia', 'facebook', 'customer', 60.50, true, 'email', 7),
('c0a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d5', 'c0a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d5', '+1555111010', true, 'Daniel Walker', 'instagram', 'customer', 12.00, true, 'whatsapp', 5)
ON CONFLICT (id) DO NOTHING;

COMMIT;

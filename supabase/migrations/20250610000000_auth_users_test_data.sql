-- =====================================================================
-- AUTH USERS TEST DATA MIGRATION
-- Created: 2025-01-21
-- Purpose: Insert auth.users records for comprehensive test data
-- This must run BEFORE the main comprehensive test data migration
-- =====================================================================

BEGIN;

-- Set timezone for consistent timestamps
SET timezone = 'UTC';

-- =====================================================================
-- AUTH USERS - Employee and Customer Authentication Records
-- =====================================================================

INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at, created_at, updated_at,
    phone_confirmed_at, confirmation_token, recovery_token, email_change_token_new,
    email_change, phone, phone_change, phone_change_token, email_change_token_current,
    email_change_confirm_status, banned_until, deleted_at
) VALUES 
-- Employee Users
('e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', 'sarah.manager@salon.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), NULL, '', '', '', '', '+1234567890', '', '', '', 0, NULL, NULL),
('e2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c7', 'emily.stylist@salon.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), NULL, '', '', '', '', '+1234567891', '', '', '', 0, NULL, NULL),
('e3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c8', 'mike.colorist@salon.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), NULL, '', '', '', '', '+1234567892', '', '', '', 0, NULL, NULL),
('e4a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c9', 'jessica.receptionist@salon.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), NULL, '', '', '', '', '+1234567893', '', '', '', 0, NULL, NULL),
('e5a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d0', 'david.assistant@salon.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), NULL, '', '', '', '', '+1234567894', '', '', '', 0, NULL, NULL),
-- Additional employees for Downtown Branch
('e6a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d1', 'alex.downtown@salon.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), NULL, '', '', '', '', '+1234567895', '', '', '', 0, NULL, NULL),
('e7a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d2', 'maria.downtown@salon.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), NULL, '', '', '', '', '+1234567896', '', '', '', 0, NULL, NULL),

-- Customer Users (expanded)
('c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', 'olivia.regular@email.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), NULL, '', '', '', '', '+1555111001', '', '', '', 0, NULL, NULL),
('c2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c7', 'james.vip@email.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), NULL, '', '', '', '', '+1555111002', '', '', '', 0, NULL, NULL),
('c3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c8', 'sophia.new@email.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), NULL, '', '', '', '', '+1555111003', '', '', '', 0, NULL, NULL),
('c4a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c9', 'william.loyal@email.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), NULL, '', '', '', '', '+1555111004', '', '', '', 0, NULL, NULL),
('c5a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d0', 'ava.premium@email.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), NULL, '', '', '', '', '+1555111005', '', '', '', 0, NULL, NULL),
-- Additional customers for reporting data
('c6a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d1', 'robert.frequent@email.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), NULL, '', '', '', '', '+1555111006', '', '', '', 0, NULL, NULL),
('c7a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d2', 'jennifer.member@email.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), NULL, '', '', '', '', '+1555111007', '', '', '', 0, NULL, NULL),
('c8a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d3', 'michael.referral@email.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), NULL, '', '', '', '', '+1555111008', '', '', '', 0, NULL, NULL),
('c9a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d4', 'lisa.downtown@email.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), NULL, '', '', '', '', '+1555111009', '', '', '', 0, NULL, NULL),
('c0a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d5', 'daniel.walker@email.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), NULL, '', '', '', '', '+1555111010', '', '', '', 0, NULL, NULL);

COMMIT;

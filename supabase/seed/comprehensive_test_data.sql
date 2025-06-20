-- Comprehensive Test Data for Salon System
-- This file creates extensive test data for all reporting and business scenarios
-- Uses REAL service IDs from the live database instead of creating placeholder services
-- Run this after the basic seed data to populate with comprehensive test scenarios

SET session_replication_role = replica;

-- Clear existing test data (preserve the admin user and basic setup)
TRUNCATE TABLE appointment_services CASCADE;
TRUNCATE TABLE appointments CASCADE;
TRUNCATE TABLE bookings CASCADE;
TRUNCATE TABLE loyalty_points CASCADE;
TRUNCATE TABLE payment_transactions CASCADE;
TRUNCATE TABLE coupons CASCADE;
TRUNCATE TABLE memberships CASCADE;
TRUNCATE TABLE membership_sales CASCADE;
TRUNCATE TABLE employee_locations CASCADE;
DELETE FROM profiles WHERE role != 'admin';
DELETE FROM employees WHERE auth_id != (SELECT id FROM auth.users WHERE email LIKE '%admin%' LIMIT 1);

-- ==========================================
-- EMPLOYMENT TYPES & BUSINESS SETUP
-- ==========================================

-- Add more employment types with proper JSON array permissions
INSERT INTO employment_types (id, name, description, is_configurable, permissions, created_at, updated_at) VALUES
('e1-senior-stylist', 'Senior Stylist', 'Experienced stylist with advanced skills', true, '["can_book", "can_modify", "commission_rate_0.6"]', NOW(), NOW()),
('e2-junior-stylist', 'Junior Stylist', 'Entry-level stylist', true, '["can_book", "commission_rate_0.4"]', NOW(), NOW()),
('e3-nail-tech', 'Nail Technician', 'Specialized in nail services', true, '["can_book", "can_modify", "commission_rate_0.5"]', NOW(), NOW()),
('e4-massage-therapist', 'Massage Therapist', 'Licensed massage therapist', true, '["can_book", "can_modify", "commission_rate_0.55"]', NOW(), NOW()),
('e5-receptionist', 'Receptionist', 'Front desk and booking staff', true, '["can_book", "commission_rate_0.0"]', NOW(), NOW()),
('e6-esthetician', 'Esthetician', 'Skin care specialist', true, '["can_book", "can_modify", "commission_rate_0.5"]', NOW(), NOW()),
('e7-barber', 'Barber', 'Men\'s grooming specialist', true, '["can_book", "can_modify", "commission_rate_0.55"]', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- AUTH USERS FOR EMPLOYEES
-- ==========================================

-- Create deterministic auth users for employees
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at) VALUES
('a0000000-0001-0000-0000-000000000001', 'sarah.wilson@salon.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW()),
('a0000000-0002-0000-0000-000000000002', 'mike.johnson@salon.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW()),
('a0000000-0003-0000-0000-000000000003', 'emily.davis@salon.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW()),
('a0000000-0004-0000-0000-000000000004', 'jessica.brown@salon.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW()),
('a0000000-0005-0000-0000-000000000005', 'alex.martinez@salon.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW()),
('a0000000-0006-0000-0000-000000000006', 'lisa.garcia@salon.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW()),
('a0000000-0007-0000-0000-000000000007', 'david.lee@salon.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW()),
('a0000000-0008-0000-0000-000000000008', 'rachel.kim@salon.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW()),
('a0000000-0009-0000-0000-000000000009', 'james.taylor@salon.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW()),
('a0000000-0010-0000-0000-000000000010', 'maria.lopez@salon.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW())
e1-senior-stylist', true, 'percentage', NULL),
('emp-rachel-white', 'Rachel White', 'rachel.white@salon.com', '555-0108', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200', 'active', NOW(), NOW(), 'receptionist', 'a0000000-0008-0000-0000-000000000008', 'e5-receptionist', false, NULL, NULL),
('emp-tom-harris', 'Tom Harris', 'tom.harris@salon.com', '555-0109', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200', 'active', NOW(), NOW(), 'stylist', 'a0000000-0009-0000-0000-000000000009', 'e2-junior-stylist', true, 'percentage', NULL),-- Nina Clark - Nail Technician (Waxing services)
('emp-nina-clark', 'Nina Clark', 'nina.clark@salon.com', '555-0110', 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=200', 'active', NOW(), NOW(), 'nail_technician', 'a0000000-0010-0000-0000-000000000010', 'e3-nail-tech', true, 'percentage', NULL)7bed3b32450', NOW()), -- Full Arms Waxing
ON CONFLICT (id) DO NOTHING;9-4a8b-bf82-8e71a3815b84', NOW()), -- Full Hands Waxing
0ffd8ca35d3', NOW()) -- Fruit Facial-9d31a2f6331b', NOW()), -- Hair Wash (Short)
-- ==========================================('emp-tom-harris', 'e253f6af-94a0-44aa-b635-79fd21b3aec0', NOW()), -- Blow Dry (Short)
-- EMPLOYEE LOCATION ASSIGNMENTS
-- ==========================================

-- Get the first available location and assign all employees to it
-- This assumes there's at least one location in the database
INSERT INTO employee_locations (employee_id, location_id, created_at, updated_at)
SELECT 
    emp.id,
    (SELECT id FROM locations WHERE status = 'active' LIMIT 1),
    NOW(),
    NOW()
FROM (VALUES 
    ('emp-sarah-wilson'),
    ('emp-mike-johnson'),-- Downtown Branch employees  
    ('emp-emily-davis'),2f3a4b506', '74ebc8a5-306d-450e-958c-db05c2fb72eb', NOW(), NOW()),
    ('emp-jessica-brown'),fb72eb', NOW(), NOW()),
    ('emp-alex-martinez'),
    ('emp-lisa-garcia'),
    ('emp-david-lee'),306d-450e-958c-db05c2fb72eb', NOW(), NOW());
    ('emp-rachel-white'),
    ('emp-tom-harris'),=====================
    ('emp-nina-clark')
) AS emp(id)=========================
WHERE (SELECT COUNT(*) FROM locations WHERE status = 'active') > 0
ON CONFLICT (employee_id, location_id) DO NOTHING;
ll_name, lead_source, 
-- ==========================================mmunication_channel, visit_count
-- EMPLOYEE SKILLS WITH REAL SERVICE IDs
-- ==========================================-- VIP Customer - High spender
a4b5c6', 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', '+1555111001', true, 'Olivia Williams', 'referral', 'customer', 25.50, true, 'email', 8),
-- Assign skills to employees using REAL service IDs from the live database
-- Hair stylists get hair services, nail techs get appropriate services, etc.
3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c7', '+1555111002', true, 'James Davis', 'google', 'customer', 75.00, true, 'whatsapp', 15),
-- Sarah Wilson - Senior Hair Stylist (Hair cuts, colors, treatments)
INSERT INTO employee_skills (employee_id, service_id, created_at) -- New Customer
SELECT 'emp-sarah-wilson', id, NOW() c8', 'c3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c8', '+1555111003', true, 'Sophia Anderson', 'facebook', 'customer', 0.00, true, 'email', 1),
FROM services 
WHERE id IN (
('emp-sarah-wilson', 'Sarah Wilson', 'sarah.wilson@salon.com', '555-0101', 'https://images.unsplash.com/photo-1494790108755-2616b612b5bc?w=200', 'active', NOW(), NOW(), 'stylist', 'a0000000-0001-0000-0000-000000000001', 'e1-senior-stylist', true, 'percentage', NULL),
('emp-mike-johnson', 'Mike Johnson', 'mike.johnson@salon.com', '555-0102', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200', 'active', NOW(), NOW(), 'stylist', 'a0000000-0002-0000-0000-000000000002', 'e2-junior-stylist', true, 'percentage', NULL),
('emp-emily-davis', 'Emily Davis', 'emily.davis@salon.com', '555-0103', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200', 'active', NOW(), NOW(), 'nail_technician', 'a0000000-0003-0000-0000-000000000003', 'e3-nail-tech', true, 'percentage', NULL),
('emp-jessica-brown', 'Jessica Brown', 'jessica.brown@salon.com', '555-0104', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200', 'active', NOW(), NOW(), 'massage_therapist', 'a0000000-0004-0000-0000-000000000004', 'e4-massage-therapist', true, 'percentage', NULL),
('emp-alex-martinez', 'Alex Martinez', 'alex.martinez@salon.com', '555-0105', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200', 'active', NOW(), NOW(), 'stylist', 'a0000000-0005-0000-0000-000000000005', 'e1-senior-stylist', true, 'percentage', NULL),
('emp-lisa-garcia', 'Lisa Garcia', 'lisa.garcia@salon.com', '555-0106', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200', 'active', NOW(), NOW(), 'esthetician', 'a0000000-0006-0000-0000-000000000006', 'e6-esthetician', true, 'percentage', NULL),
('emp-david-lee', 'David Lee', 'david.lee@salon.com', '555-0107', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200', 'active', NOW(), NOW(), 'barber', 'a0000000-0007-0000-0000-000000000007', 'e7-barber', true, 'percentage', NULL),
('emp-rachel-kim', 'Rachel Kim', 'rachel.kim@salon.com', '555-0108', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200', 'active', NOW(), NOW(), 'stylist', 'a0000000-0008-0000-0000-000000000008', 'e1-senior-stylist', true, 'percentage', NULL),
('emp-james-taylor', 'James Taylor', 'james.taylor@salon.com', '555-0109', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200', 'active', NOW(), NOW(), 'massage_therapist', 'a0000000-0009-0000-0000-000000000009', 'e4-massage-therapist', true, 'percentage', NULL),
('emp-maria-lopez', 'Maria Lopez', 'maria.lopez@salon.com', '555-0110', 'https://images.unsplash.com/photo-1619946794135-5bc917a27793?w=200', 'active', NOW(), NOW(), 'receptionist', 'a0000000-0010-0000-0000-000000000010', 'e5-receptionist', false, 'none', NULL)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- EMPLOYEE LOCATIONS
-- ==========================================

-- Assign all employees to the first available location
INSERT INTO employee_locations (employee_id, location_id, created_at, updated_at)
SELECT 
    e.id,
    (SELECT id FROM locations ORDER BY created_at LIMIT 1) as location_id,
    NOW(),
    NOW()
FROM employees e
WHERE e.id LIKE 'emp-%'
ON CONFLICT (employee_id, location_id) DO NOTHING;

-- ==========================================
-- EMPLOYEE SKILLS WITH REAL SERVICE IDS
-- ==========================================

-- Assign skills to employees using real service IDs from the live database
-- Sarah Wilson - Senior Hair Stylist
INSERT INTO employee_skills (employee_id, service_id, created_at) 
SELECT 'emp-sarah-wilson', id, NOW() FROM services 
WHERE id IN (
    '86032c4c-c186-441d-a6eb-25187b926ff8', -- Advance Hair Cut Short
    '40cde9f0-6d58-409a-920b-2b40dded15ce', -- Root Touch Up Regular
    'e253f6af-94a0-44aa-b635-79fd21b3aec0', -- Blow Dry Short
    '6ced78e7-3cd2-49e2-8424-51eac3fd62be'  -- Hair Smoothening Short
) AND EXISTS (SELECT 1 FROM services WHERE services.id = services.id)
ON CONFLICT (employee_id, service_id) DO NOTHING;

-- Mike Johnson - Junior Stylist
INSERT INTO employee_skills (employee_id, service_id, created_at) 
SELECT 'emp-mike-johnson', id, NOW() FROM services 
WHERE id IN (
    '86032c4c-c186-441d-a6eb-25187b926ff8', -- Advance Hair Cut Short
    'e253f6af-94a0-44aa-b635-79fd21b3aec0', -- Blow Dry Short
INSERT INTO employee_skills (employee_id, service_id) VALUES 
-- Sarah (Manager) - All services
('e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b501', '86032c4c-c186-441d-a6eb-25187b926ff8'), -- Advance Hair Cut Short
('e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b501', '40cde9f0-6d58-409a-920b-2b40dded15ce'), -- Root Touch Up Regular
('e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b501', 'e253f6af-94a0-44aa-b635-79fd21b3aec0'), -- Blow Dry Short
('e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b501', '6ced78e7-3cd2-49e2-8424-51eac3fd62be'), -- Hair Smoothening Short

-- Emily (Senior Stylist) - Hair cuts and styling
('e2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b502', '86032c4c-c186-441d-a6eb-25187b926ff8'), -- Advance Hair Cut Short
('e2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b502', 'e253f6af-94a0-44aa-b635-79fd21b3aec0'), -- Blow Dry Short
('e2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b502', '6ced78e7-3cd2-49e2-8424-51eac3fd62be'), -- Hair Smoothening Short
('e2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b502', 'df7da949-5425-4093-b205-2a5d2ef2a439'), -- Moisturizing Hair Spa Short

-- Michael (Colorist) - All color services
('e3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b503', '40cde9f0-6d58-409a-920b-2b40dded15ce'), -- Root Touch Up Regular
('e3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b503', '53c57f10-6857-4e2e-8e29-f0ffd8ca35d3'), -- Fruit Facial
('e3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b503', 'e253f6af-94a0-44aa-b635-79fd21b3aec0'), -- Blow Dry Short

-- David (Assistant) - Basic services
('e5a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b505', 'df7da949-5425-4093-b205-2a5d2ef2a439'), -- Moisturizing Hair Spa Short
('e5a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b505', 'e253f6af-94a0-44aa-b635-79fd21b3aec0'), -- Blow Dry Short

-- Alex (Downtown Stylist) - All around skills
('e6a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b506', '86032c4c-c186-441d-a6eb-25187b926ff8'), -- Advance Hair Cut Short
('e6a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b506', 'e253f6af-94a0-44aa-b635-79fd21b3aec0'), -- Blow Dry Short
('e6a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b506', '40cde9f0-6d58-409a-920b-2b40dded15ce'), -- Root Touch Up Regular
    '06ec6d22-e0d7-4249-b0fe-1a25e56e986f'  -- Hair Extensions Short
) AND EXISTS (SELECT 1 FROM services WHERE services.id = services.id)
ON CONFLICT (employee_id, service_id) DO NOTHING;

-- Lisa Garcia - Esthetician
INSERT INTO employee_skills (employee_id, service_id, created_at) 
SELECT 'emp-lisa-garcia', id, NOW() FROM services 
WHERE id IN (
    '53c57f10-6857-4e2e-8e29-f0ffd8ca35d3'  -- Fruit Facial
) AND EXISTS (SELECT 1 FROM services WHERE services.id = services.id)
ON CONFLICT (employee_id, service_id) DO NOTHING;

-- David Lee - Barber
INSERT INTO employee_skills (employee_id, service_id, created_at) 
SELECT 'emp-david-lee', id, NOW() FROM services 
WHERE id IN (
    'e62a1f4b-b7a5-435b-99fb-9df8614a2f79', -- Hair Cut Any Style
    '89ee2a54-6529-4a8b-bf82-8e71a3815b84'  -- Full Hands Waxing
) AND EXISTS (SELECT 1 FROM services WHERE services.id = services.id)
ON CONFLICT (employee_id, service_id) DO NOTHING;

-- Rachel Kim - Senior Stylist
INSERT INTO employee_skills (employee_id, service_id, created_at) 
SELECT 'emp-rachel-kim', id, NOW() FROM services 
WHERE id IN (
    '86032c4c-c186-441d-a6eb-25187b926ff8', -- Advance Hair Cut Short
    'e253f6af-94a0-44aa-b635-79fd21b3aec0', -- Blow Dry Short
    '2a0e9efd-08b6-4950-bb88-726877cd4972'  -- Scalp Treatment Female
) AND EXISTS (SELECT 1 FROM services WHERE services.id = services.id)
ON CONFLICT (employee_id, service_id) DO NOTHING;

-- James Taylor - Massage Therapist
INSERT INTO employee_skills (employee_id, service_id, created_at) 
SELECT 'emp-james-taylor', id, NOW() FROM services 
WHERE id IN (
    '924218bb-f7c8-4035-ad02-c75545fefdc1'  -- Classic Massage 45min
) AND EXISTS (SELECT 1 FROM services WHERE services.id = services.id)
ON CONFLICT (employee_id, service_id) DO NOTHING;

-- ==========================================
-- CUSTOMERS FOR APPOINTMENT SCENARIOS
-- ==========================================

-- Create diverse customer profiles for realistic scenarios
INSERT INTO profiles (id, full_name, email, phone, avatar_url, role, created_at, updated_at) VALUES
-- Regular customers
('cust-jennifer-adams', 'Jennifer Adams', 'jennifer.adams@email.com', '555-1001', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150', 'customer', NOW(), NOW()),
('cust-robert-chen', 'Robert Chen', 'robert.chen@email.com', '555-1002', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'customer', NOW(), NOW()),
('cust-maria-gonzalez', 'Maria Gonzalez', 'maria.gonzalez@email.com', '555-1003', 'https://images.unsplash.com/photo-1494790108755-2616b612b5bc?w=150', 'customer', NOW(), NOW()),
('cust-david-smith', 'David Smith', 'david.smith@email.com', '555-1004', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'customer', NOW(), NOW()),
('cust-lisa-white', 'Lisa White', 'lisa.white@email.com', '555-1005', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'customer', NOW(), NOW()),
-- VIP customers
('cust-alexandra-king', 'Alexandra King', 'alexandra.king@email.com', '555-1006', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', 'customer', NOW(), NOW()),
('cust-michael-brown', 'Michael Brown', 'michael.brown@email.com', '555-1007', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'customer', NOW(), NOW()),
-- Walk-in customers
('cust-sarah-johnson', 'Sarah Johnson', 'sarah.johnson@email.com', '555-1008', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', 'customer', NOW(), NOW()),
('cust-kevin-davis', 'Kevin Davis', 'kevin.davis@email.com', '555-1009', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150', 'customer', NOW(), NOW()),
('cust-amanda-wilson', 'Amanda Wilson', 'amanda.wilson@email.com', '555-1010', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', 'customer', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
) AND EXISTS (SELECT 1 FROM services WHERE id = services.id)
ON CONFLICT (employee_id, service_id) DO NOTHING;c4-d5e6-f7a8-b9c0-d1e2f3a4b5d1', '+1555111006', true, 'Robert Johnson', 'google', 'customer', 15.25, true, 'whatsapp', 12),

-- Mike Johnson - Junior Stylist (Basic hair services)e2f3a4b5d2', 'c7a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d2', '+1555111007', true, 'Jennifer Miller', 'referral', 'customer', 85.75, true, 'email', 9),
INSERT INTO employee_skills (employee_id, service_id, created_at)
SELECT 'emp-mike-johnson', id, NOW()5e6-f7a8-b9c0-d1e2f3a4b5d3', '+1555111008', true, 'Michael Wilson', 'referral', 'customer', 35.00, true, 'whatsapp', 4),
FROM services
WHERE id IN (c4-d5e6-f7a8-b9c0-d1e2f3a4b5d4', '+1555111009', true, 'Lisa Garcia', 'facebook', 'customer', 60.50, true, 'email', 7),
    '86032c4c-c186-441d-a6eb-25187b926ff8', -- Advance Hair Cut Short
    'e253f6af-94a0-44aa-b635-79fd21b3aec0', -- Blow Dry Shortb9c0-d1e2f3a4b5d5', 'c0a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d5', '+1555111010', true, 'Daniel Walker', 'instagram', 'customer', 12.00, true, 'whatsapp', 5);
    'e62a1f4b-b7a5-435b-99fb-9df8614a2f79'  -- Hair Cut Any Style
) AND EXISTS (SELECT 1 FROM services WHERE id = services.id)=============================
ON CONFLICT (employee_id, service_id) DO NOTHING;om employees table
==========================
-- Emily Davis - Nail Technician (No specific nail services in current list, assign general services)
INSERT INTO employee_skills (employee_id, service_id, created_at)
SELECT 'emp-emily-davis', id, NOW()full_name, lead_source, 
FROM servicescommunication_channel, visit_count
WHERE id IN () VALUES 
    'f90878fd-e810-4fff-84ff-d7bed3b32450'  -- Full Arms Honey (waxing - closest available)uth_id from employees table
) AND EXISTS (SELECT 1 FROM services WHERE id = services.id)c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', '+1234567890', true, 'Sarah Johnson', 'direct', 'employee', 0.00, true, 'email', 0),
ON CONFLICT (employee_id, service_id) DO NOTHING;
b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c7', '+1234567891', true, 'Emily Rodriguez', 'direct', 'employee', 0.00, true, 'email', 0),
-- Jessica Brown - Massage Therapist
INSERT INTO employee_skills (employee_id, service_id, created_at)b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c8', '+1234567892', true, 'Michael Chen', 'direct', 'employee', 0.00, true, 'email', 0),
SELECT 'emp-jessica-brown', id, NOW()
FROM services4-d5e6-f7a8-b9c0-d1e2f3a4b5c9', '+1234567893', true, 'Jessica Martinez', 'direct', 'employee', 0.00, true, 'email', 0),
WHERE id IN (
    '924218bb-f7c8-4035-ad02-c75545fefdc1'  -- Classic Massage 45min2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d0', '+1234567894', true, 'David Thompson', 'direct', 'employee', 0.00, true, 'email', 0),
) AND EXISTS (SELECT 1 FROM services WHERE id = services.id)
ON CONFLICT (employee_id, service_id) DO NOTHING;2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d1', '+1234567895', true, 'Alex Rivera', 'direct', 'employee', 0.00, true, 'email', 0),

-- Alex Martinez - Senior Colorist3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d2', '+1234567896', true, 'Maria Gonzalez', 'direct', 'employee', 0.00, true, 'email', 0);
INSERT INTO employee_skills (employee_id, service_id, created_at)
SELECT 'emp-alex-martinez', id, NOW()======================================
FROM services
WHERE id IN (
    '40cde9f0-6d58-409a-920b-2b40dded15ce', -- Root Touch Up Regular
    '6ced78e7-3cd2-49e2-8424-51eac3fd62be', -- Hair Smoothening Short
    '06ec6d22-e0d7-4249-b0fe-1a25e56e986f'  -- Hair Extensions Short
) AND EXISTS (SELECT 1 FROM services WHERE id = services.id)DECLARE    customer_ids UUID[] := ARRAY[
ON CONFLICT (employee_id, service_id) DO NOTHING;6-f7a8-b9c0-d1e2f3a4b5c6'::UUID,

-- Lisa Garcia - Esthetician
INSERT INTO employee_skills (employee_id, service_id, created_at)
SELECT 'emp-lisa-garcia', id, NOW()
FROM services
WHERE id IN (        'c7a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d2'::UUID,
    '53c57f10-6857-4e2e-8e29-f0ffd8ca35d3'  -- Fruit Facial-d5e6-f7a8-b9c0-d1e2f3a4b5d3'::UUID,
) AND EXISTS (SELECT 1 FROM services WHERE id = services.id)
ON CONFLICT (employee_id, service_id) DO NOTHING;

-- David Lee - Barber (Men's services)
INSERT INTO employee_skills (employee_id, service_id, created_at)
SELECT 'emp-david-lee', id, NOW()        'df7da949-5425-4093-b205-2a5d2ef2a439', -- Moisturizing Hair Spa (Short)
FROM services94a0-44aa-b635-79fd21b3aec0', -- Blow Dry (Short)
WHERE id IN (
    'e62a1f4b-b7a5-435b-99fb-9df8614a2f79', -- Hair Cut Any Style
    '89ee2a54-6529-4a8b-bf82-8e71a3815b84'  -- Full Hands Waxing
) AND EXISTS (SELECT 1 FROM services WHERE id = services.id)
ON CONFLICT (employee_id, service_id) DO NOTHING;
920b-2b40dded15ce', -- Root Touch Up
-- Tom Harris - Junior Stylist        'df7da949-5425-4093-b205-2a5d2ef2a439', -- Moisturizing Hair Spa
INSERT INTO employee_skills (employee_id, service_id, created_at)', -- Blow Dry
SELECT 'emp-tom-harris', id, NOW()d62be', -- Hair Smoothening
FROM services', -- Hair Extensions
WHERE id IN (        'f90878fd-e810-4fff-84ff-d7bed3b32450', -- Full Arms Waxing
    '86032c4c-c186-441d-a6eb-25187b926ff8', -- Advance Hair Cut Short
    'e253f6af-94a0-44aa-b635-79fd21b3aec0'  -- Blow Dry Short
) AND EXISTS (SELECT 1 FROM services WHERE id = services.id)
ON CONFLICT (employee_id, service_id) DO NOTHING;

-- Nina Clark - Nail Technician
INSERT INTO employee_skills (employee_id, service_id, created_at)
SELECT 'emp-nina-clark', id, NOW()
FROM services := ARRAY[
WHERE id IN (        '86032c4c-c186-441d-a6eb-25187b926ff8', -- Advance Hair Cut (Short)
    'f90878fd-e810-4fff-84ff-d7bed3b32450'  -- Full Arms Honey', -- Advance Hair Cut (Medium) 
) AND EXISTS (SELECT 1 FROM services WHERE id = services.id)346788e6b5', -- Global Hair Color (Short)
ON CONFLICT (employee_id, service_id) DO NOTHING;', -- Global Highlights (Short)
        'cd13aac1-4cc9-4dd8-bd43-69e360a36bc2', -- Classic Manicure
-- ==========================================
-- DIVERSE CUSTOMER PROFILES WITH REFERRALS
-- ==========================================

-- Create customers with referral relationships
INSERT INTO profiles (id, user_id, full_name, phone_number, role, created_at, updated_at, date_of_birth, gender, referrer_id, lead_source) VALUES
-- Primary customers84ff-d7bed3b32450'  -- Full Arms - Honey (Waxing)
('cust-amanda-smith', NULL, 'Amanda Smith', '555-1001', 'customer', NOW() - INTERVAL '2 years', NOW(), '1985-03-15', 'female', NULL, 'website'),    ];  '74ebc8a5-306d-450e-958c-db05c2fb72eb'::UUID
('cust-jennifer-jones', NULL, 'Jennifer Jones', '555-1002', 'customer', NOW() - INTERVAL '18 months', NOW(), '1990-07-22', 'female', 'cust-amanda-smith', 'referral'),
('cust-maria-rodriguez', NULL, 'Maria Rodriguez', '555-1003', 'customer', NOW() - INTERVAL '15 months', NOW(), '1988-11-08', 'female', NULL, 'google_ads'),
('cust-susan-williams', NULL, 'Susan Williams', '555-1004', 'customer', NOW() - INTERVAL '14 months', NOW(), '1982-06-30', 'female', 'cust-amanda-smith', 'referral'),
('cust-linda-brown', NULL, 'Linda Brown', '555-1005', 'customer', NOW() - INTERVAL '13 months', NOW(), '1975-12-12', 'female', NULL, 'facebook'),
('cust-sarah-taylor', NULL, 'Sarah Taylor', '555-1006', 'customer', NOW() - INTERVAL '12 months', NOW(), '1992-04-18', 'female', 'cust-maria-rodriguez', 'referral'),
('cust-nancy-davis', NULL, 'Nancy Davis', '555-1007', 'customer', NOW() - INTERVAL '11 months', NOW(), '1987-09-25', 'female', NULL, 'instagram'),
('cust-betty-wilson', NULL, 'Betty Wilson', '555-1008', 'customer', NOW() - INTERVAL '10 months', NOW(), '1980-01-14', 'female', 'cust-linda-brown', 'referral'),
('cust-helen-moore', NULL, 'Helen Moore', '555-1009', 'customer', NOW() - INTERVAL '9 months', NOW(), '1983-08-07', 'female', NULL, 'phone'),
('cust-donna-jackson', NULL, 'Donna Jackson', '555-1010', 'customer', NOW() - INTERVAL '8 months', NOW(), '1986-05-20', 'female', 'cust-sarah-taylor', 'referral'),

-- Male customers
('cust-john-anderson', NULL, 'John Anderson', '555-1011', 'customer', NOW() - INTERVAL '7 months', NOW(), '1985-02-28', 'male', NULL, 'walk_in'),    service_prices DECIMAL[] := ARRAY[45.00, 65.00, 35.00, 25.00, 120.00, 40.00, 55.00];
('cust-michael-clark', NULL, 'Michael Clark', '555-1012', 'customer', NOW() - INTERVAL '6 months', NOW(), '1978-10-15', 'male', 'cust-john-anderson', 'referral'),
('cust-robert-lewis', NULL, 'Robert Lewis', '555-1013', 'customer', NOW() - INTERVAL '5 months', NOW(), '1992-07-03', 'male', NULL, 'google_maps'),
('cust-james-walker', NULL, 'James Walker', '555-1014', 'customer', NOW() - INTERVAL '4 months', NOW(), '1980-12-22', 'male', 'cust-michael-clark', 'referral'),
('cust-william-hall', NULL, 'William Hall', '555-1015', 'customer', NOW() - INTERVAL '3 months', NOW(), '1975-09-11', 'male', NULL, 'website'),    day_offset INTEGER;

-- Younger demographics
('cust-emily-young', NULL, 'Emily Young', '555-1016', 'customer', NOW() - INTERVAL '2 months', NOW(), '1998-03-08', 'female', 'cust-donna-jackson', 'referral'),    employee_id UUID;
('cust-madison-king', NULL, 'Madison King', '555-1017', 'customer', NOW() - INTERVAL '1 month', NOW(), '2001-06-14', 'female', NULL, 'tiktok'),ocation_id UUID;
('cust-ashley-wright', NULL, 'Ashley Wright', '555-1018', 'customer', NOW() - INTERVAL '3 weeks', NOW(), '1999-11-27', 'female', 'cust-emily-young', 'referral'),vice_id UUID;
('cust-jessica-lopez', NULL, 'Jessica Lopez', '555-1019', 'customer', NOW() - INTERVAL '2 weeks', NOW(), '1996-08-19', 'female', NULL, 'instagram'),L;
('cust-megan-hill', NULL, 'Megan Hill', '555-1020', 'customer', NOW() - INTERVAL '1 week', NOW(), '2000-01-05', 'female', 'cust-madison-king', 'referral')
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- COUPONS AND MEMBERSHIPS
-- ==========================================
oking_id TEXT;
-- Create diverse coupon types
INSERT INTO coupons (id, code, discount_type, discount_value, min_amount, max_discount, expires_at, usage_limit, used_count, is_active, created_at, applicable_services, applicable_categories) VALUES
('coup-welcome-20', 'WELCOME20', 'percentage', 20.00, 50.00, 25.00, NOW() + INTERVAL '6 months', 100, 12, true, NOW() - INTERVAL '3 months', '{}', '{}'),
('coup-summer-50', 'SUMMER50', 'fixed', 50.00, 200.00, 50.00, NOW() + INTERVAL '2 months', 50, 8, true, NOW() - INTERVAL '1 month', '{}', '{}'),R i IN 1..220 LOOP
('coup-loyal-15', 'LOYAL15', 'percentage', 15.00, 75.00, 20.00, NOW() + INTERVAL '1 year', 500, 45, true, NOW() - INTERVAL '6 months', '{}', '{}'),ts over 24 months (-18 to +6)
('coup-referral-25', 'REFERRAL25', 'fixed', 25.00, 100.00, 25.00, NOW() + INTERVAL '3 months', 200, 23, true, NOW() - INTERVAL '2 months', '{}', '{}'),
('coup-birthday-30', 'BIRTHDAY30', 'percentage', 30.00, 80.00, 40.00, NOW() + INTERVAL '1 month', 1000, 67, true, NOW() - INTERVAL '1 month', '{}', '{}'),
('coup-student-10', 'STUDENT10', 'percentage', 10.00, 30.00, 15.00, NOW() + INTERVAL '1 year', 300, 89, true, NOW() - INTERVAL '4 months', '{}', '{}'),
('coup-weekend-35', 'WEEKEND35', 'fixed', 35.00, 150.00, 35.00, NOW() + INTERVAL '2 weeks', 75, 15, true, NOW() - INTERVAL '1 week', '{}', '{}')  
ON CONFLICT (id) DO NOTHING;

-- Create membership types    employee_id := employee_ids[(i % array_length(employee_ids, 1)) + 1];
INSERT INTO memberships (id, name, price, duration_months, services_included, discount_percentage, max_services_per_month, description, is_active, created_at) VALUEScation_ids[(i % array_length(location_ids, 1)) + 1];
('mem-basic', 'Basic Membership', 99.99, 1, 2, 10.00, 4, 'Perfect for regular customers', true, NOW() - INTERVAL '6 months'),ervice_ids[(i % array_length(service_ids, 1)) + 1];
('mem-premium', 'Premium Membership', 179.99, 1, 4, 15.00, 8, 'Best value for frequent visitors', true, NOW() - INTERVAL '6 months'), := service_prices[(i % array_length(service_prices, 1)) + 1];
('mem-luxury', 'Luxury Membership', 299.99, 1, 6, 20.00, 12, 'Ultimate beauty experience', true, NOW() - INTERVAL '6 months'),
('mem-annual-basic', 'Annual Basic', 999.99, 12, 24, 15.00, 4, 'Annual basic plan with extra savings', true, NOW() - INTERVAL '6 months'),time := NOW() + (month_offset || ' months')::INTERVAL + (day_offset || ' days')::INTERVAL + (hour_val || ' hours')::INTERVAL;
('mem-annual-premium', 'Annual Premium', 1799.99, 12, 48, 20.00, 8, 'Annual premium with maximum benefits', true, NOW() - INTERVAL '6 months') := appointment_time + '1 hour'::INTERVAL;
ON CONFLICT (id) DO NOTHING;
ased on time
-- Add membership salesime < NOW() THEN
INSERT INTO membership_sales (id, customer_id, membership_id, start_date, end_date, amount_paid, services_used, is_active, created_at) VALUESus := 'completed';
('ms-001', 'cust-amanda-smith', 'mem-premium', NOW() - INTERVAL '2 months', NOW() + INTERVAL '10 months', 179.99, 2, true, NOW() - INTERVAL '2 months'),ntment_time < NOW() + '7 days'::INTERVAL THEN
('ms-002', 'cust-maria-rodriguez', 'mem-basic', NOW() - INTERVAL '3 weeks', NOW() + INTERVAL '5 weeks', 99.99, 1, true, NOW() - INTERVAL '3 weeks'),tatus := 'confirmed';
('ms-003', 'cust-linda-brown', 'mem-luxury', NOW() - INTERVAL '6 weeks', NOW() + INTERVAL '6 weeks', 299.99, 3, true, NOW() - INTERVAL '6 weeks'),
('ms-004', 'cust-sarah-taylor', 'mem-annual-basic', NOW() - INTERVAL '4 months', NOW() + INTERVAL '8 months', 999.99, 8, true, NOW() - INTERVAL '4 months'),tatus := 'confirmed';
('ms-005', 'cust-jennifer-jones', 'mem-premium', NOW() - INTERVAL '1 month', NOW() + INTERVAL '11 months', 179.99, 1, true, NOW() - INTERVAL '1 month'),
('ms-006', 'cust-helen-moore', 'mem-annual-premium', NOW() - INTERVAL '5 months', NOW() + INTERVAL '7 months', 1799.99, 12, true, NOW() - INTERVAL '5 months'),
('ms-007', 'cust-emily-young', 'mem-basic', NOW() - INTERVAL '2 weeks', NOW() + INTERVAL '6 weeks', 99.99, 0, true, NOW() - INTERVAL '2 weeks'),   -- Apply some membership/loyalty discounts (every 3rd appointment gets discount)
('ms-008', 'cust-donna-jackson', 'mem-premium', NOW() - INTERVAL '7 weeks', NOW() + INTERVAL '5 weeks', 179.99, 2, true, NOW() - INTERVAL '7 weeks')
ON CONFLICT (id) DO NOTHING; := service_price * 0.85; -- 15% discount

-- ==========================================    notes_text := 'Membership discount applied';
-- COMPREHENSIVE APPOINTMENTS WITH REAL SERVICE IDS
-- ==========================================
    deposit_amount := service_price * 0.25;
-- Generate appointments across different time periods, statuses, and scenarios
-- Using REAL service IDs from the live database

DO $$me) || '-' || EXTRACT(month FROM appointment_time);
DECLAREbooking_id := 'bkg-gen-' || LPAD(i::TEXT, 4, '0') || '-svc';
    appointment_id TEXT;
    customer_ids TEXT[] := ARRAY[
        'cust-amanda-smith', 'cust-jennifer-jones', 'cust-maria-rodriguez', 'cust-susan-williams', 
        'cust-linda-brown', 'cust-sarah-taylor', 'cust-nancy-davis', 'cust-betty-wilson',
        'cust-helen-moore', 'cust-donna-jackson', 'cust-john-anderson', 'cust-michael-clark',
        'cust-robert-lewis', 'cust-james-walker', 'cust-william-hall', 'cust-emily-young',apt_id, customer_id, location_id, appointment_time, end_time, appointment_status,
        'cust-madison-king', 'cust-ashley-wright', 'cust-jessica-lopez', 'cust-megan-hill'VAL, appointment_time - '1 day'::INTERVAL, total_amount
    ];
    employee_ids TEXT[] := ARRAY[
        'emp-sarah-wilson', 'emp-mike-johnson', 'emp-emily-davis', 'emp-jessica-brown',ing booking
        'emp-alex-martinez', 'emp-lisa-garcia', 'emp-david-lee', 'emp-tom-harris', 'emp-nina-clark'
    ];    id, appointment_id, service_id, employee_id, price_paid, original_price,
    -- REAL service IDs from live databaseated_at
    service_ids TEXT[] := ARRAY[
        '86032c4c-c186-441d-a6eb-25187b926ff8', -- Advance Hair Cut Shortt_id, service_id, employee_id, total_amount, service_price, appointment_status,
        '40cde9f0-6d58-409a-920b-2b40dded15ce', -- Root Touch Up Regulartment_time - '1 day'::INTERVAL
        'df7da949-5425-4093-b205-2a5d2ef2a439', -- Moisturizing Hair Spa Short
        'e253f6af-94a0-44aa-b635-79fd21b3aec0', -- Blow Dry Short
        '6ced78e7-3cd2-49e2-8424-51eac3fd62be', -- Hair Smoothening Short
        '06ec6d22-e0d7-4249-b0fe-1a25e56e986f', -- Hair Extensions Short0 THEN
        'f90878fd-e810-4fff-84ff-d7bed3b32450', -- Full Arms Honeyvice_id := service_ids[((i + 1) % array_length(service_ids, 1)) + 1];
        '53c57f10-6857-4e2e-8e29-f0ffd8ca35d3', -- Fruit Facial    service_price := service_prices[((i + 1) % array_length(service_prices, 1)) + 1];
        '924218bb-f7c8-4035-ad02-c75545fefdc1', -- Classic Massage 45min
        '2a0e9efd-08b6-4950-bb88-726877cd4972', -- Scalp Treatment Female
        'e62a1f4b-b7a5-435b-99fb-9df8614a2f79', -- Hair Cut Any Style        status, created_at, updated_at
        '89ee2a54-6529-4a8b-bf82-8e71a3815b84'  -- Full Hands Waxing
    ];, apt_id, service_id, employee_id, service_price * 0.9, service_price, appointment_status,
    statuses TEXT[] := ARRAY['completed', 'completed', 'completed', 'completed', 'completed', 'cancelled', 'no_show', 'voided'];'::INTERVAL
    payment_methods TEXT[] := ARRAY['cash', 'credit_card', 'debit_card', 'upi', 'credit_card', 'cash'];
    booking_sources TEXT[] := ARRAY['website', 'phone', 'walk_in', 'app', 'website'];
        -- Update appointment total
    current_customer TEXT;ts 
    current_employee TEXT;l_price + (service_price * 0.9)
    current_service TEXT;
    current_status TEXT;
    current_payment TEXT;
    current_booking_source TEXT;
    appointment_time TIMESTAMP;
    service_price NUMERIC;
    discount_amt NUMERIC;appointments for key scenarios
    final_amt NUMERIC; (
    i INTEGER; start_time, end_time, status, 
BEGINd_at, total_price
    -- Generate 500+ appointments over 2-year period (past and future)
    FOR i IN 1..550 LOOP appointments
        appointment_id := 'apt-gen-' || LPAD(i::TEXT, 4, '0');, 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', '73ebc8a5-306d-450e-958c-db05c2fb72ea', 
         INTERVAL '10 hours', NOW() - INTERVAL '2 days' + INTERVAL '11 hours', 'completed', 
        -- Random selectionsstandard discount', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', 65.00),
        current_customer := customer_ids[1 + (RANDOM() * (array_length(customer_ids, 1) - 1))::INTEGER];
        current_employee := employee_ids[1 + (RANDOM() * (array_length(employee_ids, 1) - 1))::INTEGER];-450e-958c-db05c2fb72ea',
        current_service := service_ids[1 + (RANDOM() * (array_length(service_ids, 1) - 1))::INTEGER]; '2 days' + INTERVAL '14 hours', NOW() + INTERVAL '2 days' + INTERVAL '16 hours', 'confirmed',
        current_status := statuses[1 + (RANDOM() * (array_length(statuses, 1) - 1))::INTEGER];RVAL '1 day', 130.00),
        current_payment := payment_methods[1 + (RANDOM() * (array_length(payment_methods, 1) - 1))::INTEGER];
        current_booking_source := booking_sources[1 + (RANDOM() * (array_length(booking_sources, 1) - 1))::INTEGER];a8-b9c0-d1e2f3a4b5c8', '73ebc8a5-306d-450e-958c-db05c2fb72ea',
        L '1 day' + INTERVAL '10 hours', NOW() + INTERVAL '1 day' + INTERVAL '11 hours', 'confirmed',
        -- Random appointment time (past 2 years to future 6 months)L '2 hours', NOW() - INTERVAL '2 hours', 65.00),
        appointment_time := NOW() - INTERVAL '2 years' + (RANDOM() * INTERVAL '30 months');
        ents
        -- Get service price from real service (fallback to random if service not found)5e6-f7a8-b9c0-d1e2f3a4b5d0', '73ebc8a5-306d-450e-958c-db05c2fb72ea',
        SELECT COALESCE(selling_price, 25.00 + (RANDOM() * 175.00)) INTO service_pricers', 'confirmed',
        FROM services WHERE id = current_service;rs', 176.00),
        
        -- Random discount (0-20% chance of discount)ture-002', 'c9a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d4', '74ebc8a5-306d-450e-958c-db05c2fb72eb',
        discount_amt := CASE L '11 hours', NOW() + INTERVAL '10 days' + INTERVAL '12 hours', 'confirmed',
            WHEN RANDOM() < 0.2 THEN (service_price * (0.05 + RANDOM() * 0.25))) - INTERVAL '1 day', NOW() - INTERVAL '1 day', 85.00);
            ELSE 0 
        END;
        gs (
        final_amt := service_price - discount_amt;
        
        -- Insert appointment
        INSERT INTO appointments (nt week bookings
            id, customer_id, employee_id, service_ids, appointment_date, end_time,ervice IDs)
            status, total_amount, discount_amount, final_amount, payment_method,
            payment_status, notes, created_at, updated_at, booking_source appointment_date, end_time,
        ) VALUES (
            appointment_id,ion_reason,
            current_customer,und_date, booking_source
            current_employee,
            ARRAY[current_service],different reasons
            appointment_time,nda-smith', 'emp-sarah-wilson', ARRAY['86032c4c-c186-441d-a6eb-25187b926ff8'], NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days 1 hour', 'cancelled', 55.00, 0, 55.00, 'credit_card', 'refunded', 'Customer emergency', NOW() - INTERVAL '3 days', NOW(), NOW() - INTERVAL '1 day', 'customer_request', 55.00, NOW() - INTERVAL '1 day', 'website'),
            appointment_time + INTERVAL '60 minutes', -- Default 1 hour duration
            current_status,rodriguez', 'emp-alex-martinez', ARRAY['40cde9f0-6d58-409a-920b-2b40dded15ce'], NOW() + INTERVAL '1 week', NOW() + INTERVAL '1 week 2 hours', 'cancelled', 95.00, 10.00, 85.00, 'debit_card', 'refunded', 'Stylist unavailable', NOW() - INTERVAL '2 days', NOW(), NOW() - INTERVAL '6 hours', 'employee_unavailable', 85.00, NOW() - INTERVAL '6 hours', 'phone'),
            service_price,
            discount_amt,ee', ARRAY['e62a1f4b-b7a5-435b-99fb-9df8614a2f79'], NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days 45 minutes', 'cancelled', 40.00, 0, 40.00, 'cash', 'pending_refund', 'Weather emergency', NOW() - INTERVAL '1 day', NOW(), NOW() - INTERVAL '4 hours', 'weather', 40.00, NULL, 'walk_in'),
            final_amt,
            current_payment,
            CASE WHEN current_status = 'completed' THEN 'completed' ELSE 'pending' END,fff-84ff-d7bed3b32450'], NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '45 minutes', 'no_show', 35.00, 5.00, 30.00, 'upi', 'failed', 'Customer did not arrive', NOW() - INTERVAL '4 days', NOW(), NULL, NULL, 0, NULL, 'mobile_app'),
            'Generated test appointment with real service ID',
            appointment_time - INTERVAL '1 day',2', 'cust-william-hall', 'emp-david-lee', ARRAY['e62a1f4b-b7a5-435b-99fb-9df8614a2f79'], NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week' + INTERVAL '25 minutes', 'no_show', 25.00, 0, 25.00, 'credit_card', 'failed', 'No communication from customer', NOW() - INTERVAL '9 days', NOW(), NULL, NULL, 0, NULL, 'phone'),
            NOW(),
            current_booking_source
        );1', 'cust-betty-wilson', 'emp-jessica-brown', ARRAY['924218bb-f7c8-4035-ad02-c75545fefdc1'], NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '1 hour', 'voided', 75.00, 0, 75.00, 'credit_card', 'voided', 'Payment processing error', NOW() - INTERVAL '5 days', NOW(), NOW() - INTERVAL '3 days', 'payment_error', 75.00, NOW() - INTERVAL '3 days', 'website'),ays', 'website'),
        =================================================================
        -- Insert corresponding appointment_service record for completed appointments-- Partially refunded appointment
        IF current_status = 'completed' THENsarah-wilson', ARRAY['86032c4c-c186-441d-a6eb-25187b926ff8'], NOW() - INTERVAL '1 month', NOW() - INTERVAL '1 month' + INTERVAL '2 hours', 'completed', 120.00, 20.00, 100.00, 'credit_card', 'partially_refunded', 'Service quality issue - partial refund given', NOW() - INTERVAL '32 days', NOW(), NULL, NULL, 30.00, NOW() - INTERVAL '25 days', 'phone');
            INSERT INTO appointment_services (appointment_id, service_id, employee_id, price, discount_amount, final_price, commission_amount, created_at) n, discount_type, discount_value, 
            VALUES (, start_date, end_date, 
                appointment_id,    is_active, created_at, updated_at
                current_service,
                current_employee,
                service_price,elcome-2025-001', 'WELCOME20', 'New Customer Welcome', 'Welcome discount for first-time customers', 'percentage', 20.00, 50.00, 100, 3, 
                discount_amt,tments (
                final_amt,d, employee_id, service_ids, appointment_date, end_time,
                final_amt * 0.15, -- 15% commissionotal_amount, discount_amount, final_amount, payment_method,
                appointment_timeeason, booking_source
            );
        END IF;ual-001', 'cust-helen-moore', 'emp-lisa-garcia', ARRAY['53c57f10-6857-4e2e-8e29-f0ffd8ca35d3'], NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week' + INTERVAL '75 minutes', 'completed', 70.00, 15.00, 55.00, 'cash', 'completed', 'First-time customer discount applied', NOW() - INTERVAL '9 days', NOW(), 'first_time_customer', 'walk_in'),
        
    END LOOP;emp-nina-clark', ARRAY['f90878fd-e810-4fff-84ff-d7bed3b32450'], NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks' + INTERVAL '1 hour', 'completed', 40.00, 8.00, 32.00, 'upi', 'completed', 'Loyalty customer appreciation discount', NOW() - INTERVAL '16 days', NOW(), 'loyalty_discount', 'mobile_app'),
END $$;
ee', ARRAY['89ee2a54-6529-4a8b-bf82-8e71a3815b84', 'e62a1f4b-b7a5-435b-99fb-9df8614a2f79'], NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '45 minutes', 'completed', 45.00, 10.00, 35.00, 'debit_card', 'completed', 'Package deal discount', NOW() - INTERVAL '7 days', NOW(), 'package_deal', 'phone');
-- ==========================================
-- LOYALTY POINTS TRANSACTIONS services for manual discount appointments (using real service IDs)
-- ==========================================amount, created_at) VALUES 
anual-001', '53c57f10-6857-4e2e-8e29-f0ffd8ca35d3', 'emp-lisa-garcia', 70.00, 15.00, 55.00, 22.00, NOW() - INTERVAL '1 week'),
-- Add loyalty points for completed appointments and redemptions weeks'),
INSERT INTO loyalty_points (id, customer_id, transaction_type, points, description, appointment_id, created_at, expires_at) 
SELECT '); INTERVAL '5 days');L '30 days');
    'lp-' || a.id,
    a.customer_id,
    'earned',-- 8. LOYALTY POINTS SYSTEM
    (a.final_amount * 0.1)::INTEGER, -- 1 point per $10 spent==========================================
    'Points earned from appointment',
    a.id,lty program settings for customers (expanded)
    a.appointment_date + INTERVAL '1 hour',
    a.appointment_date + INTERVAL '1 year'
FROM appointments a 
WHERE a.status = 'completed' AND a.final_amount > 0;
('c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', 1250, 'gold', NOW() - INTERVAL '8 months', 2840, NOW() - INTERVAL '8 months', NOW()),
-- Add some redemption transactions, 'platinum', NOW() - INTERVAL '1 year', 4200, NOW() - INTERVAL '1 year', NOW()),
INSERT INTO loyalty_points (id, customer_id, transaction_type, points, description, appointment_id, created_at, expires_at), NOW() - INTERVAL '1 month', 150, NOW() - INTERVAL '1 month', NOW()),
VALUES , 'platinum', NOW() - INTERVAL '2 years', 8500, NOW() - INTERVAL '2 years', NOW()),
('lp-redeem-001', 'cust-amanda-smith', 'redeemed', -50, 'Redeemed for $5 discount', NULL, NOW() - INTERVAL '1 week', NULL),('c5a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d0', 950, 'silver', NOW() - INTERVAL '6 months', 1850, NOW() - INTERVAL '6 months', NOW()),
('lp-redeem-002', 'cust-maria-rodriguez', 'redeemed', -100, 'Redeemed for $10 discount', NULL, NOW() - INTERVAL '2 weeks', NULL),ver', NOW() - INTERVAL '10 months', 1200, NOW() - INTERVAL '10 months', NOW()),
('lp-redeem-003', 'cust-linda-brown', 'redeemed', -75, 'Redeemed for $7.50 discount', NULL, NOW() - INTERVAL '3 weeks', NULL),d1e2f3a4b5d2', 1800, 'gold', NOW() - INTERVAL '1 year', 3200, NOW() - INTERVAL '1 year', NOW()),
('lp-redeem-004', 'cust-emily-young', 'redeemed', -30, 'Redeemed for $3 discount', NULL, NOW() - INTERVAL '1 month', NULL),4 months', 400, NOW() - INTERVAL '4 months', NOW()),
('lp-redeem-005', 'cust-ashley-wright', 'redeemed', -80, 'Redeemed for $8 discount', NULL, NOW() - INTERVAL '5 weeks', NULL); '7 months', 1100, NOW() - INTERVAL '7 months', NOW()),
500, NOW() - INTERVAL '5 months', NOW());
-- Add bonus points promotions
INSERT INTO loyalty_points (id, customer_id, transaction_type, points, description, appointment_id, created_at, expires_at)y points transactions (credits and debits)
VALUES 
('lp-bonus-001', 'cust-jennifer-jones', 'bonus', 100, 'Birthday bonus points', NULL, NOW() - INTERVAL '2 months', NOW() + INTERVAL '10 months'),
('lp-bonus-002', 'cust-susan-williams', 'bonus', 150, 'Referral bonus points', NULL, NOW() - INTERVAL '6 weeks', NOW() + INTERVAL '10 months'),    reference_type, reference_id, created_at
('lp-bonus-003', 'cust-donna-jackson', 'bonus', 75, 'Holiday promotion bonus', NULL, NOW() - INTERVAL '3 months', NOW() + INTERVAL '9 months'),
('lp-bonus-004', 'cust-john-anderson', 'bonus', 50, 'First-time customer bonus', NULL, NOW() - INTERVAL '4 months', NOW() + INTERVAL '8 months');-- Olivia's point history

-- ==========================================('lp-c1-002', 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', 'debit', 500, 'Points redeemed for service discount', 'manual_discount', 'md-c1-redeem-001', NOW() - INTERVAL '1 month'),
-- ADDITIONAL CANCELLED, REFUNDED, VOIDED APPOINTMENTS-d5e6-f7a8-b9c0-d1e2f3a4b5c6', 'credit', 120, 'Bonus points - referral', 'referral', 'ref-c1-bonus-001', NOW() - INTERVAL '2 months'),
-- ==========================================
-- James's point history (VIP customer)
-- Create specific scenarios for reporting testing using REAL service IDs
INSERT INTO appointments (('lp-c2-002', 'c2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c7', 'credit', 200, 'VIP bonus points', 'bonus', 'vip-bonus-q4-2024', NOW() - INTERVAL '1 month'),
    id, customer_id, employee_id, service_ids, appointment_date, end_time,4-d5e6-f7a8-b9c0-d1e2f3a4b5c7', 'debit', 1000, 'Points used for premium service discount', 'manual_discount', 'md-c2-premium-001', NOW() - INTERVAL '3 months'),
    status, total_amount, discount_amount, final_amount, payment_method,
    payment_status, notes, created_at, updated_at, cancelled_at, cancellation_reason,-- William's extensive point history (loyal customer)
    refund_amount, refund_date, booking_source-b9c0-d1e2f3a4b5c9', 'credit', 55, 'Points from recent appointment', 'appointment', 'apt-c4e1-a3b4-c5d6-e7f8-g9h0i1j2k3l7', NOW() - INTERVAL '1 week'),
) VALUES 
-- Cancelled appointments with different reasons('lp-c4-003', 'c4a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c9', 'debit', 750, 'Holiday gift certificate purchase', 'gift_certificate', 'gc-holiday-2024-001', NOW() - INTERVAL '2 months');
('apt-cancel-001', 'cust-amanda-smith', 'emp-sarah-wilson', ARRAY['86032c4c-c186-441d-a6eb-25187b926ff8'], NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days 1 hour', 'cancelled', 55.00, 0, 55.00, 'credit_card', 'refunded', 'Customer emergency', NOW() - INTERVAL '3 days', NOW(), NOW() - INTERVAL '1 day', 'customer_request', 55.00, NOW() - INTERVAL '1 day', 'website'),
('apt-cancel-002', 'cust-maria-rodriguez', 'emp-alex-martinez', ARRAY['40cde9f0-6d58-409a-920b-2b40dded15ce'], NOW() + INTERVAL '1 week', NOW() + INTERVAL '1 week 2 hours', 'cancelled', 95.00, 10.00, 85.00, 'debit_card', 'refunded', 'Stylist unavailable', NOW() - INTERVAL '2 days', NOW(), NOW() - INTERVAL '6 hours', 'employee_unavailable', 85.00, NOW() - INTERVAL '6 hours', 'phone'),=================================

-- No-show appointments-- =====================================================================
('apt-noshow-001', 'cust-robert-lewis', 'emp-david-lee', ARRAY['e62a1f4b-b7a5-435b-99fb-9df8614a2f79'], NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week' + INTERVAL '30 minutes', 'no_show', 35.00, 0, 35.00, 'cash', 'pending', 'Customer did not show up', NOW() - INTERVAL '10 days', NOW(), NULL, NULL, NULL, NULL, 'phone'),
('apt-noshow-002', 'cust-william-hall', 'emp-tom-harris', ARRAY['86032c4c-c186-441d-a6eb-25187b926ff8'], NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '45 minutes', 'no_show', 45.00, 5.00, 40.00, 'upi', 'pending', 'No-show - charged cancellation fee', NOW() - INTERVAL '5 days', NOW(), NULL, NULL, NULL, NULL, 'app'),

-- Voided appointments
('apt-void-001', 'cust-jessica-lopez', 'emp-lisa-garcia', ARRAY['53c57f10-6857-4e2e-8e29-f0ffd8ca35d3'], NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks' + INTERVAL '75 minutes', 'voided', 85.00, 15.00, 70.00, 'credit_card', 'voided', 'Technical error - voided transaction', NOW() - INTERVAL '16 days', NOW(), NULL, NULL, 70.00, NOW() - INTERVAL '2 weeks', 'website'),

-- Partially refunded appointments
('apt-partial-001', 'cust-linda-brown', 'emp-sarah-wilson', ARRAY['df7da949-5425-4093-b205-2a5d2ef2a439'], NOW() - INTERVAL '1 month', NOW() - INTERVAL '1 month' + INTERVAL '2 hours', 'completed', 120.00, 20.00, 100.00, 'credit_card', 'partially_refunded', 'Service quality issue - partial refund given', NOW() - INTERVAL '32 days', NOW(), NULL, NULL, 30.00, NOW() - INTERVAL '25 days', 'phone');('mem-c2-premium-001', 'c2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c7', 'premium', NOW() - INTERVAL '6 months', NOW() + INTERVAL '6 months', 'active',

-- ==========================================
-- MANUAL DISCOUNTS AND SPECIAL PRICING
-- ==========================================('mem-c1-standard-001', 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', 'standard', NOW() - INTERVAL '3 months', NOW() + INTERVAL '9 months', 'active',
e),
-- Create appointments with manual discounts (staff discretion) using REAL service IDs
INSERT INTO appointments (
    id, customer_id, employee_id, service_ids, appointment_date, end_time,- INTERVAL '6 months', 'expired',
    status, total_amount, discount_amount, final_amount, payment_method,
    payment_status, notes, created_at, updated_at, discount_reason, booking_source
) VALUES -- Ava - VIP Membership
('apt-manual-001', 'cust-helen-moore', 'emp-lisa-garcia', ARRAY['53c57f10-6857-4e2e-8e29-f0ffd8ca35d3'], NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week' + INTERVAL '75 minutes', 'completed', 70.00, 15.00, 55.00, 'cash', 'completed', 'Loyalty customer discount', NOW() - INTERVAL '10 days', NOW(), 'loyalty_discount', 'phone'),vip', NOW() - INTERVAL '1 month', NOW() + INTERVAL '11 months', 'active',
('apt-manual-002', 'cust-betty-wilson', 'emp-jessica-brown', ARRAY['924218bb-f7c8-4035-ad02-c75545fefdc1'], NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days' + INTERVAL '45 minutes', 'completed', 95.00, 25.00, 70.00, 'credit_card', 'completed', 'First-time customer special', NOW() - INTERVAL '12 days', NOW(), 'first_time_customer', 'website'),
('apt-manual-003', 'cust-james-walker', 'emp-david-lee', ARRAY['89ee2a54-6529-4a8b-bf82-8e71a3815b84', 'e62a1f4b-b7a5-435b-99fb-9df8614a2f79'], NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '45 minutes', 'completed', 45.00, 10.00, 35.00, 'debit_card', 'completed', 'Package deal discount', NOW() - INTERVAL '7 days', NOW(), 'package_deal', 'phone');

-- Insert corresponding appointment services for manual discount appointments
INSERT INTO appointment_services (appointment_id, service_id, employee_id, price, discount_amount, final_price, commission_amount, created_at) VALUES  99.99, '["haircut", "wash", "basic_styling", "scalp_treatment"]', 15.00, NOW() - INTERVAL '8 months', NOW(), true),
('apt-manual-001', '53c57f10-6857-4e2e-8e29-f0ffd8ca35d3', 'emp-lisa-garcia', 70.00, 15.00, 55.00, 22.00, NOW() - INTERVAL '1 week'),
('apt-manual-002', '924218bb-f7c8-4035-ad02-c75545fefdc1', 'emp-jessica-brown', 95.00, 25.00, 70.00, 28.00, NOW() - INTERVAL '10 days'),
('apt-manual-003', '89ee2a54-6529-4a8b-bf82-8e71a3815b84', 'emp-david-lee', 25.00, 5.00, 20.00, 8.00, NOW() - INTERVAL '5 days'),9c0-d1e2f3a4b5d1', 'standard', NOW() - INTERVAL '14 months', NOW() - INTERVAL '2 months', 'expired',
('apt-manual-003', 'e62a1f4b-b7a5-435b-99fb-9df8614a2f79', 'emp-david-lee', 20.00, 5.00, 15.00, 6.00, NOW() - INTERVAL '5 days'); 49.99, '["haircut", "wash"]', 10.00, NOW() - INTERVAL '14 months', NOW() - INTERVAL '2 months', false),

-- ==========================================embership (new)
-- UPDATE CUSTOMER STATISTICS, 'c8a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d3', 'basic', NOW() - INTERVAL '1 month', NOW() + INTERVAL '11 months', 'active',
-- ==========================================.00, NOW() - INTERVAL '1 month', NOW(), true);

-- Update customer visit counts and wallet balances========
UPDATE profiles SET  MANUAL DISCOUNTS & REFERRAL WALLET USAGE - EXPANDED
    total_visits = (=======================================================
        SELECT COUNT(*) 
        FROM appointments ts (
        WHERE customer_id = profiles.id AND status = 'completed'
    ),pplied_by, created_at, updated_at
    total_spent = (
        SELECT COALESCE(SUM(final_amount), 0) -- Membership discounts (automatic)
        FROM appointments 0i1j2k3l4', 'percentage', 10.00, 'Standard membership discount', 'system', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
        WHERE customer_id = profiles.id AND status = 'completed'
    ),5d6-e7f8-g9h0i1j2k3l5', 'percentage', 15.00, 'Premium membership discount', 'system', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
    wallet_balance = (
        SELECT COALESCE(SUM(points), 0) * 0.1  -- Convert points to wallet balance (10 points = $1)5e3-a3b4-c5d6-e7f8-g9h0i1j2k3l8', 'percentage', 20.00, 'VIP membership discount', 'system', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours'),
        FROM loyalty_points 
        WHERE customer_id = profiles.idc7-membership-004', 'apt-c7e7-a3b4-c5d6-e7f8-g9h0i1j2k3m0', 'percentage', 15.00, 'Premium membership discount', 'system', NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week'),
    ),
    referral_count = (e7-b3b4-c5d6-e7f8-g9h0i1j2k3m8', 'percentage', 15.00, 'Premium membership discount', 'system', NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months'),
        SELECT COUNT(*) 
        FROM profiles referred 
        WHERE referred.referrer_id = profiles.idmd-c4-referral-001', 'apt-c4e1-a3b4-c5d6-e7f8-g9h0i1j2k3l7', 'fixed_amount', 20.00, 'Referral credit applied', 'e4a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b504', NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week'),
    )
WHERE id IN (3-a3b4-c5d6-e7f8-g9h0i1j2k3l5', 'fixed_amount', 50.00, 'Referral credit applied', 'e4a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b504', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
    SELECT DISTINCT referrer_id 
    FROM profiles 
    WHERE referrer_id IS NOT NULLa3b4-c5d6-e7f8-g9h0i1j2k3l6', 'percentage', 15.00, 'First time customer welcome discount', 'e2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b502', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
);

RESET session_replication_role;k3m5', 'percentage', 10.00, 'VIP customer goodwill - minor delay compensation', 'e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b501', NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months'),

-- Summary of created test data:
-- =============================k3m9', 'percentage', 20.00, 'Employee friend discount', 'e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b501', NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months'),
-- ✓ 10 Employees with diverse skills and roles using REAL service IDs
-- ✓ 20 Customers with referral relationships  
-- ✓ NO placeholder services created - using existing 200+ real services from database, 'fixed_amount', 40.00, 'Loyalty points redemption - 800 points', 'e4a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b504', NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months');
-- ✓ Employee skills mapped to actual service IDs from live database
-- ✓ Employee auth accounts created with deterministic UUIDs
-- ✓ Employee location assignments to first available location
-- ✓ 7 Coupons with different discount types and conditionsated_at, updated_at
-- ✓ 5 Membership types with 8 active membership sales
-- ✓ 550+ Appointments spanning 2 years using REAL service IDs-- Referral credit balances
-- ✓ Multiple appointment statuses: completed, cancelled, no_show, voided, NOW() - INTERVAL '2 months', NOW()),
-- ✓ Comprehensive payment transactions and methodsf3a4b5c7', 'referral_credit', 75.00, NOW() - INTERVAL '4 months', NOW()),
-- ✓ Loyalty points earned, redeemed, and bonus transactions8-b9c0-d1e2f3a4b5c9', 'referral_credit', 55.00, NOW() - INTERVAL '6 months', NOW()),
-- ✓ Manual discounts and special pricing scenarios8-b9c0-d1e2f3a4b5d1', 'referral_credit', 25.00, NOW() - INTERVAL '3 months', NOW()),
-- ✓ Refunded, partially refunded, and voided transactions-f7a8-b9c0-d1e2f3a4b5d2', 'referral_credit', 100.00, NOW() - INTERVAL '5 months', NOW()),
-- ✓ Realistic commission calculations and employee assignments
-- ✓ Diverse booking sources and customer lead sources
-- ✓ Updated customer visit counts and wallet balances6-f7a8-b9c0-d1e2f3a4b5c6', 'store_credit', 30.00, NOW() - INTERVAL '1 month', NOW()),
-d5e6-f7a8-b9c0-d1e2f3a4b5d0', 'store_credit', 85.00, NOW() - INTERVAL '3 weeks', NOW()),
-- Real Services Used (from live database):c4-d5e6-f7a8-b9c0-d1e2f3a4b5d3', 'store_credit', 15.00, NOW() - INTERVAL '2 weeks', NOW()),
-- =====================================-b9c0-d1e2f3a4b5d4', 'store_credit', 40.00, NOW() - INTERVAL '4 weeks', NOW());
-- • Hair Cut Services: 86032c4c-c186-441d-a6eb-25187b926ff8, e62a1f4b-b7a5-435b-99fb-9df8614a2f79












-- This ensures all test data uses production-ready service references!-- • Scalp Treatment: 2a0e9efd-08b6-4950-bb88-726877cd4972-- • Massage: 924218bb-f7c8-4035-ad02-c75545fefdc1-- • Facial: 53c57f10-6857-4e2e-8e29-f0ffd8ca35d3-- • Waxing: f90878fd-e810-4fff-84ff-d7bed3b32450, 89ee2a54-6529-4a8b-bf82-8e71a3815b84-- • Hair Extensions: 06ec6d22-e0d7-4249-b0fe-1a25e56e986f-- • Hair Treatment: 6ced78e7-3cd2-49e2-8424-51eac3fd62be-- • Hair Styling: e253f6af-94a0-44aa-b635-79fd21b3aec0-- • Hair Spa: df7da949-5425-4093-b205-2a5d2ef2a439-- • Hair Color: 40cde9f0-6d58-409a-920b-2b40dded15ce  -- =====================================================================
-- 11. ADDITIONAL REALISTIC DATA
-- =====================================================================

-- Employee compensation settings (expanded)
INSERT INTO employee_compensation_settings (
    employee_id, base_amount, effective_from, created_at, updated_at
) VALUES 
('e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b501', 28.00, CURRENT_DATE - INTERVAL '6 months', NOW(), NOW()),
('e2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b502', 24.00, CURRENT_DATE - INTERVAL '4 months', NOW(), NOW()),
('e3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b503', 26.00, CURRENT_DATE - INTERVAL '3 months', NOW(), NOW()),
('e4a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b504', 18.00, CURRENT_DATE - INTERVAL '3 months', NOW(), NOW()),
('e5a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b505', 16.00, CURRENT_DATE - INTERVAL '8 months', NOW(), NOW()),
('e6a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b506', 22.00, CURRENT_DATE - INTERVAL '2 months', NOW(), NOW()),
('e7a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b507', 25.00, CURRENT_DATE - INTERVAL '4 months', NOW(), NOW());

-- Sample recurring shifts
INSERT INTO recurring_shifts (
    id, employee_id, day_of_week, start_time, end_time, location_id,
    effective_from, effective_until, created_at, updated_at
) VALUES 
-- Sarah's management schedule
('a1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c1', 'e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b501', 1, '08:00:00', '17:00:00', '73ebc8a5-306d-450e-958c-db05c2fb72ea', NOW() - INTERVAL '6 months', NULL, NOW() - INTERVAL '6 months', NOW()),
('a1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c2', 'e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b501', 2, '08:00:00', '17:00:00', '73ebc8a5-306d-450e-958c-db05c2fb72ea', NOW() - INTERVAL '6 months', NULL, NOW() - INTERVAL '6 months', NOW()),
('a1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c3', 'e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b501', 3, '08:00:00', '17:00:00', '73ebc8a5-306d-450e-958c-db05c2fb72ea', NOW() - INTERVAL '6 months', NULL, NOW() - INTERVAL '6 months', NOW()),

-- Emily's stylist schedule
('a2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c4', 'e2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b502', 2, '09:00:00', '18:00:00', '73ebc8a5-306d-450e-958c-db05c2fb72ea', NOW() - INTERVAL '4 months', NULL, NOW() - INTERVAL '4 months', NOW()),
('a2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c5', 'e2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b502', 3, '09:00:00', '18:00:00', '73ebc8a5-306d-450e-958c-db05c2fb72ea', NOW() - INTERVAL '4 months', NULL, NOW() - INTERVAL '4 months', NOW()),
('a2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', 'e2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b502', 4, '09:00:00', '18:00:00', '73ebc8a5-306d-450e-958c-db05c2fb72ea', NOW() - INTERVAL '4 months', NULL, NOW() - INTERVAL '4 months', NOW()),
('a2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c7', 'e2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b502', 5, '09:00:00', '18:00:00', '73ebc8a5-306d-450e-958c-db05c2fb72ea', NOW() - INTERVAL '4 months', NULL, NOW() - INTERVAL '4 months', NOW()),

-- Michael's colorist schedule
('a3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c8', 'e3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b503', 3, '10:00:00', '19:00:00', '73ebc8a5-306d-450e-958c-db05c2fb72ea', NOW() - INTERVAL '3 months', NULL, NOW() - INTERVAL '3 months', NOW()),
('a3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c9', 'e3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b503', 4, '10:00:00', '19:00:00', '73ebc8a5-306d-450e-958c-db05c2fb72ea', NOW() - INTERVAL '3 months', NULL, NOW() - INTERVAL '3 months', NOW()),
('a3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d0', 'e3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b503', 5, '10:00:00', '19:00:00', '73ebc8a5-306d-450e-958c-db05c2fb72ea', NOW() - INTERVAL '3 months', NULL, NOW() - INTERVAL '3 months', NOW()),
('a3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d1', 'e3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b503', 6, '09:00:00', '17:00:00', '73ebc8a5-306d-450e-958c-db05c2fb72ea', NOW() - INTERVAL '3 months', NULL, NOW() - INTERVAL '3 months', NOW());

-- =====================================================================
-- MASSIVE APPOINTMENT GENERATION - 200+ APPOINTMENTS OVER 2 YEARS
-- =====================================================================

-- Generate 220 appointments distributed over 24 months (18 months past + 6 months future)
DO $$
DECLARE
    i INTEGER;    customer_ids TEXT[] := ARRAY[
        'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
        'c2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c7',
        'c3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c8',
        'c4a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c9',
        'c5a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d0',
        'c6a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d1',
        'c7a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d2',
        'c8a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d3',
        'c9a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d4',
        'c0a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d5'
    ];    employee_ids TEXT[] := ARRAY[
        'e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b501',
        'e2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b502',
        'e3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b503',
        'e4a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b504',
        'e5a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b505',
        'e6a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b506',
        'e7a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b507'
    ];
    location_ids TEXT[] := ARRAY[
        '73ebc8a5-306d-450e-958c-db05c2fb72ea',
        '74ebc8a5-306d-450e-958c-db05c2fb72eb'
    ];
    service_data RECORD;    service_records TEXT[][] := ARRAY[
        ARRAY['86032c4c-c186-441d-a6eb-25187b926ff8', '45.00'],  -- Advance Hair Cut Short
        ARRAY['40cde9f0-6d58-409a-920b-2b40dded15ce', '65.00'],  -- Root Touch Up Regular
        ARRAY['df7da949-5425-4093-b205-2a5d2ef2a439', '35.00'],  -- Moisturizing Hair Spa Short
        ARRAY['e253f6af-94a0-44aa-b635-79fd21b3aec0', '25.00'],  -- Blow Dry Short
        ARRAY['6ced78e7-3cd2-49e2-8424-51eac3fd62be', '120.00'], -- Hair Smoothening Short
        ARRAY['f90878fd-e810-4fff-84ff-d7bed3b32450', '40.00'],  -- Full Arms Honey Wax
        ARRAY['53c57f10-6857-4e2e-8e29-f0ffd8ca35d3', '55.00']   -- Fruit Facial
    ];
    
    apt_id TEXT;
    booking_id TEXT;
    booking_id_2 TEXT;
    customer_id TEXT;
    employee_id TEXT;
    location_id TEXT;
    service_id TEXT;
    service_id_2 TEXT;
    service_price DECIMAL(10,2);
    service_price_2 DECIMAL(10,2);
    apt_datetime TIMESTAMP;
    apt_status TEXT;
    apt_total DECIMAL(10,2);
    membership_discount BOOLEAN;
    add_second_service BOOLEAN;
    random_hours INTEGER;
    random_days INTEGER;
    random_months INTEGER;
BEGIN
    FOR i IN 1..220 LOOP
        -- Generate unique IDs
        apt_id := CONCAT('gen-apt-', LPAD(i::TEXT, 3, '0'), '-', LEFT(MD5(RANDOM()::TEXT), 8));
        booking_id := CONCAT('gen-bkg-', LPAD(i::TEXT, 3, '0'), '-', LEFT(MD5(RANDOM()::TEXT), 8));
        
        -- Rotate through customers, employees, locations, services
        customer_id := customer_ids[(i % 10) + 1];
        employee_id := employee_ids[(i % 7) + 1];
        location_id := location_ids[(i % 2) + 1];
        service_id := service_records[(i % 7) + 1][1];
        service_price := service_records[(i % 7) + 1][2]::DECIMAL(10,2);
        
        -- Generate appointment datetime (distributed over 24 months: 18 past + 6 future)
        random_months := FLOOR(RANDOM() * 24) - 18; -- Range: -18 to +5 months
        random_days := FLOOR(RANDOM() * 30); -- 0-30 days within month
        random_hours := 9 + FLOOR(RANDOM() * 8); -- Business hours: 9 AM to 5 PM
        
        apt_datetime := NOW() + 
            INTERVAL '1 month' * random_months + 
            INTERVAL '1 day' * random_days + 
            INTERVAL '1 hour' * random_hours + 
            INTERVAL '30 minutes' * FLOOR(RANDOM() * 2); -- 0 or 30 minute slots
        
        -- Determine status based on time
        IF apt_datetime < NOW() THEN
            apt_status := 'completed';
        ELSE
            apt_status := 'confirmed';
        END IF;
        
        -- Apply membership discount to every 3rd appointment
        membership_discount := (i % 3 = 0);
        IF membership_discount THEN
            service_price := service_price * 0.85; -- 15% discount
        END IF;
        
        -- Add second service to every 5th appointment
        add_second_service := (i % 5 = 0);
        apt_total := service_price;
        
        IF add_second_service THEN
            service_id_2 := service_records[((i + 3) % 7) + 1][1];
            service_price_2 := service_records[((i + 3) % 7) + 1][2]::DECIMAL(10,2);
            IF membership_discount THEN
                service_price_2 := service_price_2 * 0.85;
            END IF;
            apt_total := apt_total + service_price_2;
            booking_id_2 := CONCAT('gen-bkg2-', LPAD(i::TEXT, 3, '0'), '-', LEFT(MD5(RANDOM()::TEXT), 8));
        END IF;
          -- Insert appointment
        INSERT INTO appointments (
            id, customer_id, location, start_time, end_time,
            status, total_price, notes, created_at, updated_at
        ) VALUES (
            apt_id,
            customer_id,
            location_id,
            apt_datetime,
            apt_datetime + INTERVAL '1 hour',
            apt_status,
            apt_total,
            CASE 
                WHEN membership_discount THEN 'Membership discount applied'
                WHEN i % 7 = 0 THEN 'VIP customer service'
                WHEN i % 11 = 0 THEN 'First-time customer'
                ELSE 'Regular appointment'
            END,
            apt_datetime - INTERVAL '2 days',
            apt_datetime - INTERVAL '1 day'
        );
          -- Insert primary booking
        INSERT INTO bookings (
            id, appointment_id, service_id, employee_id, price_paid, original_price,
            status, created_at, updated_at
        ) VALUES (
            booking_id,
            apt_id,
            service_id,
            employee_id,
            service_price,
            service_price,
            apt_status,
            apt_datetime - INTERVAL '2 days',
            apt_datetime - INTERVAL '1 day'
        );
        
        -- Insert second booking if applicable
        IF add_second_service THEN            INSERT INTO bookings (
                id, appointment_id, service_id, employee_id, price_paid, original_price,
                status, created_at, updated_at
            ) VALUES (
                booking_id_2,
                apt_id,
                service_id_2,
                employee_id,
                service_price_2,
                service_price_2,
                apt_status,
                apt_datetime - INTERVAL '2 days',
                apt_datetime - INTERVAL '1 day'
            );
        END IF;
        
    END LOOP;
    
    RAISE NOTICE 'Successfully generated 220 appointments with % total bookings', 
        220 + (SELECT COUNT(*) FROM bookings WHERE id LIKE 'gen-bkg2-%');
END $$;

-- =====================================================================
-- COMMIT TRANSACTION
-- =====================================================================

COMMIT;

-- =====================================================================
-- VERIFICATION QUERIES (Comment out for production)
-- =====================================================================

/*
-- Comprehensive data verification
SELECT 'Employees Created' as category, COUNT(*) as count FROM employees
UNION ALL
SELECT 'Customer Profiles Created', COUNT(*) FROM profiles  
UNION ALL
SELECT 'Total Appointments Created', COUNT(*) FROM appointments
UNION ALL
SELECT '  - Manual Appointments', COUNT(*) FROM appointments WHERE id NOT LIKE 'gen-apt-%'
UNION ALL
SELECT '  - Generated Appointments', COUNT(*) FROM appointments WHERE id LIKE 'gen-apt-%'
UNION ALL
SELECT 'Total Bookings Created', COUNT(*) FROM bookings
UNION ALL
SELECT '  - Single Service Bookings', COUNT(*) FROM bookings WHERE id LIKE 'gen-bkg-%' AND id NOT LIKE 'gen-bkg2-%'
UNION ALL
SELECT '  - Additional Service Bookings', COUNT(*) FROM bookings WHERE id LIKE 'gen-bkg2-%'
UNION ALL
SELECT 'Coupons Created', COUNT(*) FROM coupons
UNION ALL
SELECT 'Loyalty Settings Created', COUNT(*) FROM loyalty_program_settings
UNION ALL
SELECT 'Loyalty Transactions Created', COUNT(*) FROM loyalty_points
UNION ALL
SELECT 'Memberships Created', COUNT(*) FROM memberships
UNION ALL
SELECT 'Manual Discounts Created', COUNT(*) FROM manual_discounts
UNION ALL
SELECT 'Credit Balances Created', COUNT(*) FROM credit_referral_balance
UNION ALL
SELECT 'Employee Skills Created', COUNT(*) FROM employee_skills
UNION ALL
SELECT 'Employee Locations Created', COUNT(*) FROM employee_locations
UNION ALL
SELECT 'Compensation Settings Created', COUNT(*) FROM employee_compensation_settings
UNION ALL
SELECT 'Recurring Shifts Created', COUNT(*) FROM recurring_shifts;

-- Appointment distribution by month for reporting analysis
SELECT 
    TO_CHAR(DATE_TRUNC('month', start_time), 'YYYY-MM') as month,
    COUNT(*) as appointments,
    ROUND(AVG(total_amount), 2) as avg_amount,
    SUM(total_amount) as total_revenue
FROM appointments 
GROUP BY DATE_TRUNC('month', start_time)
ORDER BY month;

-- Employee performance summary
SELECT 
    e.first_name || ' ' || e.last_name as employee,
    COUNT(a.id) as total_appointments,
    ROUND(AVG(a.total_amount), 2) as avg_appointment_value,
    SUM(a.total_amount) as total_revenue,
    COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments
FROM employees e
LEFT JOIN appointments a ON e.id = a.employee_id
GROUP BY e.id, e.first_name, e.last_name
ORDER BY total_revenue DESC;

-- Customer loyalty analysis
SELECT 
    p.first_name || ' ' || p.last_name as customer,
    lps.points_balance,
    lps.tier_level,
    lps.lifetime_points_earned,
    COUNT(a.id) as total_appointments,
    SUM(a.total_amount) as total_spent
FROM profiles p
LEFT JOIN loyalty_program_settings lps ON p.id = lps.profile_id
LEFT JOIN appointments a ON p.id = a.customer_id
GROUP BY p.id, p.first_name, p.last_name, lps.points_balance, lps.tier_level, lps.lifetime_points_earned
ORDER BY total_spent DESC;

-- Service popularity analysis
SELECT 
    CASE 
        WHEN b.service_id = '86032c4c-c186-441d-a6eb-25187b926ff8' THEN 'Advance Hair Cut Short'
        WHEN b.service_id = '40cde9f0-6d58-409a-920b-2b40dded15ce' THEN 'Root Touch Up Regular'
        WHEN b.service_id = 'df7da949-5425-4093-b205-2a5d2ef2a439' THEN 'Moisturizing Hair Spa Short'
        WHEN b.service_id = 'e253f6af-94a0-44aa-b635-79fd21b3aec0' THEN 'Blow Dry Short'
        WHEN b.service_id = '6ced78e7-3cd2-49e2-8424-51eac3fd62be' THEN 'Hair Smoothening Short'
        WHEN b.service_id = 'f90878fd-e810-4fff-84ff-d7bed3b32450' THEN 'Full Arms Honey Wax'
        WHEN b.service_id = '53c57f10-6857-4e2e-8e29-f0ffd8ca35d3' THEN 'Fruit Facial'
        ELSE 'Other Service'
    END as service_name,
    COUNT(*) as bookings_count,
    ROUND(AVG(b.total_price), 2) as avg_price,
    SUM(b.total_price) as total_revenue
FROM bookings b
GROUP BY b.service_id
ORDER BY bookings_count DESC;

-- Location performance comparison
SELECT 
    CASE 
        WHEN a.location_id = '73ebc8a5-306d-450e-958c-db05c2fb72ea' THEN 'DemoLocation'
        WHEN a.location_id = '74ebc8a5-306d-450e-958c-db05c2fb72eb' THEN 'Downtown Branch'
        ELSE 'Other Location'
    END as location_name,
    COUNT(a.id) as total_appointments,
    COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
    ROUND(AVG(a.total_amount), 2) as avg_appointment_value,
    SUM(a.total_amount) as total_revenue
FROM appointments a
GROUP BY a.location_id
ORDER BY total_revenue DESC;

-- Membership discount impact analysis
SELECT 
    'With Membership Discount' as discount_type,
    COUNT(*) as appointment_count,
    ROUND(AVG(total_amount), 2) as avg_amount
FROM appointments 
WHERE notes LIKE '%Membership discount%'
UNION ALL
SELECT 
    'Without Membership Discount',
    COUNT(*),
    ROUND(AVG(total_amount), 2)
FROM appointments 
WHERE notes NOT LIKE '%Membership discount%' OR notes IS NULL;

-- Appointment status distribution over time
SELECT 
    status,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage
FROM appointments 
GROUP BY status
ORDER BY count DESC;
*/

-- =====================================================================
-- END OF SCRIPT
-- =====================================================================

-- =====================================================================
-- COMPREHENSIVE TEST DATA SQL SCRIPT
-- Created: 2025-01-21
-- Purpose: Insert realistic test data across all major tables
-- Uses REAL service IDs and location IDs from existing database
-- =====================================================================

BEGIN;

-- Set timezone for consistent timestamps
SET timezone = 'UTC';

-- ======================================= ==============================
-- VARIABLES SECTION - Real IDs from existing database
-- =====================================================================
-- Real Location IDs: 
-- Location 1: '73ebc8a5-306d-450e-958c-db05c2fb72ea' (DemoLocation)
-- Location 2: '74ebc8a5-306d-450e-958c-db05c2fb72eb' (Downtown Branch) - NEW

-- Real Service IDs from current_services.sql
-- Hair Cuts: '86032c4c-c186-441d-a6eb-25187b926ff8' (Advance Hair Cut Short)
-- Hair Colors: '40cde9f0-6d58-409a-920b-2b40dded15ce' (Root Touch Up Regular)
-- Hair Spa: 'df7da949-5425-4093-b205-2a5d2ef2a439' (Moisturizing Hair Spa Short)
-- Hair Styling: 'e253f6af-94a0-44aa-b635-79fd21b3aec0' (Blow Dry Short)
-- Hair Treatments: '6ced78e7-3cd2-49e2-8424-51eac3fd62be' (Hair Smoothening Short)
-- Waxing: 'f90878fd-e810-4fff-84ff-d7bed3b32450' (Full Arms Honey Wax)
-- Skin Care: '53c57f10-6857-4e2e-8e29-f0ffd8ca35d3' (Fruit Facial)

-- =====================================================================
-- 0. ADDITIONAL LOCATION - Adding Downtown Branch
-- =====================================================================

INSERT INTO locations (
    id, name, address, phone, email, status, created_at, updated_at, 
    city, state, zip_code, country, is_active
) VALUES 
('74ebc8a5-306d-450e-958c-db05c2fb72eb', 'Downtown Branch', '123 Main Street, Downtown District', '+1234567800', 'downtown@salon.com', 'active', NOW() - INTERVAL '6 months', NOW(), 'Metropolitan City', 'State', '12345', 'USA', true);

-- Location hours for Downtown Branch
INSERT INTO location_hours (
    id, location_id, day_of_week, start_time, end_time, is_closed, created_at, updated_at
) VALUES 
('74ebc8a5-306d-450e-958c-db05c2fb72e1', '74ebc8a5-306d-450e-958c-db05c2fb72eb', 1, '09:00:00', '20:00:00', false, NOW() - INTERVAL '6 months', NOW()),
('74ebc8a5-306d-450e-958c-db05c2fb72e2', '74ebc8a5-306d-450e-958c-db05c2fb72eb', 2, '09:00:00', '20:00:00', false, NOW() - INTERVAL '6 months', NOW()),
('74ebc8a5-306d-450e-958c-db05c2fb72e3', '74ebc8a5-306d-450e-958c-db05c2fb72eb', 3, '09:00:00', '20:00:00', false, NOW() - INTERVAL '6 months', NOW()),
('74ebc8a5-306d-450e-958c-db05c2fb72e4', '74ebc8a5-306d-450e-958c-db05c2fb72eb', 4, '09:00:00', '20:00:00', false, NOW() - INTERVAL '6 months', NOW()),
('74ebc8a5-306d-450e-958c-db05c2fb72e5', '74ebc8a5-306d-450e-958c-db05c2fb72eb', 5, '09:00:00', '21:00:00', false, NOW() - INTERVAL '6 months', NOW()),
('74ebc8a5-306d-450e-958c-db05c2fb72e6', '74ebc8a5-306d-450e-958c-db05c2fb72eb', 6, '08:00:00', '19:00:00', false, NOW() - INTERVAL '6 months', NOW()),
('74ebc8a5-306d-450e-958c-db05c2fb72e7', '74ebc8a5-306d-450e-958c-db05c2fb72eb', 0, '10:00:00', '18:00:00', false, NOW() - INTERVAL '6 months', NOW());

-- Service locations for both locations (using real service IDs)
-- Using ON CONFLICT DO NOTHING to avoid duplicate key violations
INSERT INTO service_locations (service_id, location_id, created_at) VALUES 
-- DemoLocation services (skip if already exists)
('86032c4c-c186-441d-a6eb-25187b926ff8', '73ebc8a5-306d-450e-958c-db05c2fb72ea', NOW() - INTERVAL '8 months'),
('40cde9f0-6d58-409a-920b-2b40dded15ce', '73ebc8a5-306d-450e-958c-db05c2fb72ea', NOW() - INTERVAL '8 months'),
('df7da949-5425-4093-b205-2a5d2ef2a439', '73ebc8a5-306d-450e-958c-db05c2fb72ea', NOW() - INTERVAL '8 months'),
('e253f6af-94a0-44aa-b635-79fd21b3aec0', '73ebc8a5-306d-450e-958c-db05c2fb72ea', NOW() - INTERVAL '8 months'),
('6ced78e7-3cd2-49e2-8424-51eac3fd62be', '73ebc8a5-306d-450e-958c-db05c2fb72ea', NOW() - INTERVAL '8 months'),
('f90878fd-e810-4fff-84ff-d7bed3b32450', '73ebc8a5-306d-450e-958c-db05c2fb72ea', NOW() - INTERVAL '8 months'),
('53c57f10-6857-4e2e-8e29-f0ffd8ca35d3', '73ebc8a5-306d-450e-958c-db05c2fb72ea', NOW() - INTERVAL '8 months'),

-- Downtown Branch services (new location)
('86032c4c-c186-441d-a6eb-25187b926ff8', '74ebc8a5-306d-450e-958c-db05c2fb72eb', NOW() - INTERVAL '6 months'),
('40cde9f0-6d58-409a-920b-2b40dded15ce', '74ebc8a5-306d-450e-958c-db05c2fb72eb', NOW() - INTERVAL '6 months'),
('df7da949-5425-4093-b205-2a5d2ef2a439', '74ebc8a5-306d-450e-958c-db05c2fb72eb', NOW() - INTERVAL '6 months'),
('e253f6af-94a0-44aa-b635-79fd21b3aec0', '74ebc8a5-306d-450e-958c-db05c2fb72eb', NOW() - INTERVAL '6 months'),
('6ced78e7-3cd2-49e2-8424-51eac3fd62be', '74ebc8a5-306d-450e-958c-db05c2fb72eb', NOW() - INTERVAL '6 months'),
('f90878fd-e810-4fff-84ff-d7bed3b32450', '74ebc8a5-306d-450e-958c-db05c2fb72eb', NOW() - INTERVAL '6 months'),
('53c57f10-6857-4e2e-8e29-f0ffd8ca35d3', '74ebc8a5-306d-450e-958c-db05c2fb72eb', NOW() - INTERVAL '6 months')
ON CONFLICT (service_id, location_id) DO NOTHING;

-- =====================================================================
-- 1. AUTH USERS - Employees and Customers
-- =====================================================================


-- =====================================================================
-- 2. EMPLOYEE RECORDS (Fixed to match actual schema)
-- =====================================================================

INSERT INTO employees (
    id, name, email, phone, photo_url, status, employment_type, auth_id, 
    employment_type_id, service_commission_enabled, commission_type, created_at, updated_at
) VALUES 
-- Manager
('e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b501', 'Sarah Johnson', 'sarah.manager@salon.com', '+1234567890', NULL, 'active', 'Admin', 'e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', 
 '5d8e0d1d-bdc1-4a25-b9f5-c987d698fd70', true, 'tiered', NOW(), NOW()),

-- Senior Stylist
('e2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b502', 'Emily Rodriguez', 'emily.stylist@salon.com', '+1234567891', NULL, 'active', 'Stylist', 'e2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c7',
 'f0f7a4ae-7f9a-4589-8c4f-d8a49d75f19b', true, 'tiered', NOW(), NOW()),

-- Colorist
('e3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b503', 'Michael Chen', 'mike.colorist@salon.com', '+1234567892', NULL, 'active', 'Stylist', 'e3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c8',
 'f0f7a4ae-7f9a-4589-8c4f-d8a49d75f19b', true, 'tiered', NOW(), NOW()),

-- Receptionist
('e4a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b504', 'Jessica Martinez', 'jessica.receptionist@salon.com', '+1234567893', NULL, 'active', 'Operations', 'e4a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c9',
 'ac91e884-7724-4c85-9a8a-b1419997456d', false, 'none', NOW(), NOW()),

-- Assistant
('e5a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b505', 'David Thompson', 'david.assistant@salon.com', '+1234567894', NULL, 'active', 'Stylist', 'e5a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d0',
 'f0f7a4ae-7f9a-4589-8c4f-d8a49d75f19b', true, 'flat', NOW(), NOW()),

-- Downtown Branch Employees
('e6a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b506', 'Alex Rivera', 'alex.downtown@salon.com', '+1234567895', NULL, 'active', 'Stylist', 'e6a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d1',
 'f0f7a4ae-7f9a-4589-8c4f-d8a49d75f19b', true, 'tiered', NOW(), NOW()),

('e7a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b507', 'Maria Gonzalez', 'maria.downtown@salon.com', '+1234567896', NULL, 'active', 'Stylist', 'e7a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d2',
 'f0f7a4ae-7f9a-4589-8c4f-d8a49d75f19b', true, 'tiered', NOW(), NOW());

-- =====================================================================
-- 3. EMPLOYEE SKILLS - Using Real Service IDs (Expanded)
-- =====================================================================

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

-- Maria (Downtown Colorist) - Color specialist
('e7a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b507', '40cde9f0-6d58-409a-920b-2b40dded15ce'), -- Root Touch Up Regular
('e7a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b507', '53c57f10-6857-4e2e-8e29-f0ffd8ca35d3'), -- Fruit Facial
('e7a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b507', '86032c4c-c186-441d-a6eb-25187b926ff8'), -- Advance Hair Cut Short
('e7a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b507', 'e253f6af-94a0-44aa-b635-79fd21b3aec0'); -- Blow Dry Short

-- =====================================================================
-- 4. EMPLOYEE LOCATIONS - Both locations
-- =====================================================================

INSERT INTO employee_locations (employee_id, location_id, created_at, updated_at) VALUES 
-- DemoLocation employees
('e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b501', '73ebc8a5-306d-450e-958c-db05c2fb72ea', NOW(), NOW()),
('e2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b502', '73ebc8a5-306d-450e-958c-db05c2fb72ea', NOW(), NOW()),
('e3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b503', '73ebc8a5-306d-450e-958c-db05c2fb72ea', NOW(), NOW()),
('e4a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b504', '73ebc8a5-306d-450e-958c-db05c2fb72ea', NOW(), NOW()),
('e5a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b505', '73ebc8a5-306d-450e-958c-db05c2fb72ea', NOW(), NOW()),

-- Downtown Branch employees  
('e6a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b506', '74ebc8a5-306d-450e-958c-db05c2fb72eb', NOW(), NOW()),
('e7a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b507', '74ebc8a5-306d-450e-958c-db05c2fb72eb', NOW(), NOW()),

-- Sarah (Manager) works at both locations
('e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b501', '74ebc8a5-306d-450e-958c-db05c2fb72eb', NOW(), NOW());

-- =====================================================================
-- =====================================================================
-- =====================================================================
-- 6. APPOINTMENTS & BOOKINGS - EXPANDED FOR REPORTING (200+ appointments)
-- =====================================================================

-- Generate 200+ appointments efficiently using DO blocks
DO $$
DECLARE    customer_ids UUID[] := ARRAY[
        'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6'::UUID,
        'c2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c7'::UUID,
        'c3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c8'::UUID,
        'c4a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c9'::UUID,
        'c5a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d0'::UUID,
        'c6a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d1'::UUID,
        'c7a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d2'::UUID,
        'c8a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d3'::UUID,
        'c9a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d4'::UUID,
        'c0a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d5'::UUID
    ];
    
    employee_ids UUID[] := ARRAY[
        'e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b501'::UUID,
        'e2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b502'::UUID,
        'e3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b503'::UUID,
        'e5a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b505'::UUID,
        'e6a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b506'::UUID,
        'e7a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b507'::UUID
    ];
    
    location_ids UUID[] := ARRAY[
        '73ebc8a5-306d-450e-958c-db05c2fb72ea'::UUID,
        '74ebc8a5-306d-450e-958c-db05c2fb72eb'::UUID
    ];
      service_ids UUID[] := ARRAY[
        '86032c4c-c186-441d-a6eb-25187b926ff8'::UUID,  -- Advance Hair Cut Short
        '40cde9f0-6d58-409a-920b-2b40dded15ce'::UUID,  -- Root Touch Up Regular
        'df7da949-5425-4093-b205-2a5d2ef2a439'::UUID,  -- Moisturizing Hair Spa Short
        'e253f6af-94a0-44aa-b635-79fd21b3aec0'::UUID,  -- Blow Dry Short
        '6ced78e7-3cd2-49e2-8424-51eac3fd62be'::UUID,  -- Hair Smoothening Short
        'f90878fd-e810-4fff-84ff-d7bed3b32450'::UUID,  -- Full Arms Honey Wax
        '53c57f10-6857-4e2e-8e29-f0ffd8ca35d3'::UUID   -- Fruit Facial
    ];
    
    service_prices DECIMAL[] := ARRAY[45.00, 65.00, 35.00, 25.00, 120.00, 40.00, 55.00];
    
    i INTEGER;
    month_offset INTEGER;
    day_offset INTEGER;
    hour_val INTEGER;
    customer_id UUID;
    employee_id UUID;
    location_id UUID;
    service_id UUID;
    service_price DECIMAL;
    appointment_time TIMESTAMP;
    end_time TIMESTAMP;
    appointment_status TEXT;
    total_amount DECIMAL;
    deposit_amount DECIMAL;
    apt_id TEXT;
    booking_id TEXT;
    notes_text TEXT;
BEGIN
    -- Generate 220 appointments over 24 months (past 18 months + future 6 months)
    FOR i IN 1..220 LOOP
        -- Distribute appointments over 24 months (-18 to +6)
        month_offset := (i % 24) - 18;
        day_offset := (i % 28) + 1; -- Days 1-28 of month
        hour_val := 9 + (i % 9); -- Hours 9-17 (business hours)
        
        -- Rotate through customers, employees, locations
        customer_id := customer_ids[(i % array_length(customer_ids, 1)) + 1];
        employee_id := employee_ids[(i % array_length(employee_ids, 1)) + 1];
        location_id := location_ids[(i % array_length(location_ids, 1)) + 1];
        service_id := service_ids[(i % array_length(service_ids, 1)) + 1];
        service_price := service_prices[(i % array_length(service_prices, 1)) + 1];
        
        appointment_time := NOW() + (month_offset || ' months')::INTERVAL + (day_offset || ' days')::INTERVAL + (hour_val || ' hours')::INTERVAL;
        end_time := appointment_time + '1 hour'::INTERVAL;
        
        -- Set status based on time
        IF appointment_time < NOW() THEN
            appointment_status := 'completed';
        ELSIF appointment_time < NOW() + '7 days'::INTERVAL THEN
            appointment_status := 'confirmed';
        ELSE
            appointment_status := 'confirmed';
        END IF;
        
        -- Apply some membership/loyalty discounts (every 3rd appointment gets discount)
        IF i % 3 = 0 THEN
            total_amount := service_price * 0.85; -- 15% discount
            deposit_amount := total_amount * 0.2;
            notes_text := 'Membership discount applied';
        ELSE
            total_amount := service_price;
            deposit_amount := service_price * 0.25;
            notes_text := 'Regular appointment';
        END IF;
        
        apt_id := 'apt-gen-' || LPAD(i::TEXT, 4, '0') || '-' || EXTRACT(year FROM appointment_time) || '-' || EXTRACT(month FROM appointment_time);
        booking_id := 'bkg-gen-' || LPAD(i::TEXT, 4, '0') || '-svc';
          -- Insert appointment
        INSERT INTO appointments (
            id, customer_id, location, start_time, end_time, status,
            notes, created_at, updated_at, total_price
        ) VALUES (
            apt_id, customer_id, location_id, appointment_time, end_time, appointment_status,
            notes_text, appointment_time - '1 day'::INTERVAL, appointment_time - '1 day'::INTERVAL, total_amount
        );
        
        -- Insert corresponding booking
        INSERT INTO bookings (
            id, appointment_id, service_id, employee_id, price_paid, original_price,
            status, created_at, updated_at
        ) VALUES (
            booking_id, apt_id, service_id, employee_id, total_amount, service_price, appointment_status,
            appointment_time - '1 day'::INTERVAL, appointment_time - '1 day'::INTERVAL
        );
        
        -- Add second service occasionally (every 5th appointment)
        IF i % 5 = 0 THEN
            service_id := service_ids[((i + 1) % array_length(service_ids, 1)) + 1];
            service_price := service_prices[((i + 1) % array_length(service_prices, 1)) + 1];
              INSERT INTO bookings (
                id, appointment_id, service_id, employee_id, price_paid, original_price,
                status, created_at, updated_at
            ) VALUES (
                booking_id || '-2', apt_id, service_id, employee_id, service_price * 0.9, service_price, appointment_status,
                appointment_time - '1 day'::INTERVAL, appointment_time - '1 day'::INTERVAL
            );
            
            -- Update appointment total
            UPDATE appointments 
            SET total_price = total_price + (service_price * 0.9)
            WHERE id = apt_id;
        END IF;
        
    END LOOP;
END $$;

-- Add some manual seed appointments for key scenarios
INSERT INTO appointments (
    id, customer_id, location, start_time, end_time, status, 
    notes, created_at, updated_at, total_price
) VALUES 
-- Current week key appointments
('apt-current-week-001', 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', '73ebc8a5-306d-450e-958c-db05c2fb72ea', 
 NOW() - INTERVAL '2 days' + INTERVAL '10 hours', NOW() - INTERVAL '2 days' + INTERVAL '11 hours', 'completed', 
 'Membership customer - standard discount', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', 65.00),

('apt-current-week-002', 'c2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c7', '73ebc8a5-306d-450e-958c-db05c2fb72ea',
 NOW() + INTERVAL '2 days' + INTERVAL '14 hours', NOW() + INTERVAL '2 days' + INTERVAL '16 hours', 'confirmed',
 'VIP membership + referral credit used', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 130.00),

('apt-current-week-003', 'c3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c8', '73ebc8a5-306d-450e-958c-db05c2fb72ea',
 NOW() + INTERVAL '1 day' + INTERVAL '10 hours', NOW() + INTERVAL '1 day' + INTERVAL '11 hours', 'confirmed',
 'New customer welcome discount', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours', 65.00),

-- Future key appointments
('apt-future-001', 'c5a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d0', '73ebc8a5-306d-450e-958c-db05c2fb72ea',
 NOW() + INTERVAL '1 week' + INTERVAL '13 hours', NOW() + INTERVAL '1 week' + INTERVAL '15 hours', 'confirmed',
 'VIP membership - premium color treatment', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours', 176.00),

('apt-future-002', 'c9a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d4', '74ebc8a5-306d-450e-958c-db05c2fb72eb',
 NOW() + INTERVAL '10 days' + INTERVAL '11 hours', NOW() + INTERVAL '10 days' + INTERVAL '12 hours', 'confirmed',
 'Downtown Branch - regular service', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 85.00);

-- Bookings for each appointment (expanded)
INSERT INTO bookings (
    id, appointment_id, service_id, employee_id, price_paid, original_price, 
    status, created_at, updated_at
) VALUES 
-- Current week bookings
-- Olivia's completed appointment (membership discount reflected in pricing)
('bkg-apt1-svc1-86032c4c-c186-441d', 'apt-current-week-001', '86032c4c-c186-441d-a6eb-25187b926ff8', 'e2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b502', 40.50, 45.00, 'completed', NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days'),
('bkg-apt1-svc2-e253f6af-94a0-44aa', 'apt-current-week-001', 'e253f6af-94a0-44aa-b635-79fd21b3aec0', 'e2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b502', 22.50, 25.00, 'completed', NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days'),

-- James's upcoming color appointment (VIP membership + referral credit)
('bkg-apt2-svc1-40cde9f0-6d58-409a', 'apt-current-week-002', '40cde9f0-6d58-409a-920b-2b40dded15ce', 'e3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b503', 55.25, 65.00, 'confirmed', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
('bkg-apt2-svc2-53c57f10-6857-4e2e', 'apt-current-week-002', '53c57f10-6857-4e2e-8e29-f0ffd8ca35d3', 'e3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b503', 46.75, 55.00, 'confirmed', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

-- Sophia's new customer appointment
('bkg-apt3-svc1-86032c4c-c186-441d', 'apt-current-week-003', '86032c4c-c186-441d-a6eb-25187b926ff8', 'e2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b502', 45.00, 45.00, 'confirmed', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
('bkg-apt3-svc2-e253f6af-94a0-44aa', 'apt-current-week-003', 'e253f6af-94a0-44aa-b635-79fd21b3aec0', 'e2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b502', 20.00, 25.00, 'confirmed', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),

-- Ava's premium appointment (VIP membership discount)
('bkg-apt5-svc1-6ced78e7-3cd2-49e2', 'apt-future-001', '6ced78e7-3cd2-49e2-8424-51eac3fd62be', 'e3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b503', 102.00, 120.00, 'confirmed', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours'),

-- Lisa Downtown appointment  
('bkg-apt9-svc1-86032c4c-c186-441d', 'apt-future-002', '86032c4c-c186-441d-a6eb-25187b926ff8', 'e6a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b506', 45.00, 45.00, 'confirmed', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
('bkg-apt9-svc2-e253f6af-94a0-44aa', 'apt-future-002', 'e253f6af-94a0-44aa-b635-79fd21b3aec0', 'e6a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b506', 25.00, 25.00, 'confirmed', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day');

-- =====================================================================
-- 7. COUPONS - Various discount types
-- =====================================================================

INSERT INTO coupons (
    id, code, name, description, discount_type, discount_value, 
    minimum_purchase, usage_limit, used_count, start_date, end_date, 
    is_active, created_at, updated_at
) VALUES 
-- Welcome discount for new customers
('cpn-welcome-2025-001', 'WELCOME20', 'New Customer Welcome', 'Welcome discount for first-time customers', 'percentage', 20.00, 50.00, 100, 3, 
 NOW() - INTERVAL '30 days', NOW() + INTERVAL '60 days', true, NOW() - INTERVAL '30 days', NOW()),

-- Fixed amount holiday special
('cpn-holiday-2025-002', 'HOLIDAY25', 'Holiday Special', 'Holiday season discount', 'fixed_amount', 25.00, 100.00, 50, 12,
 NOW() - INTERVAL '45 days', NOW() + INTERVAL '15 days', true, NOW() - INTERVAL '45 days', NOW()),

-- VIP customer exclusive
('cpn-vip-exclusive-003', 'VIP15', 'VIP Exclusive', 'Exclusive discount for VIP customers', 'percentage', 15.00, 75.00, 200, 28,
 NOW() - INTERVAL '90 days', NOW() + INTERVAL '90 days', true, NOW() - INTERVAL '90 days', NOW()),

-- Color service special
('cpn-color-special-004', 'COLOR30', 'Color Service Special', 'Special discount on all color services', 'fixed_amount', 30.00, 120.00, 75, 15,
 NOW() - INTERVAL '15 days', NOW() + INTERVAL '30 days', true, NOW() - INTERVAL '15 days', NOW()),

-- Expired coupon for testing
('cpn-expired-summer-005', 'SUMMER10', 'Summer Special', 'Summer season discount (expired)', 'percentage', 10.00, 40.00, 100, 45,
 NOW() - INTERVAL '120 days', NOW() - INTERVAL '30 days', false, NOW() - INTERVAL '120 days', NOW() - INTERVAL '30 days');

-- =====================================================================
-- 8. LOYALTY POINTS SYSTEM
-- =====================================================================

-- Loyalty program settings for customers (expanded)
INSERT INTO loyalty_program_settings (
    profile_id, points_balance, tier_level, tier_start_date, 
    lifetime_points_earned, created_at, updated_at
) VALUES 
('c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', 1250, 'gold', NOW() - INTERVAL '8 months', 2840, NOW() - INTERVAL '8 months', NOW()),
('c2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c7', 2100, 'platinum', NOW() - INTERVAL '1 year', 4200, NOW() - INTERVAL '1 year', NOW()),
('c3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c8', 150, 'bronze', NOW() - INTERVAL '1 month', 150, NOW() - INTERVAL '1 month', NOW()),
('c4a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c9', 3500, 'platinum', NOW() - INTERVAL '2 years', 8500, NOW() - INTERVAL '2 years', NOW()),
('c5a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d0', 950, 'silver', NOW() - INTERVAL '6 months', 1850, NOW() - INTERVAL '6 months', NOW()),
('c6a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d1', 800, 'silver', NOW() - INTERVAL '10 months', 1200, NOW() - INTERVAL '10 months', NOW()),
('c7a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d2', 1800, 'gold', NOW() - INTERVAL '1 year', 3200, NOW() - INTERVAL '1 year', NOW()),
('c8a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d3', 400, 'bronze', NOW() - INTERVAL '4 months', 400, NOW() - INTERVAL '4 months', NOW()),
('c9a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d4', 650, 'silver', NOW() - INTERVAL '7 months', 1100, NOW() - INTERVAL '7 months', NOW()),
('c0a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d5', 300, 'bronze', NOW() - INTERVAL '5 months', 500, NOW() - INTERVAL '5 months', NOW());

-- Loyalty points transactions (credits and debits)
INSERT INTO loyalty_points (
    id, profile_id, transaction_type, points, description, 
    reference_type, reference_id, created_at
) VALUES 
-- Olivia's point history
('lp-c1-001', 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', 'credit', 85, 'Points earned from appointment', 'appointment', 'apt-c1e2-a3b4-c5d6-e7f8-g9h0i1j2k3l4', NOW() - INTERVAL '3 days'),
('lp-c1-002', 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', 'debit', 500, 'Points redeemed for service discount', 'manual_discount', 'md-c1-redeem-001', NOW() - INTERVAL '1 month'),
('lp-c1-003', 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', 'credit', 120, 'Bonus points - referral', 'referral', 'ref-c1-bonus-001', NOW() - INTERVAL '2 months'),

-- James's point history (VIP customer)
('lp-c2-001', 'c2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c7', 'credit', 180, 'Points for upcoming appointment', 'appointment', 'apt-c2e3-a3b4-c5d6-e7f8-g9h0i1j2k3l5', NOW() - INTERVAL '1 day'),
('lp-c2-002', 'c2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c7', 'credit', 200, 'VIP bonus points', 'bonus', 'vip-bonus-q4-2024', NOW() - INTERVAL '1 month'),
('lp-c2-003', 'c2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c7', 'debit', 1000, 'Points used for premium service discount', 'manual_discount', 'md-c2-premium-001', NOW() - INTERVAL '3 months'),

-- William's extensive point history (loyal customer)
('lp-c4-001', 'c4a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c9', 'credit', 55, 'Points from recent appointment', 'appointment', 'apt-c4e1-a3b4-c5d6-e7f8-g9h0i1j2k3l7', NOW() - INTERVAL '1 week'),
('lp-c4-002', 'c4a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c9', 'credit', 300, 'Annual loyalty bonus', 'bonus', 'annual-loyalty-2024', NOW() - INTERVAL '2 months'),
('lp-c4-003', 'c4a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c9', 'debit', 750, 'Holiday gift certificate purchase', 'gift_certificate', 'gc-holiday-2024-001', NOW() - INTERVAL '2 months');

-- =====================================================================
-- 9. MEMBERSHIPS - EXPANDED FOR TESTING
-- =====================================================================

INSERT INTO memberships (
    id, profile_id, membership_type, start_date, end_date, status, 
    monthly_fee, services_included, discount_percentage, 
    created_at, updated_at, auto_renew
) VALUES 
-- James - Active Premium Membership
('mem-c2-premium-001', 'c2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c7', 'premium', NOW() - INTERVAL '6 months', NOW() + INTERVAL '6 months', 'active',
 99.99, '["haircut", "wash", "basic_styling", "scalp_treatment"]', 15.00, NOW() - INTERVAL '6 months', NOW(), true),

-- Olivia - Active Standard Membership
('mem-c1-standard-001', 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', 'standard', NOW() - INTERVAL '3 months', NOW() + INTERVAL '9 months', 'active',
 49.99, '["haircut", "wash"]', 10.00, NOW() - INTERVAL '3 months', NOW(), true),

-- William - Expired Membership (for testing expired scenarios)
('mem-c4-standard-002', 'c4a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c9', 'standard', NOW() - INTERVAL '18 months', NOW() - INTERVAL '6 months', 'expired',
 49.99, '["haircut", "wash"]', 10.00, NOW() - INTERVAL '18 months', NOW() - INTERVAL '6 months', false),

-- Ava - VIP Membership
('mem-c5-vip-001', 'c5a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d0', 'vip', NOW() - INTERVAL '1 month', NOW() + INTERVAL '11 months', 'active',
 149.99, '["haircut", "wash", "styling", "color_touch_up", "deep_conditioning"]', 20.00, NOW() - INTERVAL '1 month', NOW(), true),

-- Jennifer - Premium Membership (active)
('mem-c7-premium-002', 'c7a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d2', 'premium', NOW() - INTERVAL '8 months', NOW() + INTERVAL '4 months', 'active',
 99.99, '["haircut", "wash", "basic_styling", "scalp_treatment"]', 15.00, NOW() - INTERVAL '8 months', NOW(), true),

-- Robert - Standard Membership (recently expired)
('mem-c6-standard-003', 'c6a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d1', 'standard', NOW() - INTERVAL '14 months', NOW() - INTERVAL '2 months', 'expired',
 49.99, '["haircut", "wash"]', 10.00, NOW() - INTERVAL '14 months', NOW() - INTERVAL '2 months', false),

-- Michael - Basic Membership (new)
('mem-c8-basic-001', 'c8a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d3', 'basic', NOW() - INTERVAL '1 month', NOW() + INTERVAL '11 months', 'active',
 29.99, '["haircut"]', 5.00, NOW() - INTERVAL '1 month', NOW(), true);

-- =====================================================================
-- 10. MANUAL DISCOUNTS & REFERRAL WALLET USAGE - EXPANDED
-- =====================================================================

INSERT INTO manual_discounts (
    id, appointment_id, discount_type, discount_value, reason, 
    applied_by, created_at, updated_at
) VALUES 
-- Membership discounts (automatic)
('md-c1-membership-001', 'apt-c1e2-a3b4-c5d6-e7f8-g9h0i1j2k3l4', 'percentage', 10.00, 'Standard membership discount', 'system', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),

('md-c2-membership-002', 'apt-c2e3-a3b4-c5d6-e7f8-g9h0i1j2k3l5', 'percentage', 15.00, 'Premium membership discount', 'system', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

('md-c5-membership-003', 'apt-c5e3-a3b4-c5d6-e7f8-g9h0i1j2k3l8', 'percentage', 20.00, 'VIP membership discount', 'system', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours'),

('md-c7-membership-004', 'apt-c7e7-a3b4-c5d6-e7f8-g9h0i1j2k3m0', 'percentage', 15.00, 'Premium membership discount', 'system', NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week'),

('md-c7-membership-005', 'apt-c7e7-b3b4-c5d6-e7f8-g9h0i1j2k3m8', 'percentage', 15.00, 'Premium membership discount', 'system', NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months'),

-- Referral credit usage
('md-c4-referral-001', 'apt-c4e1-a3b4-c5d6-e7f8-g9h0i1j2k3l7', 'fixed_amount', 20.00, 'Referral credit applied', 'e4a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b504', NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week'),

('md-c2-referral-002', 'apt-c2e3-a3b4-c5d6-e7f8-g9h0i1j2k3l5', 'fixed_amount', 50.00, 'Referral credit applied', 'e4a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b504', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

-- New customer discounts
('md-c3-newcust-001', 'apt-c3e2-a3b4-c5d6-e7f8-g9h0i1j2k3l6', 'percentage', 15.00, 'First time customer welcome discount', 'e2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b502', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),

-- VIP customer goodwill discounts
('md-c2-goodwill-001', 'apt-c2e3-b3b4-c5d6-e7f8-g9h0i1j2k3m5', 'percentage', 10.00, 'VIP customer goodwill - minor delay compensation', 'e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b501', NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months'),

-- Employee friend/family discounts
('md-staff-friend-001', 'apt-c4e1-b3b4-c5d6-e7f8-g9h0i1j2k3m9', 'percentage', 20.00, 'Employee friend discount', 'e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b501', NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months'),

-- Loyalty points redemption
('md-c5-loyalty-001', 'apt-c5e3-b3b4-c5d6-e7f8-g9h0i1j2n0l0', 'fixed_amount', 40.00, 'Loyalty points redemption - 800 points', 'e4a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b504', NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months');

-- Credit/Referral wallet transactions (expanded)
INSERT INTO credit_referral_balance (
    id, profile_id, balance_type, current_balance, created_at, updated_at
) VALUES 
-- Referral credit balances
('crb-c1-ref-001', 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', 'referral_credit', 50.00, NOW() - INTERVAL '2 months', NOW()),
('crb-c2-ref-002', 'c2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c7', 'referral_credit', 75.00, NOW() - INTERVAL '4 months', NOW()),
('crb-c4-ref-003', 'c4a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c9', 'referral_credit', 55.00, NOW() - INTERVAL '6 months', NOW()),
('crb-c6-ref-004', 'c6a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d1', 'referral_credit', 25.00, NOW() - INTERVAL '3 months', NOW()),
('crb-c7-ref-005', 'c7a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d2', 'referral_credit', 100.00, NOW() - INTERVAL '5 months', NOW()),

-- Store credit balances
('crb-c1-store-001', 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', 'store_credit', 30.00, NOW() - INTERVAL '1 month', NOW()),
('crb-c5-store-002', 'c5a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d0', 'store_credit', 85.00, NOW() - INTERVAL '3 weeks', NOW()),
('crb-c8-store-003', 'c8a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d3', 'store_credit', 15.00, NOW() - INTERVAL '2 weeks', NOW()),
('crb-c9-store-004', 'c9a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d4', 'store_credit', 40.00, NOW() - INTERVAL '4 weeks', NOW());

-- =====================================================================
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

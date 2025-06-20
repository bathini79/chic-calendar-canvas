-- =====================================================================
-- COMPREHENSIVE TEST DATA SQL SCRIPT (No Auth Users)
-- Created: 2025-01-21
-- Purpose: Insert realistic test data across all major tables
-- Uses REAL service IDs and location IDs from existing database
-- NOTE: Auth users are handled in separate migration: 20250610000000_auth_users_test_data.sql
-- =====================================================================

BEGIN;

-- Set timezone for consistent timestamps
SET timezone = 'UTC';

-- =====================================================================
-- CACHE UPDATE FUNCTIONS (Fixed column references)
-- =====================================================================

-- Function to update customer analytics cache
CREATE OR REPLACE FUNCTION update_customer_analytics_cache()
RETURNS VOID AS $$
DECLARE
    target_date DATE := CURRENT_DATE;
    target_location UUID;
BEGIN
    -- Get all location IDs
    FOR target_location IN 
        SELECT id FROM locations WHERE is_active = true
    LOOP
        -- Insert or update cache
        INSERT INTO cache_customer_analytics (
            metric_date, location_id, total_customers, new_customers, 
            returning_customers, total_appointments, avg_appointment_value
        )
        SELECT 
            target_date,
            target_location,
            COUNT(DISTINCT c.id) as total_customers,
            COUNT(DISTINCT c.id) FILTER (WHERE c.created_at::date = target_date) as new_customers,
            COUNT(DISTINCT c.id) FILTER (WHERE c.created_at::date < target_date) as returning_customers,
            COUNT(a.id) as total_appointments,
            COALESCE(AVG(a.total_price) FILTER (WHERE a.status = 'completed'), 0) as avg_appointment_value
        FROM customers c
        LEFT JOIN appointments a ON c.id = a.customer_id 
            AND a.location_id = target_location 
            AND a.start_time::date = target_date
        WHERE c.created_at <= target_date + INTERVAL '1 day'
        GROUP BY target_date, target_location
        ON CONFLICT (metric_date, location_id) 
        DO UPDATE SET
            total_customers = EXCLUDED.total_customers,
            new_customers = EXCLUDED.new_customers,
            returning_customers = EXCLUDED.returning_customers,
            total_appointments = EXCLUDED.total_appointments,
            avg_appointment_value = EXCLUDED.avg_appointment_value,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to update daily metrics cache
CREATE OR REPLACE FUNCTION update_daily_metrics_cache()
RETURNS VOID AS $$
DECLARE
    target_date DATE := CURRENT_DATE;
    target_location UUID;
BEGIN
    -- Get all location IDs
    FOR target_location IN 
        SELECT id FROM locations WHERE is_active = true
    LOOP
        -- Insert or update cache
        INSERT INTO cache_daily_metrics (
            metric_date, location_id, total_appointments, completed_appointments, 
            cancelled_appointments, total_revenue, new_customers, returning_customers
        )
        SELECT 
            target_date,
            target_location,
            COUNT(*) as total_appointments,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_appointments,
            COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_appointments,
            COALESCE(SUM(total_price) FILTER (WHERE status = 'completed'), 0) as total_revenue,
            COUNT(DISTINCT customer_id) FILTER (WHERE customer_id IN (
                SELECT id FROM customers WHERE created_at::date = target_date
            )) as new_customers,
            COUNT(DISTINCT customer_id) FILTER (WHERE customer_id IN (
                SELECT id FROM customers WHERE created_at::date < target_date
            )) as returning_customers
        FROM appointments
        WHERE location_id = target_location 
            AND start_time::date = target_date
        GROUP BY target_date, target_location
        ON CONFLICT (metric_date, location_id) 
        DO UPDATE SET
            total_appointments = EXCLUDED.total_appointments,
            completed_appointments = EXCLUDED.completed_appointments,
            cancelled_appointments = EXCLUDED.cancelled_appointments,
            total_revenue = EXCLUDED.total_revenue,
            new_customers = EXCLUDED.new_customers,
            returning_customers = EXCLUDED.returning_customers,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
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
-- 1. EMPLOYEE RECORDS (References auth.users from separate migration)
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
-- 2. EMPLOYEE SKILLS - Using Real Service IDs (Expanded)
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
-- 3. EMPLOYEE LOCATIONS - Both locations
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
-- 5. PROFILES DATA - MOVED TO SEPARATE MIGRATION
-- =====================================================================
-- NOTE: Profiles data has been moved to migration 20250611000000_profiles_test_data.sql
-- This ensures proper dependency order: auth.users -> profiles -> employees
-- The profiles migration must run BEFORE this migration for foreign key constraints to work

-- =====================================================================
-- 6. MASSIVE APPOINTMENT GENERATION - 220+ APPOINTMENTS
-- =====================================================================

-- Generate 220 appointments efficiently using DO blocks
DO $$
DECLARE
    customer_ids UUID[] := ARRAY[
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
    deposit_amount DECIMAL;    apt_id UUID;
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
        
        appointment_time := NOW() + make_interval(months => month_offset, days => day_offset, hours => hour_val);
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
        
        apt_id := gen_random_uuid(); -- Generate proper UUID for appointment
          -- Insert appointment
        INSERT INTO appointments (
            id, customer_id, location, start_time, end_time, status,
            notes, created_at, updated_at, total_price
        ) VALUES (
            apt_id, customer_id, location_id, appointment_time, end_time, appointment_status::appointment_status,
            notes_text, appointment_time - '1 day'::INTERVAL, appointment_time - '1 day'::INTERVAL, total_amount
        );
        booking_id := gen_random_uuid();
        
        -- Insert corresponding booking
        INSERT INTO bookings (
            id, appointment_id, service_id, employee_id, price_paid, original_price,
            status, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), apt_id, service_id, employee_id, total_amount, service_price, appointment_status,
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
                gen_random_uuid(), apt_id, service_id, employee_id, service_price * 0.9, service_price, appointment_status,
                appointment_time - '1 day'::INTERVAL, appointment_time - '1 day'::INTERVAL
            );
            
            -- Update appointment total
            UPDATE appointments 
            SET total_price = total_price + (service_price * 0.9)
            WHERE id = apt_id;
        END IF;
        
    END LOOP;
END $$;

-- =====================================================================
-- 7. LOYALTY POINTS SYSTEM
-- =====================================================================

-- System loyalty program configuration (one row for system-wide settings)
INSERT INTO loyalty_program_settings (
    enabled, points_per_spend, min_redemption_points, min_billing_amount,
    apply_to_all, points_validity_days, max_redemption_type, 
    max_redemption_points, created_at, updated_at
) VALUES (
    true, 1, 100, 50.00, true, 365, 'fixed', 1000, NOW(), NOW()
) ON CONFLICT (id) DO UPDATE SET
    enabled = EXCLUDED.enabled,
    points_per_spend = EXCLUDED.points_per_spend,
    min_redemption_points = EXCLUDED.min_redemption_points;

-- Update customer loyalty points in profiles table
UPDATE profiles SET wallet_balance = 1250, last_used = NOW() - INTERVAL '1 month' WHERE id = 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6';
UPDATE profiles SET wallet_balance = 2100, last_used = NOW() - INTERVAL '2 weeks' WHERE id = 'c2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c7';
UPDATE profiles SET wallet_balance = 150, last_used = NOW() - INTERVAL '1 month' WHERE id = 'c3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c8';
UPDATE profiles SET wallet_balance = 3500, last_used = NOW() - INTERVAL '3 months' WHERE id = 'c4a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c9';
UPDATE profiles SET wallet_balance = 950, last_used = NOW() - INTERVAL '2 months' WHERE id = 'c5a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d0';
UPDATE profiles SET wallet_balance = 800, last_used = NOW() - INTERVAL '4 months' WHERE id = 'c6a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d1';
UPDATE profiles SET wallet_balance = 1800, last_used = NOW() - INTERVAL '1 month' WHERE id = 'c7a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d2';
UPDATE profiles SET wallet_balance = 400, last_used = NOW() - INTERVAL '2 months' WHERE id = 'c8a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d3';
UPDATE profiles SET wallet_balance = 650, last_used = NOW() - INTERVAL '3 months' WHERE id = 'c9a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d4';
UPDATE profiles SET wallet_balance = 300, last_used = NOW() - INTERVAL '5 months' WHERE id = 'c0a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d5';

-- =====================================================================
-- 8. MEMBERSHIPS - EXPANDED FOR TESTING
-- =====================================================================

-- First, ensure we have some membership types in the memberships table
INSERT INTO memberships (
    id, name, description, validity_period, validity_unit, 
    discount_type, discount_value, max_discount_value, min_billing_amount,
    created_at, updated_at
) VALUES 
('a1b2c3d4-e5f6-4789-abcd-123456789001', 'Standard Membership', 'Basic membership with 10% discount', 12, 'months', 'percentage', 10.00, 50.00, 100.00, NOW(), NOW()),
('a1b2c3d4-e5f6-4789-abcd-123456789002', 'Premium Membership', 'Premium membership with 15% discount', 12, 'months', 'percentage', 15.00, 100.00, 200.00, NOW(), NOW()),
('a1b2c3d4-e5f6-4789-abcd-123456789003', 'VIP Membership', 'VIP membership with 20% discount', 12, 'months', 'percentage', 20.00, 200.00, 300.00, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Now insert customer memberships using the correct table and columns
INSERT INTO customer_memberships (
    id, customer_id, membership_id, amount_paid, status, 
    start_date, end_date, created_at, updated_at
) VALUES 
-- James - Active Premium Membership
('b1c2d3e4-f5a6-4567-8901-234567890001', 'c2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c7', 'a1b2c3d4-e5f6-4789-abcd-123456789002', 99.99, 'active',
 NOW() - INTERVAL '6 months', NOW() + INTERVAL '6 months', NOW() - INTERVAL '6 months', NOW()),

-- Olivia - Active Standard Membership
('b1c2d3e4-f5a6-4567-8901-234567890002', 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', 'a1b2c3d4-e5f6-4789-abcd-123456789001', 49.99, 'active',
 NOW() - INTERVAL '3 months', NOW() + INTERVAL '9 months', NOW() - INTERVAL '3 months', NOW()),

-- William - Expired Membership (for testing expired scenarios)
('b1c2d3e4-f5a6-4567-8901-234567890003', 'c4a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c9', 'a1b2c3d4-e5f6-4789-abcd-123456789001', 49.99, 'expired',
 NOW() - INTERVAL '18 months', NOW() - INTERVAL '6 months', NOW() - INTERVAL '18 months', NOW() - INTERVAL '6 months'),

-- Ava - VIP Membership
('b1c2d3e4-f5a6-4567-8901-234567890004', 'c5a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d0', 'a1b2c3d4-e5f6-4789-abcd-123456789003', 149.99, 'active',
 NOW() - INTERVAL '1 month', NOW() + INTERVAL '11 months', NOW() - INTERVAL '1 month', NOW()),

-- Jennifer - Premium Membership (active)
('b1c2d3e4-f5a6-4567-8901-234567890005', 'c7a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5d2', 'a1b2c3d4-e5f6-4789-abcd-123456789002', 99.99, 'active',
 NOW() - INTERVAL '8 months', NOW() + INTERVAL '4 months', NOW() - INTERVAL '8 months', NOW());

-- =====================================================================
-- 9. EMPLOYEE COMPENSATION SETTINGS
-- =====================================================================

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

-- =====================================================================
-- 10. SAMPLE RECURRING SHIFTS
-- =====================================================================

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
('a2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c7', 'e2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b502', 5, '09:00:00', '18:00:00', '73ebc8a5-306d-450e-958c-db05c2fb72ea', NOW() - INTERVAL '4 months', NULL, NOW() - INTERVAL '4 months', NOW());

-- =====================================================================
-- 0. DATABASE FUNCTION FIX - Column Reference and Enum Value Correction
-- =====================================================================
-- Fix both update_customer_analytics_cache and update_daily_metrics_cache functions

CREATE OR REPLACE FUNCTION update_customer_analytics_cache()
RETURNS TRIGGER AS $$
BEGIN
    -- Update customer analytics cache when appointments change
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        INSERT INTO customer_analytics_cache (
            customer_id,
            total_appointments,
            total_spent,
            last_visit_date,
            avg_appointment_value,
            calculated_at
        )
        SELECT 
            NEW.customer_id,
            COUNT(*),
            COALESCE(SUM(total_price), 0),  -- Fixed: was final_total, now total_price
            MAX(start_time),
            COALESCE(AVG(total_price), 0),  -- Fixed: was final_total, now total_price
            NOW()
        FROM appointments 
        WHERE customer_id = NEW.customer_id 
          AND status = 'completed'
        ON CONFLICT (customer_id) 
        DO UPDATE SET
            total_appointments = EXCLUDED.total_appointments,
            total_spent = EXCLUDED.total_spent,
            last_visit_date = EXCLUDED.last_visit_date,
            avg_appointment_value = EXCLUDED.avg_appointment_value,
            calculated_at = EXCLUDED.calculated_at;
            
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        -- Recalculate for the deleted appointment's customer
        INSERT INTO customer_analytics_cache (
            customer_id,
            total_appointments,
            total_spent,
            last_visit_date,
            avg_appointment_value,
            calculated_at
        )
        SELECT 
            OLD.customer_id,
            COUNT(*),
            COALESCE(SUM(total_price), 0),  -- Fixed: was final_total, now total_price
            MAX(start_time),
            COALESCE(AVG(total_price), 0),  -- Fixed: was final_total, now total_price
            NOW()
        FROM appointments 
        WHERE customer_id = OLD.customer_id 
          AND status = 'completed'
        ON CONFLICT (customer_id) 
        DO UPDATE SET
            total_appointments = EXCLUDED.total_appointments,
            total_spent = EXCLUDED.total_spent,
            last_visit_date = EXCLUDED.last_visit_date,
            avg_appointment_value = EXCLUDED.avg_appointment_value,
            calculated_at = EXCLUDED.calculated_at;
            
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Fix the update_daily_metrics_cache function with correct column names AND enum values
CREATE OR REPLACE FUNCTION update_daily_metrics_cache()
RETURNS TRIGGER AS $$
DECLARE
    target_date DATE;
    target_location UUID;
BEGIN
    -- Determine target date and location based on operation
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        target_date := DATE(NEW.start_time);  -- Fixed: was appointment_date, now start_time
        target_location := NEW.location::UUID;
    ELSIF TG_OP = 'DELETE' THEN
        target_date := DATE(OLD.start_time);  -- Fixed: was appointment_date, now start_time
        target_location := OLD.location::UUID;
    END IF;

    -- Update or insert daily metrics cache
    INSERT INTO cache_daily_metrics (
        metric_date, location_id, total_appointments, completed_appointments, 
        cancelled_appointments, total_revenue, new_customers, returning_customers
    )
    SELECT 
        target_date,
        target_location,        COUNT(*) as total_appointments,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_appointments,
        COUNT(*) FILTER (WHERE status = 'canceled') as cancelled_appointments,
        COALESCE(SUM(total_price) FILTER (WHERE status = 'completed'), 0) as total_revenue,  -- Fixed: was final_total, now total_price
        COUNT(DISTINCT customer_id) FILTER (WHERE 
            customer_id IN (
                SELECT customer_id FROM appointments 
                WHERE customer_id = appointments.customer_id 
                AND DATE(start_time) = target_date  -- Fixed: was appointment_date, now start_time
                AND start_time = (  -- Fixed: was appointment_date, now start_time
                    SELECT MIN(start_time)  -- Fixed: was appointment_date, now start_time
                    FROM appointments a2 
                    WHERE a2.customer_id = appointments.customer_id
                )
            )
        ) as new_customers,
        COUNT(DISTINCT customer_id) FILTER (WHERE 
            customer_id NOT IN (
                SELECT customer_id FROM appointments 
                WHERE customer_id = appointments.customer_id 
                AND DATE(start_time) = target_date  -- Fixed: was appointment_date, now start_time
                AND start_time = (  -- Fixed: was appointment_date, now start_time
                    SELECT MIN(start_time)  -- Fixed: was appointment_date, now start_time
                    FROM appointments a2 
                    WHERE a2.customer_id = appointments.customer_id
                )
            )
        ) as returning_customers
    FROM appointments
    WHERE DATE(start_time) = target_date  -- Fixed: was appointment_date, now start_time
    AND location::UUID = target_location
    GROUP BY target_date, target_location
    ON CONFLICT (metric_date, location_id)
    DO UPDATE SET
        total_appointments = EXCLUDED.total_appointments,
        completed_appointments = EXCLUDED.completed_appointments,
        cancelled_appointments = EXCLUDED.cancelled_appointments,
        total_revenue = EXCLUDED.total_revenue,
        new_customers = EXCLUDED.new_customers,
        returning_customers = EXCLUDED.returning_customers,
        last_updated = NOW();

    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        RETURN NEW;
    ELSE
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMIT;


-- Backfill script to update visit counts for existing customers based on their completed appointments
-- This script should be run after applying the 20250615000000_add_visit_count_to_profiles.sql migration

-- Create a temporary function to count completed appointments for each customer
CREATE OR REPLACE FUNCTION "public"."backfill_customer_visit_counts"() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    customer_record RECORD;
    completed_count INTEGER;
BEGIN
    -- Log start of backfill process
    RAISE NOTICE 'Starting visit count backfill process...';
    
    -- Loop through all customers
    FOR customer_record IN 
        SELECT DISTINCT p.id, p.full_name
        FROM profiles p
        JOIN appointments a ON p.id = a.customer_id
        WHERE p.visit_count = 0  -- Only process customers with zero visit count
    LOOP
        -- Count completed appointments for this customer
        SELECT COUNT(*) INTO completed_count
        FROM appointments
        WHERE customer_id = customer_record.id
        AND status = 'completed';
        
        -- Update the visit count if there are completed appointments
        IF completed_count > 0 THEN
            UPDATE profiles
            SET visit_count = completed_count
            WHERE id = customer_record.id;
            
            RAISE NOTICE 'Updated customer % (%) with % visits', 
                customer_record.full_name, customer_record.id, completed_count;
        END IF;
    END LOOP;
    
    -- Log completion of backfill process
    RAISE NOTICE 'Visit count backfill process completed successfully.';
END;
$$;

-- Execute the backfill function
SELECT backfill_customer_visit_counts();

-- Drop the temporary function after use
DROP FUNCTION IF EXISTS "public"."backfill_customer_visit_counts";

-- Get summary statistics to verify the results
SELECT 
    MIN(visit_count) as min_visits,
    MAX(visit_count) as max_visits,
    AVG(visit_count) as avg_visits,
    COUNT(*) as total_customers,
    COUNT(*) FILTER (WHERE visit_count > 0) as customers_with_visits
FROM profiles;

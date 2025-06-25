-- Fix the update_customer_analytics_cache function to use correct column name
-- The function was referencing 'final_total' but the correct column name is 'total_price'

CREATE OR REPLACE FUNCTION "public"."update_customer_analytics_cache"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    customer_data RECORD;
    segment_type TEXT;
BEGIN
    -- Get customer statistics using correct column name 'total_price' instead of 'final_total'
    SELECT 
        COUNT(*) as appointment_count,
        COALESCE(SUM(total_price), 0) as total_spent,
        COALESCE(AVG(total_price), 0) as avg_value,
        MAX(start_time) as last_visit
    INTO customer_data
    FROM appointments 
    WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id)
    AND status = 'completed';
    
    -- Determine customer segment
    IF customer_data.appointment_count = 0 THEN
        segment_type := 'new';
    ELSIF customer_data.appointment_count >= 10 AND customer_data.avg_value > 100 THEN
        segment_type := 'vip';
    ELSIF customer_data.last_visit < NOW() - INTERVAL '6 months' THEN
        segment_type := 'lost';
    ELSIF customer_data.last_visit < NOW() - INTERVAL '3 months' THEN
        segment_type := 'at_risk';
    ELSE
        segment_type := 'regular';
    END IF;
    
    -- Update cache (only if cache_customer_analytics table exists)
    -- Note: This table might not exist yet, so we'll add error handling
    BEGIN
        INSERT INTO cache_customer_analytics (
            customer_id, total_appointments, total_spent, 
            avg_appointment_value, last_appointment_date, segment, last_updated
        )
        VALUES (
            COALESCE(NEW.customer_id, OLD.customer_id),
            customer_data.appointment_count,
            customer_data.total_spent,
            customer_data.avg_value,
            customer_data.last_visit,
            segment_type,
            NOW()
        )
        ON CONFLICT (customer_id) 
        DO UPDATE SET
            total_appointments = EXCLUDED.total_appointments,
            total_spent = EXCLUDED.total_spent,
            avg_appointment_value = EXCLUDED.avg_appointment_value,
            last_appointment_date = EXCLUDED.last_appointment_date,
            segment = EXCLUDED.segment,
            last_updated = NOW();
    EXCEPTION 
        WHEN undefined_table THEN
            -- If cache_customer_analytics table doesn't exist, just log and continue
            RAISE NOTICE 'cache_customer_analytics table does not exist, skipping cache update';
    END;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

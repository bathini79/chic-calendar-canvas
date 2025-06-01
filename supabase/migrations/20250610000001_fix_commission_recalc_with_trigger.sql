-- Enhanced fix for recalculate_commissions_for_pay_run to disable the trigger temporarily
-- This prevents the fix_payment_status_after_populate trigger from automatically 
-- setting is_paid to true when new items are inserted
-- Added SECURITY DEFINER to allow the function to alter triggers without direct permissions

CREATE OR REPLACE FUNCTION "public"."recalculate_commissions_for_pay_run"("pay_run_id_param" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    SECURITY DEFINER
    AS $$
DECLARE
    pay_run_record RECORD;
BEGIN
    -- Disable the trigger temporarily
    ALTER TABLE pay_run_items DISABLE TRIGGER fix_payment_status_after_populate;
    
    -- Get pay run information
    SELECT pr.id, pr.pay_period_id, pp.start_date, pp.end_date, pr.location_id, pr.is_supplementary
    INTO pay_run_record
    FROM pay_runs pr
    JOIN pay_periods pp ON pr.pay_period_id = pp.id
    WHERE pr.id = pay_run_id_param;

    -- Step 1: Create temp table to hold calculated commissions
    CREATE TEMP TABLE temp_calculated_commissions ON COMMIT DROP AS
    WITH latest_commission_settings AS (
        SELECT DISTINCT ON (employee_id) 
            employee_id, 
            global_commission_percentage,
            commission_type
        FROM employee_commission_settings
        ORDER BY employee_id, created_at DESC
    ),
    commission_status AS (
        SELECT 
            pri.source_id,
            bool_or(pr.status = 'paid' AND pr.id != pay_run_id_param) as is_paid_elsewhere,
            bool_or(pr.id = pay_run_id_param) as in_current_run,
            bool_or(pr.id = pay_run_id_param AND pr.status = 'paid') as is_paid_in_current,
            -- Add this to capture the current payment status of each item
            bool_or(pr.id = pay_run_id_param AND pri.is_paid) as is_currently_paid
        FROM pay_run_items pri
        JOIN pay_runs pr ON pri.pay_run_id = pr.id 
        WHERE pri.compensation_type = 'commission' 
        AND pri.source_type = 'service'
        GROUP BY pri.source_id
    )
    SELECT 
        s.id as source_id,
        s.employee_id,
        CASE 
            WHEN ecs.commission_type = 'flat' THEN
                COALESCE((
                    SELECT fcr.percentage
                    FROM flat_commission_rules fcr
                    WHERE fcr.employee_id = s.employee_id
                    AND fcr.service_id = s.service_id
                ), ecs.global_commission_percentage) * s.price_paid / 100.0
            
            WHEN ecs.commission_type = 'tiered' THEN (
                SELECT tcs.percentage * s.price_paid / 100.0
                FROM tiered_commission_slabs tcs
                WHERE tcs.employee_id = s.employee_id
                AND s.price_paid >= tcs.min_amount
                AND (tcs.max_amount IS NULL OR s.price_paid < tcs.max_amount)
                ORDER BY tcs.order_index
                LIMIT 1
            )
            
            ELSE ROUND(s.price_paid * COALESCE(ecs.global_commission_percentage, 0) / 100.0, 2)
        END as new_amount,
        'Commission for ' || srv.name as description,
        -- Capture the current payment status
        COALESCE(cs.is_currently_paid, FALSE) as is_currently_paid
    FROM 
        bookings s
        JOIN employees e ON s.employee_id = e.id
        JOIN appointments a ON s.appointment_id = a.id
        LEFT JOIN services srv ON s.service_id = srv.id
        LEFT JOIN latest_commission_settings ecs ON s.employee_id = ecs.employee_id
        LEFT JOIN commission_status cs ON s.id = cs.source_id
    WHERE 
        a.status = 'completed'
        AND DATE(a.start_time) >= pay_run_record.start_date
        AND DATE(a.start_time) <= pay_run_record.end_date
        AND (
            cs.source_id IS NULL
            OR (
                NOT cs.is_paid_elsewhere
                AND (
                    cs.in_current_run
                    OR NOT cs.is_paid_in_current
                )
            )
        );

    -- Step 2: Insert or update pay_run_items, preserving payment status for existing items
    INSERT INTO pay_run_items (
        pay_run_id,
        employee_id,
        compensation_type,
        amount,
        source_id,
        source_type,
        description,
        is_paid,
        paid_date,
        payment_reference
    )
    SELECT 
        pay_run_id_param,
        cc.employee_id,
        'commission',
        cc.new_amount,
        cc.source_id,
        'service',
        cc.description,
        cc.is_currently_paid, -- Use the existing payment status instead of FALSE for all
        CASE WHEN cc.is_currently_paid THEN NOW() ELSE NULL END, -- Set paid_date if it's paid
        CASE WHEN cc.is_currently_paid THEN 'Recalculated-' || pay_run_id_param::TEXT ELSE NULL END -- Set a reference if paid
    FROM temp_calculated_commissions cc
    ON CONFLICT (pay_run_id, employee_id, source_id) 
    DO UPDATE SET
        amount = EXCLUDED.amount,
        description = EXCLUDED.description,
        -- Don't change the payment status for items that are already in the table
        is_paid = pay_run_items.is_paid,
        paid_date = pay_run_items.paid_date,
        payment_reference = pay_run_items.payment_reference;

    -- Step 3: Delete any commission items that no longer apply
    DELETE FROM pay_run_items pri
    WHERE pri.pay_run_id = pay_run_id_param
    AND pri.compensation_type = 'commission'
    AND pri.source_type = 'service'
    AND NOT EXISTS (
        SELECT 1 FROM temp_calculated_commissions cc
        WHERE cc.source_id = pri.source_id
    );
    
    -- Re-enable the trigger
    ALTER TABLE pay_run_items ENABLE TRIGGER fix_payment_status_after_populate;

    RETURN TRUE;
END;
$$;

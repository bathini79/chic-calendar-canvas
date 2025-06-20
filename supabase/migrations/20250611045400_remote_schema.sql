

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."appointment_status" AS ENUM (
    'pending',
    'confirmed',
    'canceled',
    'completed',
    'inprogress',
    'voided',
    'refunded',
    'partially_refunded',
    'noshow',
    'booked'
);


ALTER TYPE "public"."appointment_status" OWNER TO "postgres";


CREATE TYPE "public"."booking_status" AS ENUM (
    'pending',
    'confirmed',
    'canceled',
    'completed',
    'inprogress'
);


ALTER TYPE "public"."booking_status" OWNER TO "postgres";


CREATE TYPE "public"."cart_item_status" AS ENUM (
    'pending',
    'scheduled',
    'removed'
);


ALTER TYPE "public"."cart_item_status" OWNER TO "postgres";


CREATE TYPE "public"."employee_status" AS ENUM (
    'active',
    'inactive'
);


ALTER TYPE "public"."employee_status" OWNER TO "postgres";


CREATE TYPE "public"."employee_type" AS ENUM (
    'stylist',
    'operations'
);


ALTER TYPE "public"."employee_type" OWNER TO "postgres";


CREATE TYPE "public"."gender" AS ENUM (
    'female',
    'male',
    'all'
);


ALTER TYPE "public"."gender" OWNER TO "postgres";


CREATE TYPE "public"."location_status" AS ENUM (
    'active',
    'inactive'
);


ALTER TYPE "public"."location_status" OWNER TO "postgres";


CREATE TYPE "public"."refund_reason_type" AS ENUM (
    'customer_dissatisfaction',
    'service_quality_issue',
    'scheduling_error',
    'health_concern',
    'price_dispute',
    'other'
);


ALTER TYPE "public"."refund_reason_type" OWNER TO "postgres";


CREATE TYPE "public"."service_status" AS ENUM (
    'active',
    'inactive',
    'archived'
);


ALTER TYPE "public"."service_status" OWNER TO "postgres";


CREATE TYPE "public"."shift_status" AS ENUM (
    'pending',
    'approved',
    'declined'
);


ALTER TYPE "public"."shift_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'customer',
    'employee',
    'admin',
    'superadmin'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_adjustment_to_pay_run"("pay_run_id_param" "uuid", "employee_id_param" "uuid", "compensation_type_param" "text", "amount_param" numeric, "description_param" "text", "source_type_param" "text" DEFAULT 'manual'::"text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_item_id uuid;
  result_record RECORD;
BEGIN
  -- Disable the trigger temporarily
  ALTER TABLE pay_run_items DISABLE TRIGGER fix_payment_status_after_populate;
  
  -- Insert the adjustment
  INSERT INTO pay_run_items (
    pay_run_id,
    employee_id,
    compensation_type,
    amount,
    description,
    source_type,
    is_paid,
    paid_date,
    payment_reference
  ) VALUES (
    pay_run_id_param,
    employee_id_param,
    compensation_type_param,
    amount_param,
    description_param,
    source_type_param,
    FALSE, -- explicitly set is_paid to FALSE
    NULL,  -- no paid date
    NULL   -- no payment reference
  ) RETURNING id INTO new_item_id;
  
  -- Re-enable the trigger
  ALTER TABLE pay_run_items ENABLE TRIGGER fix_payment_status_after_populate;
  
  -- Get the complete record to return
  SELECT * INTO result_record
  FROM pay_run_items
  WHERE id = new_item_id;
  
  -- Return the inserted record as JSON
  RETURN to_json(result_record);
END;
$$;


ALTER FUNCTION "public"."add_adjustment_to_pay_run"("pay_run_id_param" "uuid", "employee_id_param" "uuid", "compensation_type_param" "text", "amount_param" numeric, "description_param" "text", "source_type_param" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."add_adjustment_to_pay_run"("pay_run_id_param" "uuid", "employee_id_param" "uuid", "compensation_type_param" "text", "amount_param" numeric, "description_param" "text", "source_type_param" "text") IS 'Adds an adjustment to a pay run while temporarily disabling the payment status trigger to ensure new adjustments are not automatically marked as paid';



CREATE OR REPLACE FUNCTION "public"."basic_user_setup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Log entry point to help with debugging
    RAISE LOG 'basic_user_setup triggered for user %', NEW.id;
    
    BEGIN
        -- Create minimal profile with id matching auth.user id
        INSERT INTO public.profiles (id, role)
        VALUES (NEW.id, 'customer')
        ON CONFLICT (id) DO NOTHING;
        
        RAISE LOG 'Successfully created profile for %', NEW.id;
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Error in basic_user_setup: %', SQLERRM;
    END;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."basic_user_setup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_commissions_for_pay_run"("pay_run_id_param" "uuid", "recalculate_only" boolean DEFAULT false) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    pay_run_record RECORD;
    employee_record RECORD;
BEGIN
    -- Get pay run information
    SELECT pr.*, pp.start_date, pp.end_date
    INTO pay_run_record
    FROM pay_runs pr
    JOIN pay_periods pp ON pr.pay_period_id = pp.id
    WHERE pr.id = pay_run_id_param;

    -- Process each active employee for the pay run
    FOR employee_record IN 
        SELECT e.id, e.commission_type
        FROM employees e
        WHERE e.status = 'active'
        AND (
            pay_run_record.location_id IS NULL 
            OR EXISTS (
                SELECT 1 FROM employee_locations el 
                WHERE el.employee_id = e.id 
                AND el.location_id = pay_run_record.location_id
            )
        )
    LOOP
        -- Track already paid commissions
        WITH commission_status AS (
            SELECT 
                pri.source_id,
                bool_or(pr.status = 'paid' AND pr.id != pay_run_id_param) as is_paid_elsewhere,
                bool_or(pr.id = pay_run_id_param) as in_current_run,
                bool_or(pr.id = pay_run_id_param AND pri.is_paid) as is_paid_in_current
            FROM pay_run_items pri
            JOIN pay_runs pr ON pri.pay_run_id = pr.id
            WHERE pri.compensation_type = 'commission'
            AND pri.employee_id = employee_record.id
            GROUP BY pri.source_id
        ),
        -- Calculate flat commissions
        flat_commissions AS (
            SELECT 
                a.id as source_id,
                a.total_price * fcr.percentage / 100 as commission_amount
            FROM appointments a
            JOIN bookings b ON b.appointment_id = a.id
            JOIN flat_commission_rules fcr ON fcr.service_id = b.service_id
            LEFT JOIN commission_status cs ON cs.source_id = a.id
            WHERE fcr.employee_id = employee_record.id
            AND a.status = 'completed'
            AND DATE(a.start_time) >= pay_run_record.start_date
            AND DATE(a.start_time) <= pay_run_record.end_date
            AND (
                cs.source_id IS NULL -- Never been in any pay run
                OR (
                    NOT cs.is_paid_elsewhere -- Not paid in other pay runs
                    AND (
                        cs.in_current_run -- Was in this pay run
                        OR NOT cs.is_paid_in_current -- Or not paid in this pay run
                    )
                )
            )
        ),
        -- Calculate tiered commissions
        tiered_commissions AS (
            SELECT 
                a.id as source_id,
                a.total_price * tcs.percentage / 100 as commission_amount
            FROM appointments a
            JOIN bookings b ON b.appointment_id = a.id
            JOIN (
                SELECT
                    employee_id,
                    min_amount,
                    COALESCE(max_amount, float8 'infinity') as max_amount,
                    percentage
                FROM tiered_commission_slabs
                WHERE employee_id = employee_record.id
            ) tcs ON a.total_price >= tcs.min_amount AND a.total_price < tcs.max_amount
            LEFT JOIN commission_status cs ON cs.source_id = a.id
            WHERE a.status = 'completed'
            AND DATE(a.start_time) >= pay_run_record.start_date
            AND DATE(a.start_time) <= pay_run_record.end_date
            AND (
                cs.source_id IS NULL -- Never been in any pay run
                OR (
                    NOT cs.is_paid_elsewhere -- Not paid in other pay runs
                    AND (
                        cs.in_current_run -- Was in this pay run
                        OR NOT cs.is_paid_in_current -- Or not paid in this pay run  
                    )
                )
            )
        )
        -- Insert or update commission items
        INSERT INTO pay_run_items (
            pay_run_id,
            employee_id,
            compensation_type,
            amount,
            source_id,
            source_type,
            description,
            is_paid
        )
        SELECT
            pay_run_id_param,
            employee_record.id,
            'commission',
            CASE 
                WHEN fc.commission_amount IS NOT NULL THEN fc.commission_amount
                ELSE tc.commission_amount
            END,
            CASE
                WHEN fc.source_id IS NOT NULL THEN fc.source_id
                ELSE tc.source_id
            END,
            'appointment',
            'Commission for appointment',
            FALSE -- New commissions start as unpaid
        FROM flat_commissions fc
        FULL OUTER JOIN tiered_commissions tc ON tc.source_id = fc.source_id
        WHERE fc.commission_amount IS NOT NULL OR tc.commission_amount IS NOT NULL
        ON CONFLICT (pay_run_id, employee_id, source_id) 
        DO UPDATE SET
            amount = EXCLUDED.amount,
            -- Only update payment status if we're not just recalculating
            is_paid = CASE 
                WHEN recalculate_only THEN pay_run_items.is_paid
                ELSE EXCLUDED.is_paid
            END;
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."calculate_commissions_for_pay_run"("pay_run_id_param" "uuid", "recalculate_only" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_employee_commissions"("employee_id_param" "uuid", "start_date_param" "date", "end_date_param" "date") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    commission_type TEXT;
    total_commission NUMERIC(10,2) := 0;
    total_revenue NUMERIC(10,2) := 0;
    v_booking RECORD;
    v_tiered_slab RECORD;
    v_flat_rule NUMERIC;
    v_global_commission_percentage NUMERIC;
    slab_max NUMERIC(10,2);
    applicable_amount NUMERIC(10,2);
    slab_count INTEGER;
BEGIN
    SELECT COALESCE(ecs.commission_type, 'none') INTO commission_type 
    FROM employee_commission_settings ecs
    WHERE ecs.employee_id = employee_id_param
    ORDER BY ecs.created_at DESC
    LIMIT 1;
    
    RAISE NOTICE 'Employee % commission type: %', employee_id_param, commission_type;
    
    IF commission_type = 'none' THEN
        RAISE NOTICE 'No commission type, returning 0';
        RETURN 0;
    END IF;

    SELECT ecs.global_commission_percentage INTO v_global_commission_percentage
    FROM employee_commission_settings ecs
    WHERE ecs.employee_id = employee_id_param
    ORDER BY ecs.created_at DESC
    LIMIT 1;
    
    IF v_global_commission_percentage IS NULL THEN
        v_global_commission_percentage := 0;
    END IF;
    
    RAISE NOTICE 'Global commission percentage: %', v_global_commission_percentage;
    
    FOR v_booking IN 
        SELECT 
            b.id, 
            b.service_id, 
            b.employee_id,
            b.price_paid
        FROM 
            bookings b
        WHERE 
            b.employee_id = employee_id_param 
            AND b.status = 'completed'
            AND DATE(b.start_time) >= start_date_param
            AND DATE(b.start_time) <= end_date_param
    LOOP
        RAISE NOTICE 'Processing booking % with price %', v_booking.id, v_booking.price_paid;

        IF commission_type = 'flat' THEN
            SELECT percentage INTO v_flat_rule 
            FROM employee_commission_flat_rules 
            WHERE employee_id = employee_id_param 
            AND service_id = v_booking.service_id 
            LIMIT 1;

            IF v_flat_rule IS NOT NULL THEN
                RAISE NOTICE 'Using service-specific flat rule: %', v_flat_rule;
                total_commission := total_commission + (v_booking.price_paid * (v_flat_rule / 100));
            ELSE
                RAISE NOTICE 'Using global commission percentage: %', v_global_commission_percentage;
                total_commission := total_commission + (v_booking.price_paid * (v_global_commission_percentage / 100));
            END IF;
        ELSIF commission_type = 'tiered' THEN
            total_revenue := total_revenue + v_booking.price_paid;
            RAISE NOTICE 'Adding to tiered total revenue: % (cumulative: %)', v_booking.price_paid, total_revenue;
        END IF;
    END LOOP;

    IF commission_type = 'tiered' AND total_revenue > 0 THEN
        total_commission := 0;
        
        RAISE NOTICE 'Calculating tiered commission for total revenue: %', total_revenue;
        
        SELECT COUNT(*) INTO slab_count
        FROM tiered_commission_slabs
        WHERE employee_id = employee_id_param;
        
        RAISE NOTICE 'Found % commission slabs for employee %', slab_count, employee_id_param;
        
        IF slab_count = 0 THEN
            RAISE NOTICE 'No tiered slabs found for employee %, using global commission', employee_id_param;
            RETURN total_revenue * (v_global_commission_percentage / 100);
        END IF;

        FOR v_tiered_slab IN 
            SELECT 
                min_amount, 
                max_amount,
                percentage,
                LAG(max_amount) OVER (ORDER BY min_amount ASC) as prev_max
            FROM 
                tiered_commission_slabs
            WHERE 
                employee_id = employee_id_param
            ORDER BY 
                min_amount ASC
        LOOP
            RAISE NOTICE 'Checking slab: min=%, max=%, percentage=%', 
                         v_tiered_slab.min_amount, v_tiered_slab.max_amount, v_tiered_slab.percentage;

            IF v_tiered_slab.min_amount <= total_revenue THEN
                IF v_tiered_slab.max_amount IS NULL OR v_tiered_slab.max_amount > total_revenue THEN
                    slab_max := total_revenue;
                ELSE
                    slab_max := v_tiered_slab.max_amount;
                END IF;

                IF v_tiered_slab.prev_max IS NULL THEN
                    applicable_amount := LEAST(slab_max, total_revenue) - v_tiered_slab.min_amount;
                ELSE
                    applicable_amount := LEAST(slab_max, total_revenue) - v_tiered_slab.prev_max;
                END IF;

                IF applicable_amount < 0 THEN
                    applicable_amount := 0;
                END IF;

                RAISE NOTICE 'Slab applicable amount: % (min: %, max: %)', 
                             applicable_amount, v_tiered_slab.min_amount, slab_max;

                total_commission := total_commission + (applicable_amount * (v_tiered_slab.percentage / 100));

                RAISE NOTICE 'Added commission: % (cumulative: %)', 
                             (applicable_amount * (v_tiered_slab.percentage / 100)), total_commission;
            END IF;
        END LOOP;
    END IF;
    
    RAISE NOTICE 'Final commission amount: %', total_commission;
    RETURN total_commission;
END;
$$;


ALTER FUNCTION "public"."calculate_employee_commissions"("employee_id_param" "uuid", "start_date_param" "date", "end_date_param" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_employee_pay_run_summaries"("pay_run_id_param" "uuid") RETURNS TABLE("employee_id" "uuid", "earnings" numeric, "other" numeric, "total" numeric, "paid" numeric, "toPay" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pri.employee_id,
        COALESCE(SUM(CASE WHEN compensation_type IN ('salary', 'wages', 'commission', 'tips') THEN amount ELSE 0 END), 0) as earnings,
        COALESCE(SUM(CASE WHEN compensation_type NOT IN ('salary', 'wages', 'commission', 'tips') THEN amount ELSE 0 END), 0) as other,
        COALESCE(SUM(amount), 0) as total,
        COALESCE(SUM(CASE WHEN is_paid THEN amount ELSE 0 END), 0) as paid,
        COALESCE(SUM(CASE WHEN NOT is_paid THEN amount ELSE 0 END), 0) as "toPay"
    FROM pay_run_items pri
    WHERE pri.pay_run_id = pay_run_id_param
    GROUP BY pri.employee_id;
END;
$$;


ALTER FUNCTION "public"."calculate_employee_pay_run_summaries"("pay_run_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_pay_run_summary"("pay_run_id_param" "uuid") RETURNS "json"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'earnings', COALESCE(SUM(CASE WHEN compensation_type IN ('salary', 'wages', 'commission', 'tips') THEN amount ELSE 0 END), 0),
        'other', COALESCE(SUM(CASE WHEN compensation_type NOT IN ('salary', 'wages', 'commission', 'tips') THEN amount ELSE 0 END), 0),
        'total', COALESCE(SUM(amount), 0),
        'paid', COALESCE(SUM(CASE WHEN is_paid THEN amount ELSE 0 END), 0),
        'toPay', COALESCE(SUM(CASE WHEN NOT is_paid THEN amount ELSE 0 END), 0),
        'total_employees', (SELECT COUNT(DISTINCT employee_id) FROM pay_run_items WHERE pay_run_id = pay_run_id_param)
    ) INTO result
    FROM pay_run_items
    WHERE pay_run_id = pay_run_id_param;
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."calculate_pay_run_summary"("pay_run_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_salary_for_period"("employee_id_param" "uuid", "start_date_param" "date", "end_date_param" "date") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    base_amount NUMERIC(10,2);
    total_days INTEGER;
    unpaid_leave_days INTEGER;
    daily_rate NUMERIC(10,2);
    final_salary NUMERIC(10,2);
BEGIN    -- Get employee's base salary for the period
    SELECT ecs.base_amount
    INTO base_amount
    FROM employee_compensation_settings ecs
    WHERE ecs.employee_id = employee_id_param
    AND ecs.effective_from <= end_date_param
    AND (ecs.effective_to IS NULL OR ecs.effective_to >= start_date_param)
    ORDER BY ecs.effective_from DESC, created_at DESC
    LIMIT 1;
    
    -- If no compensation settings found, return 0
    IF base_amount IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Calculate total days in period
    total_days := (end_date_param - start_date_param) + 1;
    
    -- Get unpaid leave days
    unpaid_leave_days := calculate_unpaid_leave_days(
        employee_id_param, 
        start_date_param, 
        end_date_param
    );
    
    -- Calculate daily rate (base monthly amount ÷ 30)
    daily_rate := base_amount / 30;
    
    -- Calculate final salary (monthly salary minus unpaid leave deductions)
    final_salary := base_amount - (daily_rate * unpaid_leave_days);
    
    RETURN final_salary;
END;
$$;


ALTER FUNCTION "public"."calculate_salary_for_period"("employee_id_param" "uuid", "start_date_param" "date", "end_date_param" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_suggested_order_quantity"("current_qty" integer, "min_qty" integer, "max_qty" integer) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF current_qty <= min_qty THEN
    RETURN max_qty - current_qty;
  ELSE
    RETURN 0;
  END IF;
END;
$$;


ALTER FUNCTION "public"."calculate_suggested_order_quantity"("current_qty" integer, "min_qty" integer, "max_qty" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_unpaid_leave_days"("employee_id_param" "uuid", "start_date_param" "date", "end_date_param" "date") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    unpaid_leave_days INTEGER := 0;
BEGIN
    -- Count unpaid leave days
    SELECT SUM(
        LEAST(tr.end_date, end_date_param) - 
        GREATEST(tr.start_date, start_date_param) + 1
    )
    INTO unpaid_leave_days
    FROM time_off_requests tr
    WHERE tr.employee_id = employee_id_param
    AND tr.status = 'approved'
    AND tr.leave_type = 'unpaid'
    AND tr.start_date <= end_date_param
    AND tr.end_date >= start_date_param;
    
    RETURN COALESCE(unpaid_leave_days, 0);
END;
$$;


ALTER FUNCTION "public"."calculate_unpaid_leave_days"("employee_id_param" "uuid", "start_date_param" "date", "end_date_param" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_working_days"("start_date_param" "date", "end_date_param" "date") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    total_days INTEGER;
    holidays INTEGER;
BEGIN
    -- Calculate total days in period
    total_days := (end_date_param - start_date_param) + 1;
    
    -- Count holidays from closed_periods
    SELECT COUNT(DISTINCT date_day)
    INTO holidays
    FROM (
        SELECT generate_series(
            GREATEST(cp.start_date, start_date_param)::date, 
            LEAST(cp.end_date, end_date_param)::date, 
            '1 day'::interval
        )::date as date_day
        FROM closed_periods cp
        WHERE cp.start_date <= end_date_param
        AND cp.end_date >= start_date_param
    ) as holiday_days;
    
    -- Return working days (total days minus holidays)
    RETURN total_days - holidays;
END;
$$;


ALTER FUNCTION "public"."calculate_working_days"("start_date_param" "date", "end_date_param" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_refund_reference"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Only apply these checks to new refund transactions
    IF TG_OP = 'INSERT' AND NEW.transaction_type = 'refund' AND NEW.original_appointment_id IS NULL THEN
        RAISE EXCEPTION 'New refund transactions must reference an original appointment';
    END IF;
    IF NEW.transaction_type = 'sale' AND NEW.original_appointment_id IS NOT NULL THEN
        RAISE EXCEPTION 'Sale transactions cannot reference an original appointment';
    END IF;
    -- Prevent self-referencing
    IF NEW.original_appointment_id = NEW.id THEN
        RAISE EXCEPTION 'An appointment cannot reference itself';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_refund_reference"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."commission_delete_all_for_employee"("employee_id_param" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Delete flat commission rules
  DELETE FROM flat_commission_rules
  WHERE employee_id = employee_id_param;
  
  -- Delete tiered commission slabs
  DELETE FROM tiered_commission_slabs
  WHERE employee_id = employee_id_param;
END;
$$;


ALTER FUNCTION "public"."commission_delete_all_for_employee"("employee_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."commission_save_flat_rules"("employee_id_param" "uuid", "rules_json" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- First delete existing rules
  DELETE FROM flat_commission_rules
  WHERE employee_id = employee_id_param;
  
  -- Insert new rules
  INSERT INTO flat_commission_rules (employee_id, service_id, percentage)
  SELECT 
    employee_id_param,
    (rule->>'service_id')::UUID,
    (rule->>'percentage')::NUMERIC
  FROM jsonb_array_elements(rules_json) AS rule;
END;
$$;


ALTER FUNCTION "public"."commission_save_flat_rules"("employee_id_param" "uuid", "rules_json" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."commission_save_tiered_slabs"("employee_id_param" "uuid", "slabs_json" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- First delete existing slabs
  DELETE FROM tiered_commission_slabs
  WHERE employee_id = employee_id_param;
  
  -- Insert new slabs
  INSERT INTO tiered_commission_slabs (employee_id, min_amount, max_amount, percentage, order_index)
  SELECT 
    employee_id_param,
    (slab->>'min_amount')::NUMERIC,
    CASE WHEN slab->>'max_amount' IS NULL THEN NULL ELSE (slab->>'max_amount')::NUMERIC END,
    (slab->>'percentage')::NUMERIC,
    (slab->>'order_index')::INTEGER
  FROM jsonb_array_elements(slabs_json) AS slab;
END;
$$;


ALTER FUNCTION "public"."commission_save_tiered_slabs"("employee_id_param" "uuid", "slabs_json" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_appointment_and_bookings"("customer_id_param" "uuid", "total_price_param" numeric, "booking_data" "jsonb"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    new_appointment_id UUID;
BEGIN
    -- Insert into appointments
    INSERT INTO appointments (customer_id, total_price)
    VALUES (customer_id_param, total_price_param)
    RETURNING id INTO new_appointment_id;

    -- Insert into bookings
    FOR i IN 1..array_length(booking_data, 1) LOOP
        INSERT INTO bookings (appointment_id, id, price_paid) -- Assuming you have a booking_id in the booking_data
        VALUES (new_appointment_id, (booking_data[i]->>'bookingId')::UUID, (booking_data[i]->>'price_paid')::NUMERIC);
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."create_appointment_and_bookings"("customer_id_param" "uuid", "total_price_param" numeric, "booking_data" "jsonb"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Ensure a stub row
  INSERT INTO public.profiles (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;

  -- Populate only the columns that actually exist
  UPDATE public.profiles
    SET
      full_name    = COALESCE(NEW.raw_user_meta_data->>'full_name',''),
      phone_number = COALESCE(NEW.raw_user_meta_data->>'phone',NULL)
  WHERE id = NEW.id;

  -- (optional) set role as before…
  BEGIN
    UPDATE public.profiles
      SET role = public.safe_cast_to_user_role(
                   COALESCE(NEW.raw_user_meta_data->>'role','customer')
                 )
    WHERE id = NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not set role for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_profile_basic"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Create the profile with minimal fields, setting only what's absolutely needed
    INSERT INTO public.profiles (
        id,
        full_name,
        email,
        role
    ) VALUES (
        NEW.id, -- Use the auth user's id directly 
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.email, ''),
        'customer'
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error in create_profile_basic: %', SQLERRM;
    RETURN NEW; -- Always return NEW to ensure user creation succeeds
END;
$$;


ALTER FUNCTION "public"."create_profile_basic"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_profile_for_user"("auth_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    profile_id uuid;
BEGIN
    -- Generate a new UUID for the profile
    profile_id := gen_random_uuid();
    
    -- Insert with the generated UUID and the auth user ID
    INSERT INTO public.profiles (id, user_id)
    VALUES (profile_id, auth_user_id);
    
    RETURN profile_id;
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create profile: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."create_profile_for_user"("auth_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_profile_on_signup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Simple insert with basic required fields
    INSERT INTO public.profiles (
        id, 
        full_name,
        email,
        role
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.email, ''),
        'customer'
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error in profile creation: %', SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_profile_on_signup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- This assumes the foreign key is from profiles.user_id to auth.users.id
    -- which means user_id should point to the auth user id
    INSERT INTO public.profiles (id, user_id) 
    VALUES (
        gen_random_uuid(), -- Generate a new UUID for the profile
        NEW.id            -- Use the auth user's ID as the foreign key
    );
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error in create_user_profile: %', SQLERRM;
    RETURN NEW; -- Don't block user creation
END;
$$;


ALTER FUNCTION "public"."create_user_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_profile"("user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.profiles (id)
    VALUES (user_uuid)
    ON CONFLICT (id) DO NOTHING;
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error in create_user_profile: %', SQLERRM;
    RETURN false;
END;
$$;


ALTER FUNCTION "public"."create_user_profile"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_claim"("uid" "uuid", "claim" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    BEGIN
      IF NOT is_claims_admin() THEN
          RETURN 'error: access denied';
      ELSE        
        update auth.users set raw_app_meta_data = 
          raw_app_meta_data - claim where id = uid;
        return 'OK';
      END IF;
    END;
$$;


ALTER FUNCTION "public"."delete_claim"("uid" "uuid", "claim" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    DELETE FROM public.profiles WHERE user_id = OLD.id;
    RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."delete_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_related_records"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Delete related profiles if they exist
    DELETE FROM profiles WHERE user_id = OLD.id;

    -- Delete related appointments if they exist
    DELETE FROM appointments WHERE customer_id IN (SELECT id FROM profiles WHERE user_id = OLD.id);

    -- Only delete the employee record if it exists
    DELETE FROM employees WHERE auth_id = OLD.id;

    RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."delete_related_records"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Check if the profile exists for the user being deleted
    IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = OLD.id) THEN
        DELETE FROM public.profiles WHERE user_id = OLD.id;
    END IF;
    RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."delete_user_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."diagnose_commission_calculations"("employee_id_param" "uuid" DEFAULT NULL::"uuid", "date_range_param" integer DEFAULT 30) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    result JSONB;
    today DATE := CURRENT_DATE;
    start_date DATE := today - date_range_param;
    end_date DATE := today;
    v_employee RECORD;
    employee_results JSONB := '[]';
    commission_amount NUMERIC(10,2);
    employee_settings JSONB;
    booking_count INTEGER;
    total_revenue NUMERIC(10,2);
    slab_info JSONB;
BEGIN
    -- If employee_id is provided, only check that employee
    IF employee_id_param IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM employees WHERE id = employee_id_param) THEN
            RETURN jsonb_build_object('error', 'Employee not found');
        END IF;
        
        FOR v_employee IN 
            SELECT e.id, e.name, e.status 
            FROM employees e 
            WHERE e.id = employee_id_param
        LOOP
            -- Get employee commission settings
            SELECT 
                jsonb_build_object(
                    'commission_type', COALESCE(ecs.commission_type, 'none'),
                    'global_percentage', COALESCE(ecs.global_commission_percentage, 0),
                    'created_at', ecs.created_at
                ) INTO employee_settings
            FROM employee_commission_settings ecs
            WHERE ecs.employee_id = v_employee.id
            ORDER BY ecs.created_at DESC
            LIMIT 1;
            
            IF employee_settings IS NULL THEN
                employee_settings := jsonb_build_object(
                    'commission_type', 'none',
                    'global_percentage', 0,
                    'created_at', NULL
                );
            END IF;
            
            -- Count bookings and total revenue
            SELECT COUNT(*), COALESCE(SUM(b.price_paid), 0)
            INTO booking_count, total_revenue
            FROM bookings b
            WHERE b.employee_id = v_employee.id
            AND b.status = 'completed'
            AND DATE(b.start_time) >= start_date
            AND DATE(b.start_time) <= end_date;
            
            -- Get commission slabs if any
            SELECT jsonb_agg(
                jsonb_build_object(
                    'slab_index', ROW_NUMBER() OVER (ORDER BY tcs.min_amount),
                    'min_amount', tcs.min_amount,
                    'max_amount', tcs.max_amount,
                    'percentage', tcs.percentage
                )
            ) INTO slab_info
            FROM tiered_commission_slabs tcs
            WHERE tcs.employee_id = v_employee.id
            ORDER BY tcs.min_amount;
            
            IF slab_info IS NULL THEN
                slab_info := '[]';
            END IF;
            
            -- Calculate commission
            commission_amount := calculate_employee_commissions(
                v_employee.id, 
                start_date,
                end_date
            );
            
            -- Add this employee to results
            employee_results := employee_results || jsonb_build_object(
                'employee_id', v_employee.id,
                'name', v_employee.name,
                'status', v_employee.status,
                'commission_settings', employee_settings,
                'bookings_count', booking_count,
                'total_revenue', total_revenue,
                'commission_slabs', slab_info,
                'calculated_commission', commission_amount
            );
        END LOOP;
    ELSE
        -- Get all active employees with commission settings
        FOR v_employee IN 
            SELECT DISTINCT e.id, e.name, e.status 
            FROM employees e
            JOIN employee_commission_settings ecs ON e.id = ecs.employee_id
            WHERE e.status = 'active'
        LOOP
            -- Get employee commission settings
            SELECT 
                jsonb_build_object(
                    'commission_type', COALESCE(ecs.commission_type, 'none'),
                    'global_percentage', COALESCE(ecs.global_commission_percentage, 0),
                    'created_at', ecs.created_at
                ) INTO employee_settings
            FROM employee_commission_settings ecs
            WHERE ecs.employee_id = v_employee.id
            ORDER BY ecs.created_at DESC
            LIMIT 1;
            
            -- Count bookings and total revenue
            SELECT COUNT(*), COALESCE(SUM(b.price_paid), 0)
            INTO booking_count, total_revenue
            FROM bookings b
            WHERE b.employee_id = v_employee.id
            AND b.status = 'completed'
            AND DATE(b.start_time) >= start_date
            AND DATE(b.start_time) <= end_date;
            
            -- Get commission slabs if any
            SELECT jsonb_agg(
                jsonb_build_object(
                    'slab_index', ROW_NUMBER() OVER (ORDER BY tcs.min_amount),
                    'min_amount', tcs.min_amount,
                    'max_amount', tcs.max_amount,
                    'percentage', tcs.percentage
                )
            ) INTO slab_info
            FROM tiered_commission_slabs tcs
            WHERE tcs.employee_id = v_employee.id
            ORDER BY tcs.min_amount;
            
            IF slab_info IS NULL THEN
                slab_info := '[]';
            END IF;
            
            -- Calculate commission
            commission_amount := calculate_employee_commissions(
                v_employee.id, 
                start_date,
                end_date
            );
            
            -- Add this employee to results
            employee_results := employee_results || jsonb_build_object(
                'employee_id', v_employee.id,
                'name', v_employee.name,
                'status', v_employee.status,
                'commission_settings', employee_settings,
                'bookings_count', booking_count,
                'total_revenue', total_revenue,
                'commission_slabs', slab_info,
                'calculated_commission', commission_amount
            );
        END LOOP;
    END IF;
    
    -- Build final result
    result := jsonb_build_object(
        'date_range', jsonb_build_object('start_date', start_date, 'end_date', end_date),
        'employees', employee_results
    );
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."diagnose_commission_calculations"("employee_id_param" "uuid", "date_range_param" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_email_or_phone_on_user_creation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    phone_val text;
BEGIN
    -- Try to get phone from both possible metadata fields
    phone_val := NEW.user_metadata->>'phone';
    
    IF phone_val IS NULL OR phone_val = '' THEN
        phone_val := NEW.raw_user_meta_data->>'phone';
    END IF;
    
    -- Check if either email or phone number is provided
    IF NEW.email IS NULL AND (phone_val IS NULL OR phone_val = '') THEN
        RAISE EXCEPTION 'Either email or phone number must be provided for user creation';
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_email_or_phone_on_user_creation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_pay_run_items_payment_status"("pay_run_id_param" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- If pay_run_id is provided, only update items for that pay run
    IF pay_run_id_param IS NOT NULL THEN
        UPDATE pay_run_items pri
        SET is_paid = (pr.status = 'paid')
        FROM pay_runs pr
        WHERE pri.pay_run_id = pr.id
        AND pri.pay_run_id = pay_run_id_param;
    ELSE
        -- Update all pay run items based on their pay run status
        UPDATE pay_run_items pri
        SET is_paid = (pr.status = 'paid')
        FROM pay_runs pr
        WHERE pri.pay_run_id = pr.id;
    END IF;
END;
$$;


ALTER FUNCTION "public"."ensure_pay_run_items_payment_status"("pay_run_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_user_id_matches_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Always ensure user_id equals id
    NEW.user_id := NEW.id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_user_id_matches_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fix_payment_status_after_populate"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Call the function to ensure payment status is correct
    PERFORM ensure_pay_run_items_payment_status(NEW.pay_run_id);
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fix_payment_status_after_populate"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_claim"("uid" "uuid", "claim" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    DECLARE retval jsonb;
    BEGIN
      IF NOT is_claims_admin() THEN
          RETURN '{"error":"access denied"}'::jsonb;
      ELSE
        select coalesce(raw_app_meta_data->claim, null) from auth.users into retval where id = uid::uuid;
        return retval;
      END IF;
    END;
$$;


ALTER FUNCTION "public"."get_claim"("uid" "uuid", "claim" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_claims"("uid" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    DECLARE retval jsonb;
    BEGIN
      IF NOT is_claims_admin() THEN
          RETURN '{"error":"access denied"}'::jsonb;
      ELSE
        select raw_app_meta_data from auth.users into retval where id = uid::uuid;
        return retval;
      END IF;
    END;
$$;


ALTER FUNCTION "public"."get_claims"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_customer_appointments"("customer_id_param" "uuid") RETURNS TABLE("appointment_id" "uuid", "customer_id" "uuid", "start_time" timestamp with time zone, "end_time" timestamp with time zone, "appointment_notes" "text", "appointment_status" "text", "booking_id" "uuid", "service_id" "uuid", "package_id" "uuid", "employee_id" "uuid", "booking_status" "text", "service" "json", "package" "json", "employee" "json")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id AS appointment_id,
    a.customer_id,
    a.start_time,
    a.end_time,
    a.notes AS appointment_notes,
    a.status AS appointment_status,
    b.id AS booking_id,
    b.service_id,
    b.package_id,
    b.employee_id,
    b.status AS booking_status,
    json_build_object('id', s.id, 'name', s.name, 'selling_price', s.selling_price, 'duration', s.duration) AS service, -- Removed s.image
    json_build_object('id', p.id, 'name', p.name, 'price', p.price) AS package, -- Removed p.image
    json_build_object('id', e.id, 'name', e.name) AS employee
  FROM appointments a
  INNER JOIN bookings b ON a.id = b.appointment_id
  LEFT JOIN services s ON b.service_id = s.id
  LEFT JOIN packages p ON b.package_id = p.id
  LEFT JOIN employees e ON b.employee_id = e.id
  WHERE a.customer_id = customer_id_param;
END;
$$;


ALTER FUNCTION "public"."get_customer_appointments"("customer_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_customer_bookings"("customer_id_param" "uuid") RETURNS TABLE("appointment_id" "uuid", "customer_id" "uuid", "start_time" timestamp with time zone, "end_time" timestamp with time zone, "appointment_notes" "text", "appointment_status" "text", "bookings" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id AS appointment_id,
    a.customer_id,
    a.start_time,
    a.end_time,
    a.notes AS appointment_notes,
    a.status AS appointment_status,
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'booking_id', b.id,
                'service_id', b.service_id,
                'package_id', b.package_id,
                'employee_id', b.employee_id,
                'booking_status', b.status,
                'service', s,
                'package', p,
                'employee', e
            )
        ) FILTER (WHERE b.id IS NOT NULL),
        '[]'::jsonb
    ) AS bookings
FROM
    appointments a
LEFT JOIN
    bookings b ON a.id = b.appointment_id
LEFT JOIN
    services s ON b.service_id = s.id
LEFT JOIN
    packages p ON b.package_id = p.id
LEFT JOIN
    employees e ON b.employee_id = e.id
WHERE
    a.customer_id = customer_id_param  -- Using the original parameter name
GROUP BY a.id
ORDER BY a.start_time;
END;
$$;


ALTER FUNCTION "public"."get_customer_bookings"("customer_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_claim"("claim" "text") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  	coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'app_metadata' -> claim, null)
$$;


ALTER FUNCTION "public"."get_my_claim"("claim" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_claims"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  	coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'app_metadata', '{}'::jsonb)::jsonb
$$;


ALTER FUNCTION "public"."get_my_claims"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_recent_sales"("days_param" integer DEFAULT 30, "limit_param" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "customer_id" "uuid", "customer_name" "text", "customer_email" "text", "customer_phone" "text", "amount" numeric, "created_at" timestamp with time zone, "sale_type" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  
  -- Get appointment sales 
  SELECT 
    a.id,
    a.customer_id,
    p.full_name AS customer_name,
    p.email AS customer_email,
    p.phone_number AS customer_phone,
    a.total_price AS amount,
    a.created_at,
    'appointment'::text AS sale_type
  FROM appointments a
  JOIN profiles p ON a.customer_id = p.id
  WHERE a.created_at >= (CURRENT_DATE - (days_param || ' days')::interval)
  AND a.transaction_type = 'sale'
  
  UNION ALL
  
  -- Get membership sales
  SELECT 
    ms.id,
    ms.customer_id,
    p.full_name AS customer_name,
    p.email AS customer_email,
    p.phone_number AS customer_phone,
    ms.total_amount AS amount,
    ms.sale_date AS created_at,
    'membership'::text AS sale_type
  FROM membership_sales ms
  JOIN profiles p ON ms.customer_id = p.id
  WHERE ms.sale_date >= (CURRENT_DATE - (days_param || ' days')::interval)
  AND ms.status = 'completed'
  
  ORDER BY created_at DESC
  LIMIT limit_param;
END;
$$;


ALTER FUNCTION "public"."get_recent_sales"("days_param" integer, "limit_param" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_admin_permissions"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- If this is the Admin role or not configurable, clear the permissions array
  -- Admin roles implicitly have all permissions
  IF NEW.name = 'Admin' OR NEW.is_configurable = false THEN
    NEW.permissions = '[]'::jsonb;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_admin_permissions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_appointment_booking_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  twilioConfig JSONB;
BEGIN
  -- This function will be triggered after an insertion into the appointments table
  -- Get the appointment details and send a notification
  
  -- We'll use a direct database function call instead of an HTTP request
  -- to avoid hardcoding URLs and API keys
  PERFORM public.send_appointment_notification_internal(NEW.id, 'booking_confirmation');
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log any errors but don't prevent the insert from completing
    RAISE NOTICE 'Error sending appointment notification: %', SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_appointment_booking_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_booking_auto_consumption"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    appointment_location_id UUID;
BEGIN
    -- Only process completed bookings
    IF NEW.status = 'completed' THEN

        -- Get the location ID from the appointment
        SELECT location INTO appointment_location_id
        FROM appointments
        WHERE id = NEW.appointment_id
        LIMIT 1;

        -- Insert inventory transaction records for required items
        INSERT INTO inventory_transactions (
            item_id,
            quantity,
            transaction_type,
            notes
        )
        SELECT 
            sir.item_id,
            -sir.quantity_required,  -- Negative for consumption
            'consumption',
            'Auto-consumed for service: ' || s.name
        FROM service_inventory_requirements sir
        JOIN services s ON s.id = sir.service_id
        WHERE sir.service_id = NEW.service_id;

        -- Lock inventory tables to prevent race conditions
        LOCK TABLE inventory_location_items IN ROW EXCLUSIVE MODE;
        LOCK TABLE inventory_items IN ROW EXCLUSIVE MODE;

        -- Update location-specific inventory if location exists
        IF appointment_location_id IS NOT NULL THEN
            UPDATE inventory_location_items ili
            SET quantity = ili.quantity - sir.quantity_required
            FROM service_inventory_requirements sir
            WHERE sir.item_id = ili.item_id
              AND sir.service_id = NEW.service_id
              AND ili.location_id = appointment_location_id;
              
            -- Update global inventory totals based on the sum of all location quantities
            UPDATE inventory_items ii
            SET quantity = (
                SELECT COALESCE(SUM(ili.quantity), 0)
                FROM inventory_location_items ili
                WHERE ili.item_id = ii.id
            )
            FROM service_inventory_requirements sir
            WHERE sir.item_id = ii.id
              AND sir.service_id = NEW.service_id;
        ELSE
            -- If no location specified, update only the global inventory
            UPDATE inventory_items ii
            SET quantity = ii.quantity - sir.quantity_required
            FROM service_inventory_requirements sir
            WHERE sir.item_id = ii.id
              AND sir.service_id = NEW.service_id;
        END IF;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in handle_booking_auto_consumption: %', SQLERRM;
        RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_booking_auto_consumption"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'auth', 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone_number)
    VALUES (NEW.id,
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'phone_number');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_phone_verification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.profiles 
  SET phone_verified = true 
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_phone_verification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_user_and_profile_creation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Don't try to set user_id equal to id, since they're different tables with a FK relationship
    -- Instead, we need to set user_id to reference the correct auth user
    
    BEGIN
        INSERT INTO public.profiles (id, user_id)
        VALUES (gen_random_uuid(), NEW.id);  -- Generate a new UUID for the profile's primary key
        
        RAISE NOTICE 'Created profile for user %', NEW.id;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error creating profile: %', SQLERRM;
    END;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_user_and_profile_creation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_customer_visit_count"("customer_id_param" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE "public"."profiles"
    SET "visit_count" = COALESCE("visit_count", 0) + 1
    WHERE "id" = customer_id_param;
END;
$$;


ALTER FUNCTION "public"."increment_customer_visit_count"("customer_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    );
  $$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_claims_admin"() RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
  BEGIN
    IF session_user = 'authenticator' THEN
      --------------------------------------------
      -- To disallow any authenticated app users
      -- from editing claims, delete the following
      -- block of code and replace it with:
      -- RETURN FALSE;
      --------------------------------------------
      IF extract(epoch from now()) > coalesce((current_setting('request.jwt.claims', true)::jsonb)->>'exp', '0')::numeric THEN
        return false; -- jwt expired
      END IF;
      If current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' THEN
        RETURN true; -- service role users have admin rights
      END IF;
      IF coalesce((current_setting('request.jwt.claims', true)::jsonb)->'app_metadata'->'claims_admin', 'false')::bool THEN
        return true; -- user has claims_admin set to true
      ELSE
        return false; -- user does NOT have claims_admin set to true
      END IF;
      --------------------------------------------
      -- End of block 
      --------------------------------------------
    ELSE -- not a user session, probably being called from a trigger or something
      return true;
    END IF;
  END;
$$;


ALTER FUNCTION "public"."is_claims_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."populate_pay_run_items"("pay_run_id_param" "uuid", "only_unpaid_param" boolean DEFAULT false) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    pay_run_record RECORD;
    employee_record RECORD;
    salary_amount NUMERIC(10,2);
BEGIN
    -- Get pay run information
    SELECT pr.id, pr.pay_period_id, pp.start_date, pp.end_date, pr.location_id
    INTO pay_run_record
    FROM pay_runs pr
    JOIN pay_periods pp ON pr.pay_period_id = pp.id
    WHERE pr.id = pay_run_id_param;
    
    -- Process each active employee
    FOR employee_record IN 
        SELECT e.id
        FROM employees e
        WHERE e.status = 'active'
        AND (
            pay_run_record.location_id IS NULL 
            OR EXISTS (
                SELECT 1 FROM employee_locations el 
                WHERE el.employee_id = e.id 
                AND el.location_id = pay_run_record.location_id
            )
        )
    LOOP
        -- Calculate salary (as in original function)
        salary_amount := calculate_salary_for_period(
            employee_record.id, 
            pay_run_record.start_date, 
            pay_run_record.end_date
        );
        
        -- Insert salary pay run item if amount > 0
        IF salary_amount > 0 THEN
            INSERT INTO pay_run_items (
                pay_run_id, 
                employee_id, 
                compensation_type, 
                amount,
                description
            ) VALUES (
                pay_run_id_param,
                employee_record.id,
                'salary',
                salary_amount,
                'Salary for period ' || pay_run_record.start_date || ' to ' || pay_run_record.end_date
            );
        END IF;
    END LOOP;    -- Handle commission items    
    WITH latest_commission_settings AS (
        SELECT DISTINCT ON (employee_id) 
            employee_id, 
            global_commission_percentage,
            commission_type
        FROM employee_commission_settings
        ORDER BY employee_id, created_at DESC
    ),    commission_status AS (
        -- Get status of all commissions in any pay run
        SELECT 
            pri.source_id,
            bool_or(pr.status = 'paid') as is_paid,
            bool_or(pr.id = pay_run_id_param) as in_current_run
        FROM pay_run_items pri
        JOIN pay_runs pr ON pri.pay_run_id = pr.id
        WHERE pri.compensation_type = 'commission' 
        AND pri.source_type = 'service'
        GROUP BY pri.source_id
    )
    INSERT INTO pay_run_items (
        pay_run_id, 
        employee_id, 
        compensation_type, 
        amount,
        description,
        source_id,
        source_type
    )
    SELECT 
        pay_run_id_param,
        s.employee_id,
        'commission',
        ROUND(s.price_paid * COALESCE(ecs.global_commission_percentage, 0) / 100.0, 2),
        'Commission for ' || srv.name,
        s.id,
        'service'
    FROM 
        bookings s
        JOIN employees e ON s.employee_id = e.id
        JOIN appointments a ON s.appointment_id = a.id
        LEFT JOIN services srv ON s.service_id = srv.id
        LEFT JOIN latest_commission_settings ecs ON s.employee_id = ecs.employee_id        LEFT JOIN commission_status cs ON s.id = cs.source_id
    WHERE 
        a.status = 'completed'
        AND DATE(a.start_time) >= pay_run_record.start_date
        AND DATE(a.start_time) <= pay_run_record.end_date
        AND (
            cs.source_id IS NULL -- Never been in any pay run
            OR (
                NOT cs.is_paid -- Not paid in any pay run
                AND NOT cs.in_current_run -- Not already in this pay run
            )
        );
END;
$$;


ALTER FUNCTION "public"."populate_pay_run_items"("pay_run_id_param" "uuid", "only_unpaid_param" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_commissions_for_pay_run"("pay_run_id_param" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."recalculate_commissions_for_pay_run"("pay_run_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_old_verification_codes"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    DELETE FROM phone_auth_codes 
    WHERE created_at < NOW() - INTERVAL '5 minutes';
END;
$$;


ALTER FUNCTION "public"."remove_old_verification_codes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."safe_cast_to_user_role"("role_text" "text") RETURNS "public"."user_role"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- First check if the input is a valid enum value
    BEGIN
        RETURN role_text::public.user_role;
    EXCEPTION WHEN invalid_text_representation THEN
        -- If not valid, return a default value
        RETURN 'customer'::public.user_role;
    END;
END;
$$;


ALTER FUNCTION "public"."safe_cast_to_user_role"("role_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_appointment_notification_internal"("appointment_id" "uuid", "notification_type" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  appointment_record RECORD;
  customer_record RECORD;
  services_text TEXT;
  location_name TEXT;
  appointment_date TIMESTAMP WITH TIME ZONE;
  formatted_date TEXT;
  formatted_time TEXT;
  message TEXT;
  twilio_config RECORD;
BEGIN
  -- Get appointment details
  SELECT a.*, p.full_name, p.phone_number
  INTO appointment_record
  FROM appointments a
  JOIN profiles p ON a.customer_id = p.id
  WHERE a.id = appointment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;
  
  IF appointment_record.phone_number IS NULL THEN
    RAISE EXCEPTION 'Customer has no phone number registered';
  END IF;
  
  -- Get location name if available
  IF appointment_record.location IS NOT NULL THEN
    SELECT name INTO location_name
    FROM locations
    WHERE id = appointment_record.location::UUID;
  ELSE
    location_name := 'our salon';
  END IF;
  
  -- Get service names
  SELECT string_agg(COALESCE(s.name, p.name), ', ')
  INTO services_text
  FROM bookings b
  LEFT JOIN services s ON b.service_id = s.id
  LEFT JOIN packages p ON b.package_id = p.id
  WHERE b.appointment_id = appointment_id;
  
  -- Format appointment date/time
  appointment_date := appointment_record.start_time;
  formatted_date := to_char(appointment_date, 'Day, Month DD, YYYY');
  formatted_time := to_char(appointment_date, 'HH12:MI AM');
  
  -- Compose message based on notification type
  CASE notification_type
    WHEN 'booking_confirmation' THEN
      message := 'Hello ' || appointment_record.full_name || 
                 ',

Thank you for booking with us! Your appointment has been scheduled at ' || 
                 location_name || ' on ' || formatted_date || ' at ' || formatted_time || 
                 '.

Service(s): ' || COALESCE(services_text, 'No services specified') || 
                 '

We look forward to seeing you!';
    ELSE
      message := 'Hello ' || appointment_record.full_name || 
                 ',

This is a reminder about your upcoming appointment at ' || 
                 location_name || ' on ' || formatted_date || ' at ' || formatted_time || 
                 '.

Service(s): ' || COALESCE(services_text, 'No services specified') || 
                 '

We look forward to seeing you!';
  END CASE;
  
  -- Get Twilio configuration
  SELECT * INTO twilio_config 
  FROM system_settings
  WHERE category = 'twilio' AND is_active = TRUE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Twilio is not configured or not active';
  END IF;
  
  -- Store the notification in a new table for processing
  -- This decouples the notification from synchronous processing
  INSERT INTO notification_queue (
    appointment_id,
    notification_type,
    recipient_number,
    message_content,
    status
  ) VALUES (
    appointment_id,
    notification_type,
    appointment_record.phone_number,
    message,
    'pending'
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error preparing notification: %', SQLERRM;
    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."send_appointment_notification_internal"("appointment_id" "uuid", "notification_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_claim"("uid" "uuid", "claim" "text", "value" "jsonb") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    BEGIN
      IF NOT is_claims_admin() THEN
          RETURN 'error: access denied';
      ELSE        
        update auth.users set raw_app_meta_data = 
          raw_app_meta_data || 
            json_build_object(claim, value)::jsonb where id = uid;
        return 'OK';
      END IF;
    END;
$$;


ALTER FUNCTION "public"."set_claim"("uid" "uuid", "claim" "text", "value" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_default_role_on_profile_creation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Set the default role to 'customer' if not provided
    IF NEW.role IS NULL THEN
        NEW.role := 'customer'::public.user_role;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_default_role_on_profile_creation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."simple_create_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Just insert the ID - the trigger on profiles will handle setting user_id
    INSERT INTO public.profiles (id) VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."simple_create_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_customer_analytics_cache"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    customer_data RECORD;
    segment_type TEXT;
BEGIN
    -- Get customer statistics
    SELECT 
        COUNT(*) as appointment_count,
        COALESCE(SUM(final_total), 0) as total_spent,
        COALESCE(AVG(final_total), 0) as avg_value,
        MAX(appointment_date) as last_visit
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
    
    -- Update cache
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
    
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."update_customer_analytics_cache"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_daily_metrics_cache"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    target_date DATE;
    target_location UUID;
BEGIN
    target_date := DATE(COALESCE(NEW.appointment_date, OLD.appointment_date));
    target_location := COALESCE(NEW.location::UUID, OLD.location::UUID);
    
    -- Recalculate daily metrics for the affected date
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
        COALESCE(SUM(final_total) FILTER (WHERE status = 'completed'), 0) as total_revenue,
        COUNT(DISTINCT customer_id) FILTER (WHERE 
            customer_id IN (
                SELECT customer_id FROM appointments 
                WHERE customer_id = appointments.customer_id 
                AND DATE(appointment_date) = target_date
                AND appointment_date = (
                    SELECT MIN(appointment_date) 
                    FROM appointments a2 
                    WHERE a2.customer_id = appointments.customer_id
                )
            )
        ) as new_customers,
        COUNT(DISTINCT customer_id) FILTER (WHERE 
            customer_id NOT IN (
                SELECT customer_id FROM appointments 
                WHERE customer_id = appointments.customer_id 
                AND DATE(appointment_date) = target_date
                AND appointment_date = (
                    SELECT MIN(appointment_date) 
                    FROM appointments a2 
                    WHERE a2.customer_id = appointments.customer_id
                )
            )
        ) as returning_customers
    FROM appointments
    WHERE DATE(appointment_date) = target_date
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
    
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."update_daily_metrics_cache"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_employment_type_permissions"("type_id" "uuid", "perms_json" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE employment_types
  SET 
    permissions = perms_json::jsonb,
    updated_at = NOW()
  WHERE id = type_id;
END;
$$;


ALTER FUNCTION "public"."update_employment_type_permissions"("type_id" "uuid", "perms_json" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_pay_run_items_payment_status"("p_pay_run_id" "uuid", "p_employee_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_payment_reference TEXT;
BEGIN
    -- Generate a unique payment reference
    v_payment_reference := 'PAY-' || p_pay_run_id::text || '-' || NOW()::text;
    
    -- Update pay run status and paid_date
    UPDATE pay_runs 
    SET status = 'paid',
        paid_date = NOW()
    WHERE id = p_pay_run_id;
    
    -- Update pay run items for the specified employees
    UPDATE pay_run_items
    SET is_paid = TRUE,
        paid_date = NOW(),
        payment_reference = v_payment_reference
    WHERE pay_run_id = p_pay_run_id
    AND employee_id = ANY(p_employee_ids)
    AND is_paid = FALSE;
END;
$$;


ALTER FUNCTION "public"."update_pay_run_items_payment_status"("p_pay_run_id" "uuid", "p_employee_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_pay_run_items_payment_status"("pay_run_id_param" "uuid", "payment_reference_param" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    payment_ref TEXT;
BEGIN
    -- Generate a payment reference if not provided
    payment_ref := COALESCE(
        payment_reference_param, 
        'PAY-' || pay_run_id_param::text || '-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS')
    );

    -- Update payment status for all items in the pay run
    UPDATE pay_run_items
    SET 
        is_paid = TRUE,
        paid_date = NOW(),
        payment_reference = payment_ref
    WHERE pay_run_id = pay_run_id_param
    AND is_paid = FALSE;

    -- Update the pay run status to 'paid' and set paid_date
    UPDATE pay_runs
    SET 
        status = 'paid',
        paid_date = NOW()
    WHERE id = pay_run_id_param;
END;
$$;


ALTER FUNCTION "public"."update_pay_run_items_payment_status"("pay_run_id_param" "uuid", "payment_reference_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_pay_run_items_payment_status"("p_pay_run_id" "uuid", "p_employee_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_payment_reference" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_payment_ref TEXT;
BEGIN
    -- Generate a payment reference if not provided
    v_payment_ref := COALESCE(
        p_payment_reference, 
        'PAY-' || p_pay_run_id::text || '-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS')
    );

    -- Update payment status for items in the pay run
    UPDATE pay_run_items
    SET is_paid = TRUE,
        paid_date = NOW(),
        payment_reference = v_payment_ref
    WHERE pay_run_id = p_pay_run_id
    AND is_paid = FALSE
    AND (
        p_employee_ids IS NULL -- If no employee IDs provided, update all
        OR employee_id = ANY(p_employee_ids) -- Otherwise, only update specified employees
    );

    -- If all items in the pay run are paid, update the pay run status
    UPDATE pay_runs pr
    SET status = 'paid',
        paid_date = NOW()
    WHERE id = p_pay_run_id
    AND NOT EXISTS (
        SELECT 1 
        FROM pay_run_items pri 
        WHERE pri.pay_run_id = pr.id 
        AND pri.is_paid = FALSE
    );
END;
$$;


ALTER FUNCTION "public"."update_pay_run_items_payment_status"("p_pay_run_id" "uuid", "p_employee_ids" "uuid"[], "p_payment_reference" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_pay_run_status"("pay_run_id_param" "uuid", "new_status" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Validate the status
    IF new_status NOT IN ('pending', 'paid', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status: %', new_status;
    END IF;

    -- Update the status for all pending items in this pay run
    UPDATE pay_run_items
    SET status = new_status
    WHERE pay_run_id = pay_run_id_param
    AND status = 'pending';

    -- If marking as paid, also update the pay run status
    IF new_status = 'paid' THEN
        UPDATE pay_runs
        SET status = 'paid',
            paid_at = CURRENT_TIMESTAMP
        WHERE id = pay_run_id_param;
    END IF;
END;
$$;


ALTER FUNCTION "public"."update_pay_run_status"("pay_run_id_param" "uuid", "new_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_payrun_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_payrun_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_phone_number_on_login"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE public.profiles
    SET phone_number = NEW.phone  -- Ensure this matches the correct field name
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_phone_number_on_login"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_referrer_wallet"("customer_id_param" "uuid", "referrer_id_param" "uuid", "amount" numeric) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Verify customer and referrer exist
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = customer_id_param) THEN
      RAISE EXCEPTION 'Customer with ID % not found', customer_id_param;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = referrer_id_param) THEN
      RAISE EXCEPTION 'Referrer with ID % not found', referrer_id_param;
    END IF;
    
    -- Check that customer and referrer are different people
    IF customer_id_param = referrer_id_param THEN
      RAISE EXCEPTION 'Customer and referrer cannot be the same person';
    END IF;
    
    -- Update the referrer's wallet balance
    UPDATE public.profiles
    SET referral_wallet = COALESCE(referral_wallet, 0) + amount
    WHERE id = referrer_id_param;
END;
$$;


ALTER FUNCTION "public"."update_referrer_wallet"("customer_id_param" "uuid", "referrer_id_param" "uuid", "amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."appointments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "location" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "number_of_bookings" integer DEFAULT 0,
    "status" "public"."appointment_status",
    "total_price" numeric NOT NULL,
    "total_duration" bigint,
    "discount_type" "text" DEFAULT 'none'::"text",
    "discount_value" numeric DEFAULT 0,
    "payment_method" "text" DEFAULT 'cash'::"text",
    "refund_reason" "text",
    "refunded_by" "uuid",
    "refund_notes" "text",
    "transaction_type" "text" DEFAULT 'sale'::"text",
    "original_appointment_id" "uuid",
    "tax_amount" numeric DEFAULT 0,
    "coupon_id" "uuid",
    "tax_id" "uuid",
    "membership_discount" numeric DEFAULT 0,
    "membership_id" "uuid",
    "membership_name" "text",
    "coupon_name" "text",
    "coupon_amount" numeric,
    "points_discount_amount" numeric,
    "points_earned" numeric,
    "points_redeemed" numeric,
    "round_off_difference" numeric,
    "subtotal" numeric,
    "tax_name" character varying(100),
    "coupon_code" character varying(100),
    "coupon_discount_value" numeric(10,2),
    "coupon_discount_type" character varying(50),
    "referral_wallet_discount_amount" numeric(10,2) DEFAULT 0,
    "referral_wallet_redeemed" numeric(10,2) DEFAULT 0,
    CONSTRAINT "appointments_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['none'::"text", 'percentage'::"text", 'fixed'::"text"]))),
    CONSTRAINT "valid_transaction_type" CHECK (("transaction_type" = ANY (ARRAY['sale'::"text", 'refund'::"text"])))
);


ALTER TABLE "public"."appointments" OWNER TO "postgres";


COMMENT ON COLUMN "public"."appointments"."total_duration" IS 'Total duration of all bookings in minutes';



COMMENT ON COLUMN "public"."appointments"."coupon_name" IS 'The name/description of the coupon applied to this appointment';



COMMENT ON COLUMN "public"."appointments"."subtotal" IS 'The subtotal of all services/packages before taxes and discounts';



COMMENT ON COLUMN "public"."appointments"."tax_name" IS 'The name of the tax applied to this appointment';



COMMENT ON COLUMN "public"."appointments"."coupon_code" IS 'The code of the coupon applied to this appointment';



COMMENT ON COLUMN "public"."appointments"."coupon_discount_value" IS 'The value of the discount (percentage or fixed amount) at the time of appointment';



COMMENT ON COLUMN "public"."appointments"."coupon_discount_type" IS 'The type of discount: percentage or fixed amount';



COMMENT ON COLUMN "public"."appointments"."referral_wallet_discount_amount" IS 'Amount discounted using referral wallet credits';



COMMENT ON COLUMN "public"."appointments"."referral_wallet_redeemed" IS 'Amount of referral wallet credits redeemed for this appointment';



CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "appointment_id" "uuid" NOT NULL,
    "service_id" "uuid",
    "package_id" "uuid",
    "employee_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "price_paid" numeric NOT NULL,
    "original_price" numeric,
    "start_time" timestamp with time zone,
    "end_time" timestamp with time zone,
    "refund_reason" "public"."refund_reason_type",
    "refund_notes" "text",
    "refunded_by" "uuid",
    "refunded_at" timestamp with time zone
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."bookings"."start_time" IS 'Start time of individual service booking';



COMMENT ON COLUMN "public"."bookings"."end_time" IS 'End time of individual service booking';



CREATE TABLE IF NOT EXISTS "public"."business_details" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text",
    "country" "text" DEFAULT 'India'::"text",
    "currency" "text" DEFAULT 'INR'::"text",
    "logo_url" "text",
    "facebook_url" "text",
    "twitter_url" "text",
    "instagram_url" "text",
    "website_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."business_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cache" (
    "key" "text" NOT NULL,
    "data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cache_customer_analytics" (
    "id" integer NOT NULL,
    "customer_id" "uuid",
    "total_appointments" integer DEFAULT 0,
    "total_spent" numeric(12,2) DEFAULT 0.00,
    "avg_appointment_value" numeric(10,2) DEFAULT 0.00,
    "last_appointment_date" timestamp with time zone,
    "segment" "text" DEFAULT 'new'::"text",
    "favorite_service_id" "uuid",
    "last_updated" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "cache_customer_analytics_segment_check" CHECK (("segment" = ANY (ARRAY['new'::"text", 'regular'::"text", 'vip'::"text", 'at_risk'::"text", 'lost'::"text"])))
);


ALTER TABLE "public"."cache_customer_analytics" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."cache_customer_analytics_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."cache_customer_analytics_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."cache_customer_analytics_id_seq" OWNED BY "public"."cache_customer_analytics"."id";



CREATE TABLE IF NOT EXISTS "public"."cache_daily_metrics" (
    "metric_date" "date" NOT NULL,
    "location_id" "uuid",
    "total_appointments" integer DEFAULT 0,
    "completed_appointments" integer DEFAULT 0,
    "cancelled_appointments" integer DEFAULT 0,
    "total_revenue" numeric(12,2) DEFAULT 0.00,
    "new_customers" integer DEFAULT 0,
    "returning_customers" integer DEFAULT 0,
    "last_updated" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cache_daily_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cache_employee_performance" (
    "id" integer NOT NULL,
    "employee_id" "uuid",
    "month_year" "text" NOT NULL,
    "location_id" "uuid",
    "total_appointments" integer DEFAULT 0,
    "total_revenue" numeric(12,2) DEFAULT 0.00,
    "avg_rating" numeric(3,2) DEFAULT 0.00,
    "punctuality_score" numeric(5,2) DEFAULT 0.00,
    "utilization_rate" numeric(5,2) DEFAULT 0.00,
    "last_updated" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cache_employee_performance" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."cache_employee_performance_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."cache_employee_performance_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."cache_employee_performance_id_seq" OWNED BY "public"."cache_employee_performance"."id";



CREATE TABLE IF NOT EXISTS "public"."cache_service_performance" (
    "id" integer NOT NULL,
    "service_id" "uuid",
    "month_year" "text" NOT NULL,
    "location_id" "uuid",
    "total_bookings" integer DEFAULT 0,
    "total_revenue" numeric(12,2) DEFAULT 0.00,
    "avg_rating" numeric(3,2) DEFAULT 0.00,
    "completion_rate" numeric(5,2) DEFAULT 0.00,
    "last_updated" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cache_service_performance" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."cache_service_performance_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."cache_service_performance_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."cache_service_performance_id_seq" OWNED BY "public"."cache_service_performance"."id";



CREATE TABLE IF NOT EXISTS "public"."cart_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "service_id" "uuid",
    "package_id" "uuid",
    "status" "public"."cart_item_status" DEFAULT 'pending'::"public"."cart_item_status",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "customized_services" "uuid"[] DEFAULT '{}'::"uuid"[],
    "selling_price" numeric DEFAULT 0,
    "duration" integer
);


ALTER TABLE "public"."cart_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."closed_periods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "closed_periods_check" CHECK (("start_date" <= "end_date"))
);


ALTER TABLE "public"."closed_periods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."closed_periods_locations" (
    "closed_period_id" "uuid" NOT NULL,
    "location_id" "uuid" NOT NULL
);


ALTER TABLE "public"."closed_periods_locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."commission_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "type" character varying(10) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "commission_templates_type_check" CHECK ((("type")::"text" = ANY (ARRAY[('flat'::character varying)::"text", ('tiered'::character varying)::"text"])))
);


ALTER TABLE "public"."commission_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coupon_services" (
    "coupon_id" "uuid" NOT NULL,
    "service_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."coupon_services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coupons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "description" "text",
    "discount_type" "text" NOT NULL,
    "discount_value" numeric NOT NULL,
    "apply_to_all" boolean DEFAULT true,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "coupons_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['percentage'::"text", 'fixed'::"text"]))),
    CONSTRAINT "coupons_discount_value_check" CHECK (("discount_value" >= (0)::numeric))
);


ALTER TABLE "public"."coupons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "membership_id" "uuid" NOT NULL,
    "amount_paid" numeric NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."customer_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dashboard_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "user_id" "uuid" NOT NULL,
    "is_favorite" boolean DEFAULT false,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."dashboard_configs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dashboard_widgets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dashboard_id" "uuid" NOT NULL,
    "widget_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "position" integer NOT NULL,
    "size" "text" DEFAULT 'medium'::"text" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."dashboard_widgets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discount_reward_usage_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "location_id" "uuid",
    "reward_strategy" "text" DEFAULT 'single_only'::"text" NOT NULL,
    "max_rewards_per_booking" integer DEFAULT 1 NOT NULL,
    "allowed_discount_types" "jsonb" DEFAULT '["discount", "coupon", "membership", "loyalty_points", "referral"]'::"jsonb" NOT NULL,
    "discount_enabled" boolean DEFAULT true NOT NULL,
    "coupon_enabled" boolean DEFAULT true NOT NULL,
    "membership_enabled" boolean DEFAULT true NOT NULL,
    "loyalty_points_enabled" boolean DEFAULT true NOT NULL,
    "referral_enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "reward_combinations" "jsonb" DEFAULT '[]'::"jsonb",
    CONSTRAINT "discount_reward_usage_config_reward_strategy_check" CHECK (("reward_strategy" = ANY (ARRAY['single_only'::"text", 'multiple_allowed'::"text", 'combinations_only'::"text"])))
);


ALTER TABLE "public"."discount_reward_usage_config" OWNER TO "postgres";


COMMENT ON COLUMN "public"."discount_reward_usage_config"."reward_combinations" IS 'Array of reward combinations where each combination is an array of reward type strings. Used when reward_strategy is "combinations_only".';



CREATE TABLE IF NOT EXISTS "public"."employee_availability" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid",
    "day_of_week" integer NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "employee_availability_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6)))
);


ALTER TABLE "public"."employee_availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_commission_flat_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "service_id" "uuid" NOT NULL,
    "percentage" numeric(5,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "employee_commission_flat_rules_percentage_check" CHECK ((("percentage" >= (0)::numeric) AND ("percentage" <= (100)::numeric)))
);


ALTER TABLE "public"."employee_commission_flat_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_commission_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "commission_type" "text",
    "global_commission_percentage" numeric(5,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "employee_commission_settings_commission_type_check" CHECK (("commission_type" = ANY (ARRAY['flat'::"text", 'tiered'::"text", 'none'::"text"]))),
    CONSTRAINT "employee_commission_settings_global_commission_percentage_check" CHECK ((("global_commission_percentage" >= (0)::numeric) AND ("global_commission_percentage" <= (100)::numeric)))
);


ALTER TABLE "public"."employee_commission_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_compensation" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "monthly_salary" numeric(10,2) NOT NULL,
    "effective_from" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "employee_compensation_monthly_salary_check" CHECK (("monthly_salary" >= (0)::numeric))
);


ALTER TABLE "public"."employee_compensation" OWNER TO "postgres";


COMMENT ON TABLE "public"."employee_compensation" IS 'Stores employee compensation history including monthly salaries and their effective dates';



COMMENT ON COLUMN "public"."employee_compensation"."monthly_salary" IS 'Monthly base salary amount';



COMMENT ON COLUMN "public"."employee_compensation"."effective_from" IS 'Date from which this compensation takes effect';



CREATE TABLE IF NOT EXISTS "public"."employee_compensation_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "base_amount" numeric(10,2) NOT NULL,
    "effective_from" "date" DEFAULT CURRENT_DATE NOT NULL,
    "effective_to" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."employee_compensation_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."employee_compensation_settings" IS 'Stores employee salary and compensation information';



COMMENT ON COLUMN "public"."employee_compensation_settings"."base_amount" IS 'Monthly base salary amount';



COMMENT ON COLUMN "public"."employee_compensation_settings"."effective_from" IS 'Date from which this compensation record is effective';



COMMENT ON COLUMN "public"."employee_compensation_settings"."effective_to" IS 'Optional end date for this compensation record. NULL means currently active';



CREATE TABLE IF NOT EXISTS "public"."employee_locations" (
    "employee_id" "uuid" NOT NULL,
    "location_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."employee_locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_skills" (
    "employee_id" "uuid" NOT NULL,
    "service_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."employee_skills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_verification_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."employee_verification_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_verification_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "verification_token" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."employee_verification_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "photo_url" "text",
    "status" "public"."employee_status" DEFAULT 'active'::"public"."employee_status",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "employment_type" "text" NOT NULL,
    "auth_id" "uuid",
    "employment_type_id" "uuid",
    "service_commission_enabled" boolean DEFAULT false,
    "commission_type" character varying(10),
    "commission_template_id" "uuid",
    CONSTRAINT "employees_commission_type_check" CHECK ((("commission_type")::"text" = ANY (ARRAY[('flat'::character varying)::"text", ('tiered'::character varying)::"text", ('none'::character varying)::"text"]))),
    CONSTRAINT "employees_employment_type_check" CHECK ((("employment_type" IS NOT NULL) OR ("employment_type_id" IS NOT NULL)))
);


ALTER TABLE "public"."employees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employment_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_configurable" boolean DEFAULT true,
    "permissions" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."employment_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."financial_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "user_id" "uuid" NOT NULL,
    "report_type" "text" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_favorite" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."financial_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."flat_commission_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid",
    "service_id" "uuid" NOT NULL,
    "percentage" numeric(5,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "flat_commission_rules_percentage_check" CHECK ((("percentage" >= (0)::numeric) AND ("percentage" <= (100)::numeric)))
);


ALTER TABLE "public"."flat_commission_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "parent_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."inventory_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "quantity" integer DEFAULT 0 NOT NULL,
    "minimum_quantity" integer DEFAULT 0 NOT NULL,
    "unit_price" numeric(10,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "max_quantity" integer DEFAULT 100 NOT NULL,
    "suggested_order_quantity" integer GENERATED ALWAYS AS (
CASE
    WHEN ("quantity" <= "minimum_quantity") THEN ("max_quantity" - "quantity")
    ELSE 0
END) STORED,
    "categories" "uuid"[] DEFAULT '{}'::"uuid"[],
    "supplier_id" "uuid",
    "unit_of_quantity" "text" DEFAULT 'PC'::"text",
    "has_location_specific_data" boolean DEFAULT false,
    CONSTRAINT "inventory_items_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'discontinued'::"text"])))
);


ALTER TABLE "public"."inventory_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_items_categories" (
    "item_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL
);


ALTER TABLE "public"."inventory_items_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_location_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "location_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 0 NOT NULL,
    "minimum_quantity" integer DEFAULT 0 NOT NULL,
    "max_quantity" integer DEFAULT 100 NOT NULL,
    "unit_price" numeric DEFAULT 0 NOT NULL,
    "supplier_id" "uuid",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "categories" "uuid"[] DEFAULT '{}'::"uuid"[]
);


ALTER TABLE "public"."inventory_location_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "transaction_type" "text" NOT NULL,
    "quantity" integer NOT NULL,
    "unit_price" numeric(10,2),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."inventory_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."inventory_units" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."location_hours" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "location_id" "uuid" NOT NULL,
    "day_of_week" integer NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "is_closed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "location_hours_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6)))
);


ALTER TABLE "public"."location_hours" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."location_tax_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "location_id" "uuid",
    "service_tax_id" "uuid",
    "product_tax_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."location_tax_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."location_tax_settings" IS 'Stores tax settings specific to each location';



COMMENT ON COLUMN "public"."location_tax_settings"."service_tax_id" IS 'Reference to the tax rate applied to services at this location';



COMMENT ON COLUMN "public"."location_tax_settings"."product_tax_id" IS 'Reference to the tax rate applied to products at this location';



CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "address" "text",
    "phone" "text",
    "email" "text",
    "status" "public"."location_status" DEFAULT 'active'::"public"."location_status",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "city" "text",
    "state" "text",
    "zip_code" "text",
    "country" "text" DEFAULT 'India'::"text",
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."loyalty_program_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enabled" boolean DEFAULT false,
    "points_validity_days" integer,
    "min_redemption_points" integer DEFAULT 100 NOT NULL,
    "apply_to_all" boolean DEFAULT true,
    "points_per_spend" integer DEFAULT 1 NOT NULL,
    "min_billing_amount" numeric,
    "applicable_services" "uuid"[] DEFAULT '{}'::"uuid"[],
    "applicable_packages" "uuid"[] DEFAULT '{}'::"uuid"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "max_redemption_type" character varying,
    "max_redemption_points" integer,
    "max_redemption_percentage" numeric,
    CONSTRAINT "loyalty_program_settings_max_redemption_type_check" CHECK (((("max_redemption_type")::"text" = ANY (ARRAY[('fixed'::character varying)::"text", ('percentage'::character varying)::"text"])) OR ("max_redemption_type" IS NULL)))
);


ALTER TABLE "public"."loyalty_program_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."membership_sales" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "membership_id" "uuid" NOT NULL,
    "location_id" "uuid" NOT NULL,
    "amount" numeric NOT NULL,
    "tax_rate_id" "uuid",
    "tax_amount" numeric DEFAULT 0,
    "total_amount" numeric NOT NULL,
    "payment_method" "text" NOT NULL,
    "sale_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'completed'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."membership_sales" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "validity_period" integer NOT NULL,
    "validity_unit" "text" NOT NULL,
    "discount_type" "text" NOT NULL,
    "discount_value" numeric NOT NULL,
    "max_discount_value" numeric,
    "min_billing_amount" numeric,
    "applicable_services" "uuid"[] DEFAULT '{}'::"uuid"[],
    "applicable_packages" "uuid"[] DEFAULT '{}'::"uuid"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "memberships_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['percentage'::"text", 'fixed'::"text"]))),
    CONSTRAINT "memberships_validity_unit_check" CHECK (("validity_unit" = ANY (ARRAY['days'::"text", 'months'::"text"])))
);


ALTER TABLE "public"."memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messaging_providers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_name" "text" NOT NULL,
    "is_active" boolean DEFAULT false,
    "configuration" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_default" boolean DEFAULT false,
    "is_otp_provider" boolean DEFAULT false
);


ALTER TABLE "public"."messaging_providers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "appointment_id" "uuid",
    "notification_type" "text" NOT NULL,
    "recipient_number" "text" NOT NULL,
    "message_content" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "processed_at" timestamp with time zone,
    "error_message" "text",
    "external_message_id" "text"
);


ALTER TABLE "public"."notification_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."package_categories" (
    "package_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."package_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."package_services" (
    "package_id" "uuid" NOT NULL,
    "service_id" "uuid" NOT NULL,
    "package_selling_price" numeric(10,2)
);


ALTER TABLE "public"."package_services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."packages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "price" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "duration" integer,
    "is_customizable" boolean DEFAULT false,
    "status" "public"."service_status" DEFAULT 'active'::"public"."service_status",
    "discount_type" "text" DEFAULT 'none'::"text",
    "discount_value" numeric DEFAULT 0,
    "image_urls" "text"[] DEFAULT '{}'::"text"[],
    "customizable_services" "uuid"[] DEFAULT '{}'::"uuid"[],
    "categories" "uuid"[] DEFAULT '{}'::"uuid"[]
);


ALTER TABLE "public"."packages" OWNER TO "postgres";


COMMENT ON COLUMN "public"."packages"."customizable_services" IS 'Array of service IDs that customers can add to this package when customization is enabled';



CREATE SEQUENCE IF NOT EXISTS "public"."packages_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."packages_id_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pay_period_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "frequency" "text" NOT NULL,
    "start_day_of_month" integer,
    "custom_days" integer,
    "next_start_date" timestamp with time zone NOT NULL,
    CONSTRAINT "pay_period_settings_frequency_check" CHECK (("frequency" = ANY (ARRAY['monthly'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."pay_period_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pay_periods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "pay_periods_check" CHECK (("start_date" <= "end_date")),
    CONSTRAINT "pay_periods_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."pay_periods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pay_run_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pay_run_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "compensation_type" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "description" "text",
    "source_id" "uuid",
    "source_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'pending'::"text",
    "is_paid" boolean DEFAULT false,
    "paid_date" timestamp with time zone,
    "payment_reference" "text",
    CONSTRAINT "pay_run_items_compensation_type_check" CHECK (("compensation_type" = ANY (ARRAY['commission'::"text", 'salary'::"text", 'tip'::"text", 'adjustment'::"text"]))),
    CONSTRAINT "pay_run_items_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."pay_run_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pay_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "pay_period_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "created_by" "uuid",
    "approved_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "paid_date" timestamp with time zone,
    "notes" "text",
    "location_id" "uuid",
    "is_supplementary" boolean DEFAULT false,
    CONSTRAINT "pay_runs_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending'::"text", 'approved'::"text", 'paid'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."pay_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_methods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "is_enabled" boolean DEFAULT true,
    "is_default" boolean DEFAULT false,
    "is_system" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payment_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."phone_auth_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "phone_number" "text" NOT NULL,
    "code" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "full_name" "text",
    "lead_source" "text"
);


ALTER TABLE "public"."phone_auth_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "phone_number" "text",
    "phone_verified" boolean DEFAULT false,
    "full_name" "text",
    "lead_source" "text",
    "role" "public"."user_role",
    "wallet_balance" numeric DEFAULT 0,
    "last_used" timestamp with time zone,
    "communication_consent" boolean DEFAULT true,
    "communication_channel" "text" DEFAULT 'whatsapp'::"text",
    "visit_count" integer DEFAULT 0 NOT NULL,
    "referrer_id" "uuid",
    "referral_wallet" numeric DEFAULT 0 NOT NULL,
    "birth_date" "date",
    "gender" "text",
    CONSTRAINT "profiles_communication_channel_check" CHECK (("communication_channel" = ANY (ARRAY['whatsapp'::"text", 'sms'::"text", 'email'::"text"]))),
    CONSTRAINT "profiles_gender_check" CHECK (("gender" = ANY (ARRAY['male'::"text", 'female'::"text", 'other'::"text", 'prefer_not_to_say'::"text"]))),
    CONSTRAINT "user_id_matches_id_flexible" CHECK ((("user_id" IS NULL) OR ("user_id" = "id")))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."visit_count" IS 'Number of completed appointments for the customer';



CREATE TABLE IF NOT EXISTS "public"."purchase_order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "purchase_order_id" "uuid",
    "item_id" "uuid",
    "quantity" integer NOT NULL,
    "unit_price" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "tax_rate" numeric DEFAULT 0,
    "expiry_date" "date",
    "purchase_price" numeric,
    "received_quantity" integer
);


ALTER TABLE "public"."purchase_order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchase_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "supplier_id" "uuid",
    "order_date" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "total_amount" numeric DEFAULT 0,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "invoice_number" "text",
    "tax_inclusive" boolean DEFAULT false,
    "receipt_number" "text"
);


ALTER TABLE "public"."purchase_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."receipt_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "location_id" "uuid",
    "prefix" "text",
    "next_number" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."receipt_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recurring_shifts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid",
    "day_of_week" integer NOT NULL,
    "effective_from" "date" DEFAULT CURRENT_DATE NOT NULL,
    "effective_until" "date",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "location_id" "uuid",
    CONSTRAINT "recurring_shifts_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6)))
);


ALTER TABLE "public"."recurring_shifts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."referral_program" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "is_enabled" boolean DEFAULT false NOT NULL,
    "service_reward_type" "text" DEFAULT 'percentage'::"text" NOT NULL,
    "service_percentage" double precision,
    "service_fixed_amount" double precision,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "membership_reward_type" "text" DEFAULT 'percentage'::"text" NOT NULL,
    "membership_percentage" double precision,
    "membership_fixed_amount" double precision,
    "product_reward_type" "text" DEFAULT 'percentage'::"text" NOT NULL,
    "product_percentage" double precision,
    "product_fixed_amount" double precision,
    CONSTRAINT "referral_program_membership_reward_type_check" CHECK (("membership_reward_type" = ANY (ARRAY['percentage'::"text", 'fixed'::"text"]))),
    CONSTRAINT "referral_program_product_reward_type_check" CHECK (("product_reward_type" = ANY (ARRAY['percentage'::"text", 'fixed'::"text"])))
);


ALTER TABLE "public"."referral_program" OWNER TO "postgres";


COMMENT ON TABLE "public"."referral_program" IS 'Settings for the referral program with separate rewards for services, memberships, and products';



CREATE TABLE IF NOT EXISTS "public"."service_inventory_requirements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "quantity_required" numeric DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."service_inventory_requirements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_locations" (
    "service_id" "uuid" NOT NULL,
    "location_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."service_locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "original_price" numeric(10,2) NOT NULL,
    "selling_price" numeric(10,2) NOT NULL,
    "duration" integer NOT NULL,
    "description" "text",
    "status" "public"."service_status" DEFAULT 'active'::"public"."service_status",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "image_urls" "text"[] DEFAULT '{}'::"text"[],
    "gender" "text" DEFAULT 'all'::"text",
    "category_id" "text",
    CONSTRAINT "services_gender_check" CHECK (("gender" = ANY (ARRAY['all'::"text", 'male'::"text", 'female'::"text"])))
);


ALTER TABLE "public"."services" OWNER TO "postgres";


COMMENT ON COLUMN "public"."services"."gender" IS 'Indicates if the service is for all genders, male only, or female only';



CREATE TABLE IF NOT EXISTS "public"."services_categories" (
    "service_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."services_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shifts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid",
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "pattern_id" "uuid",
    "is_pattern_generated" boolean DEFAULT false,
    "location_id" "uuid"
);


ALTER TABLE "public"."shifts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplier_items" (
    "supplier_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "is_primary_supplier" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."supplier_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "contact_name" "text",
    "email" "text",
    "phone" "text",
    "address" "text",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "id" bigint NOT NULL,
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "description" "text"
);


ALTER TABLE "public"."system_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."system_settings" IS 'Table to store system-wide settings';



ALTER TABLE "public"."system_settings" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."system_settings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."tax_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "percentage" numeric NOT NULL,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "tax_rates_percentage_check" CHECK (("percentage" >= (0)::numeric))
);


ALTER TABLE "public"."tax_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tiered_commission_slabs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid",
    "min_amount" numeric(10,2) NOT NULL,
    "max_amount" numeric(10,2),
    "percentage" numeric(5,2) NOT NULL,
    "order_index" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "tiered_commission_slabs_check" CHECK ((("max_amount" IS NULL) OR ("max_amount" > "min_amount"))),
    CONSTRAINT "tiered_commission_slabs_min_amount_check" CHECK (("min_amount" >= (0)::numeric)),
    CONSTRAINT "tiered_commission_slabs_percentage_check" CHECK ((("percentage" >= (0)::numeric) AND ("percentage" <= (100)::numeric)))
);


ALTER TABLE "public"."tiered_commission_slabs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."time_off_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid",
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "reason" "text",
    "status" "public"."shift_status" DEFAULT 'pending'::"public"."shift_status",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "location_id" "uuid",
    "leave_type" "text" DEFAULT 'paid'::"text" NOT NULL,
    CONSTRAINT "time_off_requests_leave_type_check" CHECK (("leave_type" = ANY (ARRAY['paid'::"text", 'unpaid'::"text"])))
);


ALTER TABLE "public"."time_off_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "amount" numeric NOT NULL,
    "transaction_type" "text" NOT NULL,
    "payment_method" "text" DEFAULT 'cash'::"text" NOT NULL,
    "item_id" "uuid",
    "item_type" "text",
    "tax_amount" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."cache_customer_analytics" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."cache_customer_analytics_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."cache_employee_performance" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."cache_employee_performance_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."cache_service_performance" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."cache_service_performance_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."business_details"
    ADD CONSTRAINT "business_details_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cache_customer_analytics"
    ADD CONSTRAINT "cache_customer_analytics_customer_id_key" UNIQUE ("customer_id");



ALTER TABLE ONLY "public"."cache_customer_analytics"
    ADD CONSTRAINT "cache_customer_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cache_daily_metrics"
    ADD CONSTRAINT "cache_daily_metrics_metric_date_location_id_key" UNIQUE ("metric_date", "location_id");



ALTER TABLE ONLY "public"."cache_employee_performance"
    ADD CONSTRAINT "cache_employee_performance_employee_id_month_year_location__key" UNIQUE ("employee_id", "month_year", "location_id");



ALTER TABLE ONLY "public"."cache_employee_performance"
    ADD CONSTRAINT "cache_employee_performance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cache"
    ADD CONSTRAINT "cache_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."cache_service_performance"
    ADD CONSTRAINT "cache_service_performance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cache_service_performance"
    ADD CONSTRAINT "cache_service_performance_service_id_month_year_location_id_key" UNIQUE ("service_id", "month_year", "location_id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."closed_periods_locations"
    ADD CONSTRAINT "closed_periods_locations_pkey" PRIMARY KEY ("closed_period_id", "location_id");



ALTER TABLE ONLY "public"."closed_periods"
    ADD CONSTRAINT "closed_periods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."commission_templates"
    ADD CONSTRAINT "commission_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coupon_services"
    ADD CONSTRAINT "coupon_services_pkey" PRIMARY KEY ("coupon_id", "service_id");



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_memberships"
    ADD CONSTRAINT "customer_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dashboard_configs"
    ADD CONSTRAINT "dashboard_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dashboard_widgets"
    ADD CONSTRAINT "dashboard_widgets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discount_reward_usage_config"
    ADD CONSTRAINT "discount_reward_usage_config_location_id_key" UNIQUE ("location_id");



ALTER TABLE ONLY "public"."discount_reward_usage_config"
    ADD CONSTRAINT "discount_reward_usage_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_availability"
    ADD CONSTRAINT "employee_availability_employee_id_day_of_week_key" UNIQUE ("employee_id", "day_of_week");



ALTER TABLE ONLY "public"."employee_availability"
    ADD CONSTRAINT "employee_availability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_commission_flat_rules"
    ADD CONSTRAINT "employee_commission_flat_rules_employee_id_service_id_key" UNIQUE ("employee_id", "service_id");



ALTER TABLE ONLY "public"."employee_commission_flat_rules"
    ADD CONSTRAINT "employee_commission_flat_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_commission_settings"
    ADD CONSTRAINT "employee_commission_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_compensation"
    ADD CONSTRAINT "employee_compensation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_compensation_settings"
    ADD CONSTRAINT "employee_compensation_settings_employee_id_effective_from_key" UNIQUE ("employee_id", "effective_from");



ALTER TABLE ONLY "public"."employee_compensation_settings"
    ADD CONSTRAINT "employee_compensation_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_locations"
    ADD CONSTRAINT "employee_locations_pkey" PRIMARY KEY ("employee_id", "location_id");



ALTER TABLE ONLY "public"."employee_skills"
    ADD CONSTRAINT "employee_skills_pkey" PRIMARY KEY ("employee_id", "service_id");



ALTER TABLE ONLY "public"."employee_verification_codes"
    ADD CONSTRAINT "employee_verification_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_verification_links"
    ADD CONSTRAINT "employee_verification_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_verification_links"
    ADD CONSTRAINT "employee_verification_links_verification_token_key" UNIQUE ("verification_token");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employment_types"
    ADD CONSTRAINT "employment_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financial_reports"
    ADD CONSTRAINT "financial_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."flat_commission_rules"
    ADD CONSTRAINT "flat_commission_rules_employee_id_service_id_key" UNIQUE ("employee_id", "service_id");



ALTER TABLE ONLY "public"."flat_commission_rules"
    ADD CONSTRAINT "flat_commission_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_categories"
    ADD CONSTRAINT "inventory_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_items_categories"
    ADD CONSTRAINT "inventory_items_categories_pkey" PRIMARY KEY ("item_id", "category_id");



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_location_items"
    ADD CONSTRAINT "inventory_location_items_item_id_location_id_key" UNIQUE ("item_id", "location_id");



ALTER TABLE ONLY "public"."inventory_location_items"
    ADD CONSTRAINT "inventory_location_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_units"
    ADD CONSTRAINT "inventory_units_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."inventory_units"
    ADD CONSTRAINT "inventory_units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."location_hours"
    ADD CONSTRAINT "location_hours_location_id_day_of_week_key" UNIQUE ("location_id", "day_of_week");



ALTER TABLE ONLY "public"."location_hours"
    ADD CONSTRAINT "location_hours_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."location_tax_settings"
    ADD CONSTRAINT "location_tax_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loyalty_program_settings"
    ADD CONSTRAINT "loyalty_program_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."membership_sales"
    ADD CONSTRAINT "membership_sales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messaging_providers"
    ADD CONSTRAINT "messaging_providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messaging_providers"
    ADD CONSTRAINT "messaging_providers_provider_name_key" UNIQUE ("provider_name");



ALTER TABLE ONLY "public"."notification_queue"
    ADD CONSTRAINT "notification_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."package_categories"
    ADD CONSTRAINT "package_categories_pkey" PRIMARY KEY ("package_id", "category_id");



ALTER TABLE ONLY "public"."package_services"
    ADD CONSTRAINT "package_services_pkey" PRIMARY KEY ("package_id", "service_id");



ALTER TABLE ONLY "public"."packages"
    ADD CONSTRAINT "packages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pay_period_settings"
    ADD CONSTRAINT "pay_period_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pay_periods"
    ADD CONSTRAINT "pay_periods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pay_periods"
    ADD CONSTRAINT "pay_periods_start_date_end_date_key" UNIQUE ("start_date", "end_date");



ALTER TABLE ONLY "public"."pay_run_items"
    ADD CONSTRAINT "pay_run_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pay_runs"
    ADD CONSTRAINT "pay_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phone_auth_codes"
    ADD CONSTRAINT "phone_auth_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."receipt_settings"
    ADD CONSTRAINT "receipt_settings_location_id_key" UNIQUE ("location_id");



ALTER TABLE ONLY "public"."receipt_settings"
    ADD CONSTRAINT "receipt_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recurring_shifts"
    ADD CONSTRAINT "recurring_shifts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referral_program"
    ADD CONSTRAINT "referral_program_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_inventory_requirements"
    ADD CONSTRAINT "service_inventory_requirements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_inventory_requirements"
    ADD CONSTRAINT "service_inventory_requirements_service_id_item_id_key" UNIQUE ("service_id", "item_id");



ALTER TABLE ONLY "public"."service_locations"
    ADD CONSTRAINT "service_locations_pkey" PRIMARY KEY ("service_id", "location_id");



ALTER TABLE ONLY "public"."services_categories"
    ADD CONSTRAINT "services_categories_pkey" PRIMARY KEY ("service_id", "category_id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_items"
    ADD CONSTRAINT "supplier_items_pkey" PRIMARY KEY ("supplier_id", "item_id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tax_rates"
    ADD CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tiered_commission_slabs"
    ADD CONSTRAINT "tiered_commission_slabs_employee_id_order_index_key" UNIQUE ("employee_id", "order_index");



ALTER TABLE ONLY "public"."tiered_commission_slabs"
    ADD CONSTRAINT "tiered_commission_slabs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."time_off_requests"
    ADD CONSTRAINT "time_off_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employment_types"
    ADD CONSTRAINT "unique_employment_type_name" UNIQUE ("name");



ALTER TABLE ONLY "public"."pay_run_items"
    ADD CONSTRAINT "unique_pay_run_item" UNIQUE ("pay_run_id", "employee_id", "source_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "unique_user_id" UNIQUE ("user_id");



CREATE INDEX "employee_verification_codes_code_idx" ON "public"."employee_verification_codes" USING "btree" ("code");



CREATE INDEX "employee_verification_codes_employee_id_idx" ON "public"."employee_verification_codes" USING "btree" ("employee_id");



CREATE INDEX "employee_verification_links_employee_id_idx" ON "public"."employee_verification_links" USING "btree" ("employee_id");



CREATE INDEX "employee_verification_links_token_idx" ON "public"."employee_verification_links" USING "btree" ("verification_token");



CREATE INDEX "idx_appointments_tax_id" ON "public"."appointments" USING "btree" ("tax_id");



CREATE INDEX "idx_appointments_transaction_type" ON "public"."appointments" USING "btree" ("transaction_type");



CREATE INDEX "idx_cache_customer_analytics_customer_id" ON "public"."cache_customer_analytics" USING "btree" ("customer_id");



CREATE INDEX "idx_cache_customer_analytics_last_updated" ON "public"."cache_customer_analytics" USING "btree" ("last_updated" DESC);



CREATE INDEX "idx_cache_customer_analytics_segment" ON "public"."cache_customer_analytics" USING "btree" ("segment");



CREATE INDEX "idx_cache_daily_metrics_date" ON "public"."cache_daily_metrics" USING "btree" ("metric_date" DESC);



CREATE INDEX "idx_cache_daily_metrics_location" ON "public"."cache_daily_metrics" USING "btree" ("location_id");



CREATE INDEX "idx_cache_employee_performance_employee_month" ON "public"."cache_employee_performance" USING "btree" ("employee_id", "month_year");



CREATE INDEX "idx_cache_service_performance_service_month" ON "public"."cache_service_performance" USING "btree" ("service_id", "month_year");



CREATE INDEX "idx_employee_compensation_effective_from" ON "public"."employee_compensation" USING "btree" ("effective_from");



CREATE INDEX "idx_employee_compensation_employee_id" ON "public"."employee_compensation" USING "btree" ("employee_id");



CREATE INDEX "idx_pay_run_items_commission_source" ON "public"."pay_run_items" USING "btree" ("source_id") WHERE ("compensation_type" = 'commission'::"text");



CREATE INDEX "idx_pay_run_items_is_paid" ON "public"."pay_run_items" USING "btree" ("is_paid");



CREATE INDEX "idx_pay_run_items_pay_run_id_employee_id" ON "public"."pay_run_items" USING "btree" ("pay_run_id", "employee_id");



CREATE INDEX "idx_pay_run_items_source_id" ON "public"."pay_run_items" USING "btree" ("source_id");



CREATE INDEX "idx_pay_run_items_status" ON "public"."pay_run_items" USING "btree" ("status");



CREATE INDEX "idx_profiles_birth_date" ON "public"."profiles" USING "btree" ("birth_date");



CREATE INDEX "idx_profiles_gender" ON "public"."profiles" USING "btree" ("gender");



CREATE INDEX "idx_profiles_last_used" ON "public"."profiles" USING "btree" ("last_used");



CREATE INDEX "idx_profiles_referrer_id" ON "public"."profiles" USING "btree" ("referrer_id");



CREATE INDEX "idx_profiles_visit_count" ON "public"."profiles" USING "btree" ("visit_count" DESC);



CREATE INDEX "idx_purchase_order_items_item_id" ON "public"."purchase_order_items" USING "btree" ("item_id");



CREATE INDEX "idx_purchase_orders_invoice_number" ON "public"."purchase_orders" USING "btree" ("invoice_number");



CREATE INDEX "idx_recurring_shifts_employee_date" ON "public"."recurring_shifts" USING "btree" ("employee_id", "day_of_week");



CREATE INDEX "idx_recurring_shifts_employee_day" ON "public"."recurring_shifts" USING "btree" ("employee_id", "day_of_week");



CREATE INDEX "idx_shifts_employee_date" ON "public"."shifts" USING "btree" ("employee_id", "start_time");



CREATE INDEX "idx_shifts_pattern_id" ON "public"."shifts" USING "btree" ("pattern_id");



CREATE OR REPLACE TRIGGER "enforce_refund_reference" BEFORE INSERT OR UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."check_refund_reference"();



CREATE OR REPLACE TRIGGER "ensure_admin_permissions" BEFORE INSERT OR UPDATE ON "public"."employment_types" FOR EACH ROW EXECUTE FUNCTION "public"."handle_admin_permissions"();



CREATE OR REPLACE TRIGGER "ensure_profile_user_id" BEFORE INSERT OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_user_id_matches_id"();



CREATE OR REPLACE TRIGGER "fix_payment_status_after_populate" AFTER INSERT ON "public"."pay_run_items" FOR EACH ROW EXECUTE FUNCTION "public"."fix_payment_status_after_populate"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."referral_program" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_appointment_booking_notification" AFTER INSERT ON "public"."appointments" FOR EACH ROW WHEN (("new"."status" = 'booked'::"public"."appointment_status")) EXECUTE FUNCTION "public"."handle_appointment_booking_notification"();



CREATE OR REPLACE TRIGGER "trigger_booking_auto_consumption" AFTER UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."handle_booking_auto_consumption"();



CREATE OR REPLACE TRIGGER "trigger_update_customer_analytics" AFTER INSERT OR DELETE OR UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."update_customer_analytics_cache"();



CREATE OR REPLACE TRIGGER "trigger_update_daily_metrics" AFTER INSERT OR DELETE OR UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."update_daily_metrics_cache"();



CREATE OR REPLACE TRIGGER "update_appointments_updated_at" BEFORE UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_bookings_updated_at" BEFORE UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_business_details_updated_at" BEFORE UPDATE ON "public"."business_details" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_cart_items_updated_at" BEFORE UPDATE ON "public"."cart_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_categories_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_commission_templates_updated_at" BEFORE UPDATE ON "public"."commission_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_coupons_updated_at" BEFORE UPDATE ON "public"."coupons" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_customer_memberships_updated_at" BEFORE UPDATE ON "public"."customer_memberships" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_dashboard_configs_updated_at" BEFORE UPDATE ON "public"."dashboard_configs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_dashboard_widgets_updated_at" BEFORE UPDATE ON "public"."dashboard_widgets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_discount_reward_usage_config_updated_at" BEFORE UPDATE ON "public"."discount_reward_usage_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_employee_availability_updated_at" BEFORE UPDATE ON "public"."employee_availability" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_employee_compensation_settings_updated_at" BEFORE UPDATE ON "public"."employee_compensation_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_payrun_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_employee_compensation_updated_at" BEFORE UPDATE ON "public"."employee_compensation" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_employee_locations_updated_at" BEFORE UPDATE ON "public"."employee_locations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_employees_auth_id_updated_at" BEFORE UPDATE OF "auth_id" ON "public"."employees" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_employees_updated_at" BEFORE UPDATE ON "public"."employees" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_employment_types_updated_at" BEFORE UPDATE ON "public"."employment_types" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_financial_reports_updated_at" BEFORE UPDATE ON "public"."financial_reports" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_flat_commission_rules_updated_at" BEFORE UPDATE ON "public"."flat_commission_rules" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_inventory_categories_updated_at" BEFORE UPDATE ON "public"."inventory_categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_inventory_items_updated_at" BEFORE UPDATE ON "public"."inventory_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_inventory_location_items_updated_at" BEFORE UPDATE ON "public"."inventory_location_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_inventory_transactions_updated_at" BEFORE UPDATE ON "public"."inventory_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_inventory_units_updated_at" BEFORE UPDATE ON "public"."inventory_units" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_location_hours_updated_at" BEFORE UPDATE ON "public"."location_hours" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_location_tax_settings_updated_at" BEFORE UPDATE ON "public"."location_tax_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_locations_updated_at" BEFORE UPDATE ON "public"."locations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_loyalty_program_settings_updated_at" BEFORE UPDATE ON "public"."loyalty_program_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_membership_sales_updated_at" BEFORE UPDATE ON "public"."membership_sales" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_memberships_updated_at" BEFORE UPDATE ON "public"."memberships" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_messaging_providers_updated_at" BEFORE UPDATE ON "public"."messaging_providers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_packages_updated_at" BEFORE UPDATE ON "public"."packages" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_pay_periods_updated_at" BEFORE UPDATE ON "public"."pay_periods" FOR EACH ROW EXECUTE FUNCTION "public"."update_payrun_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_pay_run_items_updated_at" BEFORE UPDATE ON "public"."pay_run_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_payrun_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_pay_runs_updated_at" BEFORE UPDATE ON "public"."pay_runs" FOR EACH ROW EXECUTE FUNCTION "public"."update_payrun_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payment_methods_updated_at" BEFORE UPDATE ON "public"."payment_methods" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_purchase_order_items_updated_at" BEFORE UPDATE ON "public"."purchase_order_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_purchase_orders_updated_at" BEFORE UPDATE ON "public"."purchase_orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_receipt_settings_updated_at" BEFORE UPDATE ON "public"."receipt_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_recurring_shifts_updated_at" BEFORE UPDATE ON "public"."recurring_shifts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_service_inventory_requirements_updated_at" BEFORE UPDATE ON "public"."service_inventory_requirements" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_services_updated_at" BEFORE UPDATE ON "public"."services" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_shifts_updated_at" BEFORE UPDATE ON "public"."shifts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_supplier_items_updated_at" BEFORE UPDATE ON "public"."supplier_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_suppliers_updated_at" BEFORE UPDATE ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tax_rates_updated_at" BEFORE UPDATE ON "public"."tax_rates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tiered_commission_slabs_updated_at" BEFORE UPDATE ON "public"."tiered_commission_slabs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_time_off_requests_updated_at" BEFORE UPDATE ON "public"."time_off_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_transactions_updated_at" BEFORE UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_original_appointment_id_fkey" FOREIGN KEY ("original_appointment_id") REFERENCES "public"."appointments"("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_refunded_by_fkey" FOREIGN KEY ("refunded_by") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_tax_id_fkey" FOREIGN KEY ("tax_id") REFERENCES "public"."tax_rates"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_refunded_by_fkey" FOREIGN KEY ("refunded_by") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cache_customer_analytics"
    ADD CONSTRAINT "cache_customer_analytics_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cache_employee_performance"
    ADD CONSTRAINT "cache_employee_performance_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cache_service_performance"
    ADD CONSTRAINT "cache_service_performance_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id");



ALTER TABLE ONLY "public"."closed_periods_locations"
    ADD CONSTRAINT "closed_periods_locations_closed_period_id_fkey" FOREIGN KEY ("closed_period_id") REFERENCES "public"."closed_periods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."closed_periods_locations"
    ADD CONSTRAINT "closed_periods_locations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupon_services"
    ADD CONSTRAINT "coupon_services_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupon_services"
    ADD CONSTRAINT "coupon_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_memberships"
    ADD CONSTRAINT "customer_memberships_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id");



ALTER TABLE ONLY "public"."dashboard_widgets"
    ADD CONSTRAINT "dashboard_widgets_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "public"."dashboard_configs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discount_reward_usage_config"
    ADD CONSTRAINT "discount_reward_usage_config_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_availability"
    ADD CONSTRAINT "employee_availability_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_commission_flat_rules"
    ADD CONSTRAINT "employee_commission_flat_rules_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_commission_settings"
    ADD CONSTRAINT "employee_commission_settings_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_compensation"
    ADD CONSTRAINT "employee_compensation_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_compensation_settings"
    ADD CONSTRAINT "employee_compensation_settings_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_locations"
    ADD CONSTRAINT "employee_locations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_locations"
    ADD CONSTRAINT "employee_locations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_skills"
    ADD CONSTRAINT "employee_skills_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_skills"
    ADD CONSTRAINT "employee_skills_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_verification_codes"
    ADD CONSTRAINT "employee_verification_codes_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_verification_links"
    ADD CONSTRAINT "employee_verification_links_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_auth_id_fkey" FOREIGN KEY ("auth_id") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_commission_template_id_fkey" FOREIGN KEY ("commission_template_id") REFERENCES "public"."commission_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "fk_employees_employment_type" FOREIGN KEY ("employment_type_id") REFERENCES "public"."employment_types"("id");



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "fk_purchase_order_items_item" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "fk_purchase_order_items_purchase_order" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "fk_purchase_orders_supplier" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."flat_commission_rules"
    ADD CONSTRAINT "flat_commission_rules_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."flat_commission_rules"
    ADD CONSTRAINT "flat_commission_rules_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_categories"
    ADD CONSTRAINT "inventory_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."inventory_categories"("id");



ALTER TABLE ONLY "public"."inventory_items_categories"
    ADD CONSTRAINT "inventory_items_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."inventory_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_items_categories"
    ADD CONSTRAINT "inventory_items_categories_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");



ALTER TABLE ONLY "public"."inventory_location_items"
    ADD CONSTRAINT "inventory_location_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_location_items"
    ADD CONSTRAINT "inventory_location_items_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_location_items"
    ADD CONSTRAINT "inventory_location_items_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."location_hours"
    ADD CONSTRAINT "location_hours_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."location_tax_settings"
    ADD CONSTRAINT "location_tax_settings_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."location_tax_settings"
    ADD CONSTRAINT "location_tax_settings_product_tax_id_fkey" FOREIGN KEY ("product_tax_id") REFERENCES "public"."tax_rates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."location_tax_settings"
    ADD CONSTRAINT "location_tax_settings_service_tax_id_fkey" FOREIGN KEY ("service_tax_id") REFERENCES "public"."tax_rates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."membership_sales"
    ADD CONSTRAINT "membership_sales_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."membership_sales"
    ADD CONSTRAINT "membership_sales_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id");



ALTER TABLE ONLY "public"."membership_sales"
    ADD CONSTRAINT "membership_sales_tax_rate_id_fkey" FOREIGN KEY ("tax_rate_id") REFERENCES "public"."tax_rates"("id");



ALTER TABLE ONLY "public"."notification_queue"
    ADD CONSTRAINT "notification_queue_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id");



ALTER TABLE ONLY "public"."package_categories"
    ADD CONSTRAINT "package_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."package_categories"
    ADD CONSTRAINT "package_categories_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id");



ALTER TABLE ONLY "public"."package_services"
    ADD CONSTRAINT "package_services_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."package_services"
    ADD CONSTRAINT "package_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pay_run_items"
    ADD CONSTRAINT "pay_run_items_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pay_run_items"
    ADD CONSTRAINT "pay_run_items_pay_run_id_fkey" FOREIGN KEY ("pay_run_id") REFERENCES "public"."pay_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pay_runs"
    ADD CONSTRAINT "pay_runs_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pay_runs"
    ADD CONSTRAINT "pay_runs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pay_runs"
    ADD CONSTRAINT "pay_runs_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."pay_runs"
    ADD CONSTRAINT "pay_runs_pay_period_id_fkey" FOREIGN KEY ("pay_period_id") REFERENCES "public"."pay_periods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id");



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");



ALTER TABLE ONLY "public"."receipt_settings"
    ADD CONSTRAINT "receipt_settings_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_shifts"
    ADD CONSTRAINT "recurring_shifts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_shifts"
    ADD CONSTRAINT "recurring_shifts_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."service_inventory_requirements"
    ADD CONSTRAINT "service_inventory_requirements_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_inventory_requirements"
    ADD CONSTRAINT "service_inventory_requirements_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_locations"
    ADD CONSTRAINT "service_locations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_locations"
    ADD CONSTRAINT "service_locations_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."services_categories"
    ADD CONSTRAINT "services_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."services_categories"
    ADD CONSTRAINT "services_categories_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_pattern_id_fkey" FOREIGN KEY ("pattern_id") REFERENCES "public"."recurring_shifts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_items"
    ADD CONSTRAINT "supplier_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_items"
    ADD CONSTRAINT "supplier_items_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tiered_commission_slabs"
    ADD CONSTRAINT "tiered_commission_slabs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."time_off_requests"
    ADD CONSTRAINT "time_off_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."time_off_requests"
    ADD CONSTRAINT "time_off_requests_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id");



CREATE POLICY "Admin users can insert business details" ON "public"."business_details" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admin users can insert, update, delete location hours" ON "public"."location_hours" USING ("public"."is_admin"());



CREATE POLICY "Admin users can insert, update, delete locations" ON "public"."locations" USING ("public"."is_admin"());



CREATE POLICY "Admin users can insert, update, delete receipt settings" ON "public"."receipt_settings" USING ("public"."is_admin"());



CREATE POLICY "Admin users can manage messaging providers" ON "public"."messaging_providers" USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Admin users can update business details" ON "public"."business_details" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "Allow Authenticated Users to Insert into Customer Memberships" ON "public"."customer_memberships" FOR INSERT TO "authenticated" WITH CHECK (("customer_id" = "auth"."uid"()));



CREATE POLICY "Allow Authenticated Users to Insert into messaging_providers" ON "public"."messaging_providers" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow Authenticated Users to Select from messaging_providers" ON "public"."messaging_providers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow Authenticated Users to Update messaging_providers" ON "public"."messaging_providers" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Allow admin-trigger insert" ON "public"."profiles" FOR INSERT TO "supabase_auth_admin" WITH CHECK (true);



CREATE POLICY "Allow admins to insert referral program settings" ON "public"."referral_program" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'superadmin'::"public"."user_role"]))))));



CREATE POLICY "Allow admins to read referral program settings" ON "public"."referral_program" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'superadmin'::"public"."user_role"]))))));



CREATE POLICY "Allow admins to update referral program settings" ON "public"."referral_program" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'superadmin'::"public"."user_role"]))))));



CREATE POLICY "Allow all users to delete profiles" ON "public"."profiles" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow all users to insert" ON "public"."profiles" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) OR ("user_id" IS NULL)));



CREATE POLICY "Allow all users to insert and update their profiles" ON "public"."profiles" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Allow all users to insert profiles" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow all users to read business details" ON "public"."business_details" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow all users to read profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow all users to update profiles" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to delete appointments" ON "public"."appointments" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete bookings" ON "public"."bookings" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete business details" ON "public"."business_details" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete closed periods" ON "public"."closed_periods" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete closed periods locations" ON "public"."closed_periods_locations" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete coupons" ON "public"."coupons" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete employee skills" ON "public"."employee_skills" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete employees" ON "public"."employees" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete employment types" ON "public"."employment_types" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete flat commission rules" ON "public"."flat_commission_rules" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete location hours" ON "public"."location_hours" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete locations" ON "public"."locations" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete loyalty program settings" ON "public"."loyalty_program_settings" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete memberships" ON "public"."memberships" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete pay period settings" ON "public"."pay_period_settings" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete recurring shifts" ON "public"."recurring_shifts" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete service_locations" ON "public"."service_locations" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete their own profiles" ON "public"."profiles" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Allow authenticated users to delete tiered commission slabs" ON "public"."tiered_commission_slabs" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete time off requests" ON "public"."time_off_requests" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to insert" ON "public"."profiles" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Allow authenticated users to insert appointments" ON "public"."appointments" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert bookings" ON "public"."bookings" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert business details" ON "public"."business_details" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert closed periods" ON "public"."closed_periods" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert closed periods locations" ON "public"."closed_periods_locations" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert coupons" ON "public"."coupons" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert employee skills" ON "public"."employee_skills" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert employees" ON "public"."employees" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert flat commission rules" ON "public"."flat_commission_rules" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert location hours" ON "public"."location_hours" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert locations" ON "public"."locations" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert loyalty program settings" ON "public"."loyalty_program_settings" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert memberships" ON "public"."memberships" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert pay period settings" ON "public"."pay_period_settings" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert profiles" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Allow authenticated users to insert recurring shifts" ON "public"."recurring_shifts" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert their own profiles" ON "public"."profiles" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Allow authenticated users to insert tiered commission slabs" ON "public"."tiered_commission_slabs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert time off requests" ON "public"."time_off_requests" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to select appointments" ON "public"."appointments" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to select bookings" ON "public"."bookings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to select business details" ON "public"."business_details" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to select closed periods" ON "public"."closed_periods" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to select closed periods locations" ON "public"."closed_periods_locations" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to select coupons" ON "public"."coupons" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to select employee skills" ON "public"."employee_skills" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to select employees" ON "public"."employees" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to select location hours" ON "public"."location_hours" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to select locations" ON "public"."locations" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to select loyalty program settings" ON "public"."loyalty_program_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to select memberships" ON "public"."memberships" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to select pay period settings" ON "public"."pay_period_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to select profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to select recurring shifts" ON "public"."recurring_shifts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to select their own profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Allow authenticated users to select time off requests" ON "public"."time_off_requests" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to update appointments" ON "public"."appointments" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update bookings" ON "public"."bookings" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update closed periods" ON "public"."closed_periods" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update closed periods locations" ON "public"."closed_periods_locations" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update coupons" ON "public"."coupons" FOR UPDATE TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update employee skills" ON "public"."employee_skills" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update employees" ON "public"."employees" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update employment types" ON "public"."employment_types" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update flat commission rules" ON "public"."flat_commission_rules" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update location hours" ON "public"."location_hours" FOR UPDATE TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update locations" ON "public"."locations" FOR UPDATE TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update loyalty program settings" ON "public"."loyalty_program_settings" FOR UPDATE TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update memberships" ON "public"."memberships" FOR UPDATE TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update pay period settings" ON "public"."pay_period_settings" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update profiles" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Allow authenticated users to update recurring shifts" ON "public"."recurring_shifts" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update service_locations" ON "public"."service_locations" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update services_categories" ON "public"."services_categories" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update their own profiles" ON "public"."profiles" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Allow authenticated users to update tiered commission slabs" ON "public"."tiered_commission_slabs" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update time off requests" ON "public"."time_off_requests" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to view flat commission rules" ON "public"."flat_commission_rules" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to view tiered commission slabs" ON "public"."tiered_commission_slabs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to view, insert, and update their own" ON "public"."appointments" USING (("auth"."uid"() = "customer_id")) WITH CHECK (("auth"."uid"() = "customer_id"));



CREATE POLICY "Allow authenticated users to view, insert, and update their own" ON "public"."bookings" USING (("auth"."uid"() IN ( SELECT "appointments"."customer_id"
   FROM "public"."appointments"
  WHERE ("appointments"."id" = "bookings"."appointment_id")))) WITH CHECK (("auth"."uid"() IN ( SELECT "appointments"."customer_id"
   FROM "public"."appointments"
  WHERE ("appointments"."id" = "bookings"."appointment_id"))));



CREATE POLICY "Allow employees to delete their own record" ON "public"."employees" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Allow everyone to update business details" ON "public"."business_details" FOR UPDATE WITH CHECK (true);



CREATE POLICY "Allow service role to delete any employee" ON "public"."employees" FOR DELETE TO "service_role" USING (true);



CREATE POLICY "Allow service role to delete any profile" ON "public"."profiles" FOR DELETE USING (true);



CREATE POLICY "Allow service role to delete employees" ON "public"."employees" FOR DELETE TO "service_role" USING (true);



CREATE POLICY "Allow service role to delete profiles" ON "public"."profiles" FOR DELETE USING (true);



CREATE POLICY "Auth cascade delete" ON "public"."profiles" FOR DELETE USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "Auth service can delete profiles" ON "public"."profiles" FOR DELETE TO "service_role" USING (true);



CREATE POLICY "Authenticated users and admins can create employee availability" ON "public"."employee_availability" FOR INSERT TO "authenticated" WITH CHECK ((("employee_id" = "auth"."uid"()) OR (("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))));



CREATE POLICY "Authenticated users and admins can create employee records" ON "public"."employees" FOR INSERT TO "authenticated" WITH CHECK ((("id" = "auth"."uid"()) OR (("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))));



CREATE POLICY "Authenticated users and admins can create employee skills" ON "public"."employee_skills" FOR INSERT TO "authenticated" WITH CHECK ((("employee_id" = "auth"."uid"()) OR (("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))));



CREATE POLICY "Authenticated users and admins can delete employee availability" ON "public"."employee_availability" FOR DELETE TO "authenticated" USING ((("employee_id" = "auth"."uid"()) OR (("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))));



CREATE POLICY "Authenticated users and admins can delete employee records" ON "public"."employees" FOR DELETE TO "authenticated" USING ((("id" = "auth"."uid"()) OR (("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))));



CREATE POLICY "Authenticated users and admins can delete employee skills" ON "public"."employee_skills" FOR DELETE TO "authenticated" USING ((("employee_id" = "auth"."uid"()) OR (("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))));



CREATE POLICY "Authenticated users and admins can update employee availability" ON "public"."employee_availability" FOR UPDATE TO "authenticated" USING ((("employee_id" = "auth"."uid"()) OR (("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['admin'::"text", 'superadmin'::"text"])))) WITH CHECK ((("employee_id" = "auth"."uid"()) OR (("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))));



CREATE POLICY "Authenticated users and admins can update employee records" ON "public"."employees" FOR UPDATE TO "authenticated" USING ((("id" = "auth"."uid"()) OR (("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['admin'::"text", 'superadmin'::"text"])))) WITH CHECK ((("id" = "auth"."uid"()) OR (("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))));



CREATE POLICY "Authenticated users and admins can update employee skills" ON "public"."employee_skills" FOR UPDATE TO "authenticated" USING ((("employee_id" = "auth"."uid"()) OR (("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['admin'::"text", 'superadmin'::"text"])))) WITH CHECK ((("employee_id" = "auth"."uid"()) OR (("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))));



CREATE POLICY "Authenticated users can delete categories" ON "public"."categories" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can delete profiles" ON "public"."profiles" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "profiles_1"
  WHERE (("profiles_1"."user_id" = "auth"."uid"()) AND ("profiles_1"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Authenticated users can delete their own employee records" ON "public"."employees" FOR DELETE TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "Authenticated users can delete their own profiles" ON "public"."profiles" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Authenticated users can insert categories" ON "public"."categories" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert employment types" ON "public"."employment_types" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert into services_categories" ON "public"."services_categories" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can select employment types" ON "public"."employment_types" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can update categories" ON "public"."categories" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated users can update their own employee availability" ON "public"."employee_availability" FOR UPDATE TO "authenticated" USING (("employee_id" = "auth"."uid"())) WITH CHECK (("employee_id" = "auth"."uid"()));



CREATE POLICY "Authenticated users can update their own employee records" ON "public"."employees" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Authenticated users can update their own employee skills" ON "public"."employee_skills" FOR UPDATE TO "authenticated" USING (("employee_id" = "auth"."uid"())) WITH CHECK (("employee_id" = "auth"."uid"()));



CREATE POLICY "Cache readable by authenticated users" ON "public"."cache" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Cache updatable by authenticated users" ON "public"."cache" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Cache writable by authenticated users" ON "public"."cache" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Commission Templates deletable by authenticated users" ON "public"."commission_templates" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Commission Templates insertable by authenticated users" ON "public"."commission_templates" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Commission Templates updatable by authenticated users" ON "public"."commission_templates" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Commission Templates visible to all authenticated users" ON "public"."commission_templates" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Employee Compensation insertable by authenticated users" ON "public"."employee_compensation" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Employee Compensation updatable by authenticated users" ON "public"."employee_compensation" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Employee Compensation visible to authenticated users" ON "public"."employee_compensation" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Employee compensation data deletable by authenticated users" ON "public"."employee_compensation_settings" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Employee compensation data insertable by authenticated users" ON "public"."employee_compensation_settings" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Employee compensation data updatable by authenticated users" ON "public"."employee_compensation_settings" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Employee compensation data visible to authenticated users only" ON "public"."employee_compensation_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Employees, Admins, and Superadmins can delete profiles" ON "public"."profiles" FOR DELETE TO "authenticated" USING ((("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['employee'::"text", 'admin'::"text", 'superadmin'::"text"])));



CREATE POLICY "Enable all access for authenticated users" ON "public"."purchase_order_items" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all access for authenticated users" ON "public"."purchase_orders" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all access for authenticated users" ON "public"."suppliers" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable delete access for authenticated users" ON "public"."loyalty_program_settings" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable delete access for authenticated users on location_tax_se" ON "public"."location_tax_settings" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable insert access for authenticated users" ON "public"."loyalty_program_settings" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert access for authenticated users on location_tax_se" ON "public"."location_tax_settings" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."categories" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."employee_availability" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."employee_skills" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."employees" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."inventory_items" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable read access for all users" ON "public"."inventory_transactions" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable read access for all users" ON "public"."location_hours" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."locations" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."package_services" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."packages" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."services" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."services_categories" FOR SELECT USING (true);



CREATE POLICY "Enable read access for authenticated users" ON "public"."loyalty_program_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for authenticated users on location_tax_sett" ON "public"."location_tax_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for shifts" ON "public"."shifts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable update access for authenticated users" ON "public"."loyalty_program_settings" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable update access for authenticated users on location_tax_se" ON "public"."location_tax_settings" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Everyone can read business details" ON "public"."business_details" FOR SELECT USING (true);



CREATE POLICY "Everyone can read location hours" ON "public"."location_hours" FOR SELECT USING (true);



CREATE POLICY "Everyone can read locations" ON "public"."locations" FOR SELECT USING (true);



CREATE POLICY "Everyone can read receipt settings" ON "public"."receipt_settings" FOR SELECT USING (true);



CREATE POLICY "Flat Commission Rules deletable by authenticated users" ON "public"."flat_commission_rules" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Flat Commission Rules insertable by authenticated users" ON "public"."flat_commission_rules" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Flat Commission Rules updatable by authenticated users" ON "public"."flat_commission_rules" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Flat Commission Rules visible to all authenticated users" ON "public"."flat_commission_rules" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Tiered Commission Slabs deletable by authenticated users" ON "public"."tiered_commission_slabs" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Tiered Commission Slabs insertable by authenticated users" ON "public"."tiered_commission_slabs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Tiered Commission Slabs updatable by authenticated users" ON "public"."tiered_commission_slabs" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Tiered Commission Slabs visible to all authenticated users" ON "public"."tiered_commission_slabs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can create own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can create their own dashboard configs" ON "public"."dashboard_configs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own financial reports" ON "public"."financial_reports" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create widgets for their dashboards" ON "public"."dashboard_widgets" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."dashboard_configs"
  WHERE (("dashboard_configs"."id" = "dashboard_widgets"."dashboard_id") AND ("dashboard_configs"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete discount reward usage config" ON "public"."discount_reward_usage_config" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can delete their own dashboard configs" ON "public"."dashboard_configs" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own financial reports" ON "public"."financial_reports" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete widgets for their dashboards" ON "public"."dashboard_widgets" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."dashboard_configs"
  WHERE (("dashboard_configs"."id" = "dashboard_widgets"."dashboard_id") AND ("dashboard_configs"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert discount reward usage config" ON "public"."discount_reward_usage_config" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can insert pay run items" ON "public"."pay_run_items" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Users can insert their own cart items" ON "public"."cart_items" FOR INSERT TO "authenticated" WITH CHECK (("customer_id" = "auth"."uid"()));



CREATE POLICY "Users can read discount reward usage config" ON "public"."discount_reward_usage_config" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can read own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update discount reward usage config" ON "public"."discount_reward_usage_config" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update pay run items" ON "public"."pay_run_items" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Users can update pay run items payment status" ON "public"."pay_run_items" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Users can update their own cart items" ON "public"."cart_items" FOR UPDATE TO "authenticated" USING (("customer_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own dashboard configs" ON "public"."dashboard_configs" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own financial reports" ON "public"."financial_reports" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update widgets for their dashboards" ON "public"."dashboard_widgets" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."dashboard_configs"
  WHERE (("dashboard_configs"."id" = "dashboard_widgets"."dashboard_id") AND ("dashboard_configs"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view all pay run items" ON "public"."pay_run_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view their own cart items" ON "public"."cart_items" FOR SELECT TO "authenticated" USING (("customer_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own dashboard configs" ON "public"."dashboard_configs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own financial reports" ON "public"."financial_reports" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view widgets for their dashboards" ON "public"."dashboard_widgets" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."dashboard_configs"
  WHERE (("dashboard_configs"."id" = "dashboard_widgets"."dashboard_id") AND ("dashboard_configs"."user_id" = "auth"."uid"())))));



CREATE POLICY "allow_all_profiles_for_service_role" ON "public"."profiles" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "allow_authenticated_users_own_profile" ON "public"."profiles" TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



ALTER TABLE "public"."cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."closed_periods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."closed_periods_locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."commission_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."discount_reward_usage_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_compensation" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_compensation_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."flat_commission_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."location_tax_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."loyalty_program_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pay_period_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pay_run_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."referral_program" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tiered_commission_slabs" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";












GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";









































































































































































































GRANT ALL ON FUNCTION "public"."add_adjustment_to_pay_run"("pay_run_id_param" "uuid", "employee_id_param" "uuid", "compensation_type_param" "text", "amount_param" numeric, "description_param" "text", "source_type_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_adjustment_to_pay_run"("pay_run_id_param" "uuid", "employee_id_param" "uuid", "compensation_type_param" "text", "amount_param" numeric, "description_param" "text", "source_type_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_adjustment_to_pay_run"("pay_run_id_param" "uuid", "employee_id_param" "uuid", "compensation_type_param" "text", "amount_param" numeric, "description_param" "text", "source_type_param" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."basic_user_setup"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."basic_user_setup"() TO "anon";
GRANT ALL ON FUNCTION "public"."basic_user_setup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."basic_user_setup"() TO "service_role";
GRANT ALL ON FUNCTION "public"."basic_user_setup"() TO "authenticator";



GRANT ALL ON FUNCTION "public"."calculate_commissions_for_pay_run"("pay_run_id_param" "uuid", "recalculate_only" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_commissions_for_pay_run"("pay_run_id_param" "uuid", "recalculate_only" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_commissions_for_pay_run"("pay_run_id_param" "uuid", "recalculate_only" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_employee_commissions"("employee_id_param" "uuid", "start_date_param" "date", "end_date_param" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_employee_commissions"("employee_id_param" "uuid", "start_date_param" "date", "end_date_param" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_employee_commissions"("employee_id_param" "uuid", "start_date_param" "date", "end_date_param" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_employee_pay_run_summaries"("pay_run_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_employee_pay_run_summaries"("pay_run_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_employee_pay_run_summaries"("pay_run_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_pay_run_summary"("pay_run_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_pay_run_summary"("pay_run_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_pay_run_summary"("pay_run_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_salary_for_period"("employee_id_param" "uuid", "start_date_param" "date", "end_date_param" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_salary_for_period"("employee_id_param" "uuid", "start_date_param" "date", "end_date_param" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_salary_for_period"("employee_id_param" "uuid", "start_date_param" "date", "end_date_param" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_suggested_order_quantity"("current_qty" integer, "min_qty" integer, "max_qty" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_suggested_order_quantity"("current_qty" integer, "min_qty" integer, "max_qty" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_suggested_order_quantity"("current_qty" integer, "min_qty" integer, "max_qty" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_unpaid_leave_days"("employee_id_param" "uuid", "start_date_param" "date", "end_date_param" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_unpaid_leave_days"("employee_id_param" "uuid", "start_date_param" "date", "end_date_param" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_unpaid_leave_days"("employee_id_param" "uuid", "start_date_param" "date", "end_date_param" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_working_days"("start_date_param" "date", "end_date_param" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_working_days"("start_date_param" "date", "end_date_param" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_working_days"("start_date_param" "date", "end_date_param" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_refund_reference"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_refund_reference"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_refund_reference"() TO "service_role";



GRANT ALL ON FUNCTION "public"."commission_delete_all_for_employee"("employee_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."commission_delete_all_for_employee"("employee_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."commission_delete_all_for_employee"("employee_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."commission_save_flat_rules"("employee_id_param" "uuid", "rules_json" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."commission_save_flat_rules"("employee_id_param" "uuid", "rules_json" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."commission_save_flat_rules"("employee_id_param" "uuid", "rules_json" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."commission_save_tiered_slabs"("employee_id_param" "uuid", "slabs_json" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."commission_save_tiered_slabs"("employee_id_param" "uuid", "slabs_json" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."commission_save_tiered_slabs"("employee_id_param" "uuid", "slabs_json" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_appointment_and_bookings"("customer_id_param" "uuid", "total_price_param" numeric, "booking_data" "jsonb"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."create_appointment_and_bookings"("customer_id_param" "uuid", "total_price_param" numeric, "booking_data" "jsonb"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_appointment_and_bookings"("customer_id_param" "uuid", "total_price_param" numeric, "booking_data" "jsonb"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_profile_basic"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_profile_basic"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_profile_basic"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_profile_for_user"("auth_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_profile_for_user"("auth_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_profile_for_user"("auth_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_profile_on_signup"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_profile_on_signup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_profile_on_signup"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_profile"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_profile"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_profile"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_claim"("uid" "uuid", "claim" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_claim"("uid" "uuid", "claim" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_claim"("uid" "uuid", "claim" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_related_records"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_related_records"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_related_records"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."diagnose_commission_calculations"("employee_id_param" "uuid", "date_range_param" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."diagnose_commission_calculations"("employee_id_param" "uuid", "date_range_param" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."diagnose_commission_calculations"("employee_id_param" "uuid", "date_range_param" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_email_or_phone_on_user_creation"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_email_or_phone_on_user_creation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_email_or_phone_on_user_creation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_pay_run_items_payment_status"("pay_run_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_pay_run_items_payment_status"("pay_run_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_pay_run_items_payment_status"("pay_run_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_user_id_matches_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_user_id_matches_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_user_id_matches_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fix_payment_status_after_populate"() TO "anon";
GRANT ALL ON FUNCTION "public"."fix_payment_status_after_populate"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fix_payment_status_after_populate"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_claim"("uid" "uuid", "claim" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_claim"("uid" "uuid", "claim" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_claim"("uid" "uuid", "claim" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_claims"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_claims"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_claims"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_customer_appointments"("customer_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_customer_appointments"("customer_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_customer_appointments"("customer_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_customer_bookings"("customer_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_customer_bookings"("customer_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_customer_bookings"("customer_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_claim"("claim" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_claim"("claim" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_claim"("claim" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_claims"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_claims"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_claims"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_recent_sales"("days_param" integer, "limit_param" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_recent_sales"("days_param" integer, "limit_param" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recent_sales"("days_param" integer, "limit_param" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_admin_permissions"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_admin_permissions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_admin_permissions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_appointment_booking_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_appointment_booking_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_appointment_booking_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_booking_auto_consumption"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_booking_auto_consumption"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_booking_auto_consumption"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_phone_verification"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_phone_verification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_phone_verification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_user_and_profile_creation"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_and_profile_creation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_and_profile_creation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_customer_visit_count"("customer_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_customer_visit_count"("customer_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_customer_visit_count"("customer_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_claims_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_claims_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_claims_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."populate_pay_run_items"("pay_run_id_param" "uuid", "only_unpaid_param" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."populate_pay_run_items"("pay_run_id_param" "uuid", "only_unpaid_param" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."populate_pay_run_items"("pay_run_id_param" "uuid", "only_unpaid_param" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_commissions_for_pay_run"("pay_run_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_commissions_for_pay_run"("pay_run_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_commissions_for_pay_run"("pay_run_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_old_verification_codes"() TO "anon";
GRANT ALL ON FUNCTION "public"."remove_old_verification_codes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_old_verification_codes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."safe_cast_to_user_role"("role_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."safe_cast_to_user_role"("role_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."safe_cast_to_user_role"("role_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."send_appointment_notification_internal"("appointment_id" "uuid", "notification_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."send_appointment_notification_internal"("appointment_id" "uuid", "notification_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_appointment_notification_internal"("appointment_id" "uuid", "notification_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_claim"("uid" "uuid", "claim" "text", "value" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."set_claim"("uid" "uuid", "claim" "text", "value" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_claim"("uid" "uuid", "claim" "text", "value" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_default_role_on_profile_creation"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_default_role_on_profile_creation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_default_role_on_profile_creation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."simple_create_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."simple_create_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."simple_create_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_customer_analytics_cache"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_customer_analytics_cache"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_customer_analytics_cache"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_daily_metrics_cache"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_daily_metrics_cache"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_daily_metrics_cache"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_employment_type_permissions"("type_id" "uuid", "perms_json" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_employment_type_permissions"("type_id" "uuid", "perms_json" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_employment_type_permissions"("type_id" "uuid", "perms_json" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_pay_run_items_payment_status"("p_pay_run_id" "uuid", "p_employee_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."update_pay_run_items_payment_status"("p_pay_run_id" "uuid", "p_employee_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_pay_run_items_payment_status"("p_pay_run_id" "uuid", "p_employee_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_pay_run_items_payment_status"("pay_run_id_param" "uuid", "payment_reference_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_pay_run_items_payment_status"("pay_run_id_param" "uuid", "payment_reference_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_pay_run_items_payment_status"("pay_run_id_param" "uuid", "payment_reference_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_pay_run_items_payment_status"("p_pay_run_id" "uuid", "p_employee_ids" "uuid"[], "p_payment_reference" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_pay_run_items_payment_status"("p_pay_run_id" "uuid", "p_employee_ids" "uuid"[], "p_payment_reference" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_pay_run_items_payment_status"("p_pay_run_id" "uuid", "p_employee_ids" "uuid"[], "p_payment_reference" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_pay_run_status"("pay_run_id_param" "uuid", "new_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_pay_run_status"("pay_run_id_param" "uuid", "new_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_pay_run_status"("pay_run_id_param" "uuid", "new_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_payrun_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_payrun_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_payrun_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_phone_number_on_login"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_phone_number_on_login"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_phone_number_on_login"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_referrer_wallet"("customer_id_param" "uuid", "referrer_id_param" "uuid", "amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."update_referrer_wallet"("customer_id_param" "uuid", "referrer_id_param" "uuid", "amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_referrer_wallet"("customer_id_param" "uuid", "referrer_id_param" "uuid", "amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";
























GRANT ALL ON TABLE "public"."appointments" TO "anon";
GRANT ALL ON TABLE "public"."appointments" TO "authenticated";
GRANT ALL ON TABLE "public"."appointments" TO "service_role";



GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."business_details" TO "anon";
GRANT ALL ON TABLE "public"."business_details" TO "authenticated";
GRANT ALL ON TABLE "public"."business_details" TO "service_role";



GRANT ALL ON TABLE "public"."cache" TO "anon";
GRANT ALL ON TABLE "public"."cache" TO "authenticated";
GRANT ALL ON TABLE "public"."cache" TO "service_role";



GRANT ALL ON TABLE "public"."cache_customer_analytics" TO "anon";
GRANT ALL ON TABLE "public"."cache_customer_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."cache_customer_analytics" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cache_customer_analytics_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cache_customer_analytics_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cache_customer_analytics_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cache_daily_metrics" TO "anon";
GRANT ALL ON TABLE "public"."cache_daily_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."cache_daily_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."cache_employee_performance" TO "anon";
GRANT ALL ON TABLE "public"."cache_employee_performance" TO "authenticated";
GRANT ALL ON TABLE "public"."cache_employee_performance" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cache_employee_performance_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cache_employee_performance_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cache_employee_performance_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cache_service_performance" TO "anon";
GRANT ALL ON TABLE "public"."cache_service_performance" TO "authenticated";
GRANT ALL ON TABLE "public"."cache_service_performance" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cache_service_performance_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cache_service_performance_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cache_service_performance_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cart_items" TO "anon";
GRANT ALL ON TABLE "public"."cart_items" TO "authenticated";
GRANT ALL ON TABLE "public"."cart_items" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."closed_periods" TO "anon";
GRANT ALL ON TABLE "public"."closed_periods" TO "authenticated";
GRANT ALL ON TABLE "public"."closed_periods" TO "service_role";



GRANT ALL ON TABLE "public"."closed_periods_locations" TO "anon";
GRANT ALL ON TABLE "public"."closed_periods_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."closed_periods_locations" TO "service_role";



GRANT ALL ON TABLE "public"."commission_templates" TO "anon";
GRANT ALL ON TABLE "public"."commission_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."commission_templates" TO "service_role";



GRANT ALL ON TABLE "public"."coupon_services" TO "anon";
GRANT ALL ON TABLE "public"."coupon_services" TO "authenticated";
GRANT ALL ON TABLE "public"."coupon_services" TO "service_role";



GRANT ALL ON TABLE "public"."coupons" TO "anon";
GRANT ALL ON TABLE "public"."coupons" TO "authenticated";
GRANT ALL ON TABLE "public"."coupons" TO "service_role";



GRANT ALL ON TABLE "public"."customer_memberships" TO "anon";
GRANT ALL ON TABLE "public"."customer_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."dashboard_configs" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_configs" TO "service_role";



GRANT ALL ON TABLE "public"."dashboard_widgets" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_widgets" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_widgets" TO "service_role";



GRANT ALL ON TABLE "public"."discount_reward_usage_config" TO "anon";
GRANT ALL ON TABLE "public"."discount_reward_usage_config" TO "authenticated";
GRANT ALL ON TABLE "public"."discount_reward_usage_config" TO "service_role";



GRANT ALL ON TABLE "public"."employee_availability" TO "anon";
GRANT ALL ON TABLE "public"."employee_availability" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_availability" TO "service_role";



GRANT ALL ON TABLE "public"."employee_commission_flat_rules" TO "anon";
GRANT ALL ON TABLE "public"."employee_commission_flat_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_commission_flat_rules" TO "service_role";



GRANT ALL ON TABLE "public"."employee_commission_settings" TO "anon";
GRANT ALL ON TABLE "public"."employee_commission_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_commission_settings" TO "service_role";



GRANT ALL ON TABLE "public"."employee_compensation" TO "anon";
GRANT ALL ON TABLE "public"."employee_compensation" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_compensation" TO "service_role";



GRANT ALL ON TABLE "public"."employee_compensation_settings" TO "anon";
GRANT ALL ON TABLE "public"."employee_compensation_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_compensation_settings" TO "service_role";



GRANT ALL ON TABLE "public"."employee_locations" TO "anon";
GRANT ALL ON TABLE "public"."employee_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_locations" TO "service_role";



GRANT ALL ON TABLE "public"."employee_skills" TO "anon";
GRANT ALL ON TABLE "public"."employee_skills" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_skills" TO "service_role";



GRANT ALL ON TABLE "public"."employee_verification_codes" TO "anon";
GRANT ALL ON TABLE "public"."employee_verification_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_verification_codes" TO "service_role";



GRANT ALL ON TABLE "public"."employee_verification_links" TO "anon";
GRANT ALL ON TABLE "public"."employee_verification_links" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_verification_links" TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT ALL ON TABLE "public"."employment_types" TO "anon";
GRANT ALL ON TABLE "public"."employment_types" TO "authenticated";
GRANT ALL ON TABLE "public"."employment_types" TO "service_role";



GRANT ALL ON TABLE "public"."financial_reports" TO "anon";
GRANT ALL ON TABLE "public"."financial_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."financial_reports" TO "service_role";



GRANT ALL ON TABLE "public"."flat_commission_rules" TO "anon";
GRANT ALL ON TABLE "public"."flat_commission_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."flat_commission_rules" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_categories" TO "anon";
GRANT ALL ON TABLE "public"."inventory_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_categories" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_items" TO "anon";
GRANT ALL ON TABLE "public"."inventory_items" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_items" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_items_categories" TO "anon";
GRANT ALL ON TABLE "public"."inventory_items_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_items_categories" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_location_items" TO "anon";
GRANT ALL ON TABLE "public"."inventory_location_items" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_location_items" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_transactions" TO "anon";
GRANT ALL ON TABLE "public"."inventory_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_units" TO "anon";
GRANT ALL ON TABLE "public"."inventory_units" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_units" TO "service_role";



GRANT ALL ON TABLE "public"."location_hours" TO "anon";
GRANT ALL ON TABLE "public"."location_hours" TO "authenticated";
GRANT ALL ON TABLE "public"."location_hours" TO "service_role";



GRANT ALL ON TABLE "public"."location_tax_settings" TO "anon";
GRANT ALL ON TABLE "public"."location_tax_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."location_tax_settings" TO "service_role";



GRANT ALL ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";



GRANT ALL ON TABLE "public"."loyalty_program_settings" TO "anon";
GRANT ALL ON TABLE "public"."loyalty_program_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."loyalty_program_settings" TO "service_role";



GRANT ALL ON TABLE "public"."membership_sales" TO "anon";
GRANT ALL ON TABLE "public"."membership_sales" TO "authenticated";
GRANT ALL ON TABLE "public"."membership_sales" TO "service_role";



GRANT ALL ON TABLE "public"."memberships" TO "anon";
GRANT ALL ON TABLE "public"."memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."memberships" TO "service_role";



GRANT ALL ON TABLE "public"."messaging_providers" TO "anon";
GRANT ALL ON TABLE "public"."messaging_providers" TO "authenticated";
GRANT ALL ON TABLE "public"."messaging_providers" TO "service_role";



GRANT ALL ON TABLE "public"."notification_queue" TO "anon";
GRANT ALL ON TABLE "public"."notification_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_queue" TO "service_role";



GRANT ALL ON TABLE "public"."package_categories" TO "anon";
GRANT ALL ON TABLE "public"."package_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."package_categories" TO "service_role";



GRANT ALL ON TABLE "public"."package_services" TO "anon";
GRANT ALL ON TABLE "public"."package_services" TO "authenticated";
GRANT ALL ON TABLE "public"."package_services" TO "service_role";



GRANT ALL ON TABLE "public"."packages" TO "anon";
GRANT ALL ON TABLE "public"."packages" TO "authenticated";
GRANT ALL ON TABLE "public"."packages" TO "service_role";



GRANT ALL ON SEQUENCE "public"."packages_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."packages_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."packages_id_seq" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."packages_id_seq" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."pay_period_settings" TO "anon";
GRANT ALL ON TABLE "public"."pay_period_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."pay_period_settings" TO "service_role";



GRANT ALL ON TABLE "public"."pay_periods" TO "anon";
GRANT ALL ON TABLE "public"."pay_periods" TO "authenticated";
GRANT ALL ON TABLE "public"."pay_periods" TO "service_role";



GRANT ALL ON TABLE "public"."pay_run_items" TO "anon";
GRANT ALL ON TABLE "public"."pay_run_items" TO "authenticated";
GRANT ALL ON TABLE "public"."pay_run_items" TO "service_role";



GRANT ALL ON TABLE "public"."pay_runs" TO "anon";
GRANT ALL ON TABLE "public"."pay_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."pay_runs" TO "service_role";



GRANT ALL ON TABLE "public"."payment_methods" TO "anon";
GRANT ALL ON TABLE "public"."payment_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_methods" TO "service_role";



GRANT ALL ON TABLE "public"."phone_auth_codes" TO "anon";
GRANT ALL ON TABLE "public"."phone_auth_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."phone_auth_codes" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT ALL ON TABLE "public"."profiles" TO "authenticator";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."profiles" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."purchase_order_items" TO "anon";
GRANT ALL ON TABLE "public"."purchase_order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_order_items" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_orders" TO "anon";
GRANT ALL ON TABLE "public"."purchase_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_orders" TO "service_role";



GRANT ALL ON TABLE "public"."receipt_settings" TO "anon";
GRANT ALL ON TABLE "public"."receipt_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."receipt_settings" TO "service_role";



GRANT ALL ON TABLE "public"."recurring_shifts" TO "anon";
GRANT ALL ON TABLE "public"."recurring_shifts" TO "authenticated";
GRANT ALL ON TABLE "public"."recurring_shifts" TO "service_role";



GRANT ALL ON TABLE "public"."referral_program" TO "anon";
GRANT ALL ON TABLE "public"."referral_program" TO "authenticated";
GRANT ALL ON TABLE "public"."referral_program" TO "service_role";



GRANT ALL ON TABLE "public"."service_inventory_requirements" TO "anon";
GRANT ALL ON TABLE "public"."service_inventory_requirements" TO "authenticated";
GRANT ALL ON TABLE "public"."service_inventory_requirements" TO "service_role";



GRANT ALL ON TABLE "public"."service_locations" TO "anon";
GRANT ALL ON TABLE "public"."service_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."service_locations" TO "service_role";



GRANT ALL ON TABLE "public"."services" TO "anon";
GRANT ALL ON TABLE "public"."services" TO "authenticated";
GRANT ALL ON TABLE "public"."services" TO "service_role";



GRANT ALL ON TABLE "public"."services_categories" TO "anon";
GRANT ALL ON TABLE "public"."services_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."services_categories" TO "service_role";



GRANT ALL ON TABLE "public"."shifts" TO "anon";
GRANT ALL ON TABLE "public"."shifts" TO "authenticated";
GRANT ALL ON TABLE "public"."shifts" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_items" TO "anon";
GRANT ALL ON TABLE "public"."supplier_items" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_items" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";



GRANT ALL ON TABLE "public"."system_settings" TO "anon";
GRANT ALL ON TABLE "public"."system_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."system_settings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."system_settings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."system_settings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."system_settings_id_seq" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."system_settings_id_seq" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."tax_rates" TO "anon";
GRANT ALL ON TABLE "public"."tax_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."tax_rates" TO "service_role";



GRANT ALL ON TABLE "public"."tiered_commission_slabs" TO "anon";
GRANT ALL ON TABLE "public"."tiered_commission_slabs" TO "authenticated";
GRANT ALL ON TABLE "public"."tiered_commission_slabs" TO "service_role";



GRANT ALL ON TABLE "public"."time_off_requests" TO "anon";
GRANT ALL ON TABLE "public"."time_off_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."time_off_requests" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;

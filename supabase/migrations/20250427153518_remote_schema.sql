

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
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, phone_number)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone')
    ON CONFLICT (user_id) DO NOTHING;  -- Ignore if the profile already exists
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_profile"() OWNER TO "postgres";


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
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    DELETE FROM public.profiles WHERE user_id = OLD.id;
    RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."delete_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_email_or_phone_on_user_creation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Check if either email or phone number is provided
    IF NEW.email IS NULL AND (NEW.raw_user_meta_data->>'phone' IS NULL OR NEW.raw_user_meta_data->>'phone' = '') THEN
        RAISE EXCEPTION 'Either email or phone number must be provided for user creation';
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_email_or_phone_on_user_creation"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."remove_old_verification_codes"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    DELETE FROM phone_auth_codes 
    WHERE created_at < NOW() - INTERVAL '5 minutes';
END;
$$;


ALTER FUNCTION "public"."remove_old_verification_codes"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."Users" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "full_name" "text",
    "email" "text" DEFAULT ''::"text",
    "password" "text",
    "is_admin" boolean
);


ALTER TABLE "public"."Users" OWNER TO "postgres";


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
    "employment_type" "public"."employee_type" DEFAULT 'stylist'::"public"."employee_type" NOT NULL,
    "auth_id" "uuid",
    "employment_type_id" "uuid",
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
    CONSTRAINT "loyalty_program_settings_max_redemption_type_check" CHECK (((("max_redemption_type")::"text" = ANY ((ARRAY['fixed'::character varying, 'percentage'::character varying])::"text"[])) OR ("max_redemption_type" IS NULL)))
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
    "updated_at" timestamp with time zone DEFAULT "now"()
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
    "id" bigint NOT NULL,
    "user_id" "uuid",
    "phone_number" "text",
    "phone_verified" boolean DEFAULT false,
    "full_name" "text",
    "lead_source" "text",
    "role" "public"."user_role",
    "wallet_balance" numeric DEFAULT 0,
    "last_used" timestamp with time zone
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


ALTER TABLE "public"."profiles" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."profiles_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



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
    "category_id" "uuid",
    "original_price" numeric(10,2) NOT NULL,
    "selling_price" numeric(10,2) NOT NULL,
    "duration" integer NOT NULL,
    "description" "text",
    "status" "public"."service_status" DEFAULT 'active'::"public"."service_status",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "image_urls" "text"[] DEFAULT '{}'::"text"[],
    "gender" "text" DEFAULT 'all'::"text",
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


CREATE TABLE IF NOT EXISTS "public"."time_off_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid",
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "reason" "text",
    "status" "public"."shift_status" DEFAULT 'pending'::"public"."shift_status",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "location_id" "uuid"
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


ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."business_details"
    ADD CONSTRAINT "business_details_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."employee_availability"
    ADD CONSTRAINT "employee_availability_employee_id_day_of_week_key" UNIQUE ("employee_id", "day_of_week");



ALTER TABLE ONLY "public"."employee_availability"
    ADD CONSTRAINT "employee_availability_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."tax_rates"
    ADD CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."time_off_requests"
    ADD CONSTRAINT "time_off_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employment_types"
    ADD CONSTRAINT "unique_employment_type_name" UNIQUE ("name");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "unique_user_id" UNIQUE ("user_id");



CREATE INDEX "employee_verification_codes_code_idx" ON "public"."employee_verification_codes" USING "btree" ("code");



CREATE INDEX "employee_verification_codes_employee_id_idx" ON "public"."employee_verification_codes" USING "btree" ("employee_id");



CREATE INDEX "employee_verification_links_employee_id_idx" ON "public"."employee_verification_links" USING "btree" ("employee_id");



CREATE INDEX "employee_verification_links_token_idx" ON "public"."employee_verification_links" USING "btree" ("verification_token");



CREATE INDEX "idx_appointments_tax_id" ON "public"."appointments" USING "btree" ("tax_id");



CREATE INDEX "idx_appointments_transaction_type" ON "public"."appointments" USING "btree" ("transaction_type");



CREATE INDEX "idx_purchase_order_items_item_id" ON "public"."purchase_order_items" USING "btree" ("item_id");



CREATE INDEX "idx_purchase_orders_invoice_number" ON "public"."purchase_orders" USING "btree" ("invoice_number");



CREATE INDEX "idx_recurring_shifts_employee_date" ON "public"."recurring_shifts" USING "btree" ("employee_id", "day_of_week");



CREATE INDEX "idx_recurring_shifts_employee_day" ON "public"."recurring_shifts" USING "btree" ("employee_id", "day_of_week");



CREATE INDEX "idx_shifts_employee_date" ON "public"."shifts" USING "btree" ("employee_id", "start_time");



CREATE INDEX "idx_shifts_pattern_id" ON "public"."shifts" USING "btree" ("pattern_id");



CREATE OR REPLACE TRIGGER "enforce_refund_reference" BEFORE INSERT OR UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."check_refund_reference"();



CREATE OR REPLACE TRIGGER "ensure_admin_permissions" BEFORE INSERT OR UPDATE ON "public"."employment_types" FOR EACH ROW EXECUTE FUNCTION "public"."handle_admin_permissions"();



CREATE OR REPLACE TRIGGER "trigger_appointment_booking_notification" AFTER INSERT ON "public"."appointments" FOR EACH ROW WHEN (("new"."status" = 'booked'::"public"."appointment_status")) EXECUTE FUNCTION "public"."handle_appointment_booking_notification"();



CREATE OR REPLACE TRIGGER "trigger_booking_auto_consumption" AFTER UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."handle_booking_auto_consumption"();



CREATE OR REPLACE TRIGGER "update_appointments_updated_at" BEFORE UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_bookings_updated_at" BEFORE UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_business_details_updated_at" BEFORE UPDATE ON "public"."business_details" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_cart_items_updated_at" BEFORE UPDATE ON "public"."cart_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_categories_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_coupons_updated_at" BEFORE UPDATE ON "public"."coupons" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_customer_memberships_updated_at" BEFORE UPDATE ON "public"."customer_memberships" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_dashboard_configs_updated_at" BEFORE UPDATE ON "public"."dashboard_configs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_dashboard_widgets_updated_at" BEFORE UPDATE ON "public"."dashboard_widgets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_employee_availability_updated_at" BEFORE UPDATE ON "public"."employee_availability" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_employee_locations_updated_at" BEFORE UPDATE ON "public"."employee_locations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_employees_auth_id_updated_at" BEFORE UPDATE OF "auth_id" ON "public"."employees" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_employees_updated_at" BEFORE UPDATE ON "public"."employees" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_employment_types_updated_at" BEFORE UPDATE ON "public"."employment_types" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_financial_reports_updated_at" BEFORE UPDATE ON "public"."financial_reports" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



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



CREATE OR REPLACE TRIGGER "update_time_off_requests_updated_at" BEFORE UPDATE ON "public"."time_off_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_transactions_updated_at" BEFORE UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id");



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



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id");



ALTER TABLE ONLY "public"."coupon_services"
    ADD CONSTRAINT "coupon_services_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupon_services"
    ADD CONSTRAINT "coupon_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_memberships"
    ADD CONSTRAINT "customer_memberships_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id");



ALTER TABLE ONLY "public"."dashboard_widgets"
    ADD CONSTRAINT "dashboard_widgets_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "public"."dashboard_configs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_availability"
    ADD CONSTRAINT "employee_availability_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



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
    ADD CONSTRAINT "fk_employees_employment_type" FOREIGN KEY ("employment_type_id") REFERENCES "public"."employment_types"("id");



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "fk_purchase_order_items_item" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "fk_purchase_order_items_purchase_order" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "fk_purchase_orders_supplier" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "fk_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



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



CREATE POLICY "Allow all users to delete profiles" ON "public"."profiles" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow all users to insert profiles" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow all users to read profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow all users to update profiles" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to view, insert, and update their own" ON "public"."appointments" USING (("auth"."uid"() = "customer_id")) WITH CHECK (("auth"."uid"() = "customer_id"));



CREATE POLICY "Allow authenticated users to view, insert, and update their own" ON "public"."bookings" USING (("auth"."uid"() IN ( SELECT "appointments"."customer_id"
   FROM "public"."appointments"
  WHERE ("appointments"."id" = "bookings"."appointment_id")))) WITH CHECK (("auth"."uid"() IN ( SELECT "appointments"."customer_id"
   FROM "public"."appointments"
  WHERE ("appointments"."id" = "bookings"."appointment_id"))));



CREATE POLICY "Authenticated users can insert employment types" ON "public"."employment_types" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can select employment types" ON "public"."employment_types" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable all access for authenticated users" ON "public"."purchase_order_items" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all access for authenticated users" ON "public"."purchase_orders" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all access for authenticated users" ON "public"."suppliers" USING (("auth"."role"() = 'authenticated'::"text"));



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



CREATE POLICY "Enable read access for shifts" ON "public"."shifts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Everyone can read business details" ON "public"."business_details" FOR SELECT USING (true);



CREATE POLICY "Everyone can read location hours" ON "public"."location_hours" FOR SELECT USING (true);



CREATE POLICY "Everyone can read locations" ON "public"."locations" FOR SELECT USING (true);



CREATE POLICY "Everyone can read receipt settings" ON "public"."receipt_settings" FOR SELECT USING (true);



CREATE POLICY "Users can create their own dashboard configs" ON "public"."dashboard_configs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own financial reports" ON "public"."financial_reports" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create widgets for their dashboards" ON "public"."dashboard_widgets" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."dashboard_configs"
  WHERE (("dashboard_configs"."id" = "dashboard_widgets"."dashboard_id") AND ("dashboard_configs"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete their own dashboard configs" ON "public"."dashboard_configs" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own financial reports" ON "public"."financial_reports" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete widgets for their dashboards" ON "public"."dashboard_widgets" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."dashboard_configs"
  WHERE (("dashboard_configs"."id" = "dashboard_widgets"."dashboard_id") AND ("dashboard_configs"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert their own cart items" ON "public"."cart_items" FOR INSERT TO "authenticated" WITH CHECK (("customer_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own cart items" ON "public"."cart_items" FOR UPDATE TO "authenticated" USING (("customer_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own dashboard configs" ON "public"."dashboard_configs" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own financial reports" ON "public"."financial_reports" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update widgets for their dashboards" ON "public"."dashboard_widgets" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."dashboard_configs"
  WHERE (("dashboard_configs"."id" = "dashboard_widgets"."dashboard_id") AND ("dashboard_configs"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own cart items" ON "public"."cart_items" FOR SELECT TO "authenticated" USING (("customer_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own dashboard configs" ON "public"."dashboard_configs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own financial reports" ON "public"."financial_reports" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view widgets for their dashboards" ON "public"."dashboard_widgets" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."dashboard_configs"
  WHERE (("dashboard_configs"."id" = "dashboard_widgets"."dashboard_id") AND ("dashboard_configs"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."business_details" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cart_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dashboard_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dashboard_widgets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_availability" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_skills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employment_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."financial_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."location_hours" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messaging_providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."package_services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."packages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchase_order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchase_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."receipt_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recurring_shifts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."services_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shifts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."time_off_requests" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";












GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";









































































































































































































GRANT ALL ON FUNCTION "public"."calculate_suggested_order_quantity"("current_qty" integer, "min_qty" integer, "max_qty" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_suggested_order_quantity"("current_qty" integer, "min_qty" integer, "max_qty" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_suggested_order_quantity"("current_qty" integer, "min_qty" integer, "max_qty" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_refund_reference"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_refund_reference"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_refund_reference"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_appointment_and_bookings"("customer_id_param" "uuid", "total_price_param" numeric, "booking_data" "jsonb"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."create_appointment_and_bookings"("customer_id_param" "uuid", "total_price_param" numeric, "booking_data" "jsonb"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_appointment_and_bookings"("customer_id_param" "uuid", "total_price_param" numeric, "booking_data" "jsonb"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_claim"("uid" "uuid", "claim" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_claim"("uid" "uuid", "claim" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_claim"("uid" "uuid", "claim" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_email_or_phone_on_user_creation"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_email_or_phone_on_user_creation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_email_or_phone_on_user_creation"() TO "service_role";



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



GRANT ALL ON FUNCTION "public"."handle_phone_verification"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_phone_verification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_phone_verification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_claims_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_claims_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_claims_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_old_verification_codes"() TO "anon";
GRANT ALL ON FUNCTION "public"."remove_old_verification_codes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_old_verification_codes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."send_appointment_notification_internal"("appointment_id" "uuid", "notification_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."send_appointment_notification_internal"("appointment_id" "uuid", "notification_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_appointment_notification_internal"("appointment_id" "uuid", "notification_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_claim"("uid" "uuid", "claim" "text", "value" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."set_claim"("uid" "uuid", "claim" "text", "value" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_claim"("uid" "uuid", "claim" "text", "value" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_default_role_on_profile_creation"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_default_role_on_profile_creation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_default_role_on_profile_creation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_phone_number_on_login"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_phone_number_on_login"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_phone_number_on_login"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";
























GRANT ALL ON TABLE "public"."Users" TO "anon";
GRANT ALL ON TABLE "public"."Users" TO "authenticated";
GRANT ALL ON TABLE "public"."Users" TO "service_role";



GRANT ALL ON TABLE "public"."appointments" TO "anon";
GRANT ALL ON TABLE "public"."appointments" TO "authenticated";
GRANT ALL ON TABLE "public"."appointments" TO "service_role";



GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."business_details" TO "anon";
GRANT ALL ON TABLE "public"."business_details" TO "authenticated";
GRANT ALL ON TABLE "public"."business_details" TO "service_role";



GRANT ALL ON TABLE "public"."cart_items" TO "anon";
GRANT ALL ON TABLE "public"."cart_items" TO "authenticated";
GRANT ALL ON TABLE "public"."cart_items" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



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



GRANT ALL ON TABLE "public"."employee_availability" TO "anon";
GRANT ALL ON TABLE "public"."employee_availability" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_availability" TO "service_role";



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



GRANT ALL ON TABLE "public"."payment_methods" TO "anon";
GRANT ALL ON TABLE "public"."payment_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_methods" TO "service_role";



GRANT ALL ON TABLE "public"."phone_auth_codes" TO "anon";
GRANT ALL ON TABLE "public"."phone_auth_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."phone_auth_codes" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."profiles_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."profiles_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."profiles_id_seq" TO "service_role";



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



GRANT ALL ON TABLE "public"."tax_rates" TO "anon";
GRANT ALL ON TABLE "public"."tax_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."tax_rates" TO "service_role";



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

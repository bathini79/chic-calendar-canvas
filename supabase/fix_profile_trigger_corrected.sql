-- Fix for 500 error in Auth service
-- This script must be run directly against your Supabase database

-- First, let's check what fields are actually available in auth.users
-- by creating a safer version of the create_profile function

CREATE OR REPLACE FUNCTION "public"."create_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    full_name_val text;
    phone_val text;
    metadata jsonb;
BEGIN
    -- In Supabase Auth, the fields might be named 'raw_app_meta_data' or 'raw_user_meta_data'
    -- We'll check all possible field names
    
    -- First try raw_user_meta_data which is most common
    IF NEW.raw_user_meta_data IS NOT NULL THEN
        metadata := NEW.raw_user_meta_data;
        full_name_val := metadata->>'full_name';
        phone_val := metadata->>'phone';
    
    -- Try raw_app_meta_data if user metadata is null or values weren't found
    ELSIF NEW.raw_app_meta_data IS NOT NULL THEN
        metadata := NEW.raw_app_meta_data;
        IF full_name_val IS NULL THEN
            full_name_val := metadata->>'full_name';
        END IF;
        IF phone_val IS NULL THEN
            phone_val := metadata->>'phone';
        END IF;
    END IF;
    
    -- Insert the profile with whatever values we found
    INSERT INTO public.profiles (user_id, full_name, phone_number)
    VALUES (NEW.id, full_name_val, phone_val)
    ON CONFLICT (user_id) DO NOTHING;  -- Ignore if the profile already exists
    
    RETURN NEW;
END;
$$;

-- Similarly, fix the ensure_email_or_phone_on_user_creation function
CREATE OR REPLACE FUNCTION "public"."ensure_email_or_phone_on_user_creation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    phone_val text;
    metadata jsonb;
BEGIN
    -- First try raw_user_meta_data which is most common
    IF NEW.raw_user_meta_data IS NOT NULL THEN
        metadata := NEW.raw_user_meta_data;
        phone_val := metadata->>'phone';
    
    -- Try raw_app_meta_data if user metadata is null or values weren't found
    ELSIF NEW.raw_app_meta_data IS NOT NULL THEN
        metadata := NEW.raw_app_meta_data;
        IF phone_val IS NULL THEN
            phone_val := metadata->>'phone';
        END IF;
    END IF;
    
    -- Check if either email or phone number is provided
    IF NEW.email IS NULL AND (phone_val IS NULL OR phone_val = '') THEN
        RAISE EXCEPTION 'Either email or phone number must be provided for user creation';
    END IF;

    RETURN NEW;
END;
$$;
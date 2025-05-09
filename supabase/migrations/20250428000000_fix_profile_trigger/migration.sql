-- Fix user profile creation by modifying the create_profile trigger function
-- to handle both user_metadata and raw_user_meta_data fields
-- This resolves 500 errors from the Auth server when creating new users

-- Drop the existing create_profile trigger from auth.users if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create an improved version of the function that handles both metadata formats
CREATE OR REPLACE FUNCTION "public"."create_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    full_name_val text;
    phone_val text;
BEGIN
    -- Try to get values from user_metadata (preferred, new format)
    full_name_val := NEW.user_metadata->>'full_name';
    phone_val := NEW.user_metadata->>'phone';
    
    -- If not found, fall back to raw_user_meta_data (old format)
    IF full_name_val IS NULL THEN
        full_name_val := NEW.raw_user_meta_data->>'full_name';
    END IF;
    
    IF phone_val IS NULL THEN
        phone_val := NEW.raw_user_meta_data->>'phone';
    END IF;
    
    -- Insert the profile with the values we found
    INSERT INTO public.profiles (user_id, full_name, phone_number)
    VALUES (NEW.id, full_name_val, phone_val)
    ON CONFLICT (user_id) DO NOTHING;  -- Ignore if the profile already exists
    
    RETURN NEW;
END;
$$;

-- Re-create the trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_profile();

-- Similarly, fix the ensure_email_or_phone_on_user_creation function
CREATE OR REPLACE FUNCTION "public"."ensure_email_or_phone_on_user_creation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
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
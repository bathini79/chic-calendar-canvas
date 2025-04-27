-- SQL script to fix profiles table structure and user_id relationship
-- This addresses the issue where user_id in profiles is not being created properly

-- 1. First check the current structure of profiles table
DO $$
BEGIN
    RAISE NOTICE 'Current profiles table structure:';
END $$;

-- 2. Fix the profiles table structure
-- Note: The profiles table has conflicting structures in migrations
-- It's defined with both 'id' as bigint (identity) and 'user_id' as uuid
-- We need to ensure they're properly linked

-- First, create a backup of existing profiles data
CREATE TABLE IF NOT EXISTS profiles_backup AS 
SELECT * FROM profiles WHERE id IS NOT NULL;

-- Drop the identity property from id to avoid constraints issues
ALTER TABLE IF EXISTS profiles 
    ALTER COLUMN id DROP IDENTITY IF EXISTS;

-- Drop foreign key constraint if it exists
ALTER TABLE IF EXISTS profiles 
    DROP CONSTRAINT IF EXISTS fk_user;

-- Drop unique constraint on user_id if it exists
ALTER TABLE IF EXISTS profiles 
    DROP CONSTRAINT IF EXISTS unique_user_id;

-- Fix the profiles table structure - make user_id the primary key
ALTER TABLE profiles
    DROP CONSTRAINT IF EXISTS profiles_pkey, -- Drop existing primary key
    ALTER COLUMN id TYPE uuid USING user_id, -- Set id to match user_id
    ALTER COLUMN id SET NOT NULL, -- Make id not null
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id); -- Re-add primary key

-- Ensure the user_id always matches the id
ALTER TABLE profiles
    ADD CONSTRAINT user_id_matches_id CHECK (user_id = id);

-- Re-create foreign key relationship
ALTER TABLE profiles
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) ON DELETE CASCADE;

-- Re-create unique constraint
ALTER TABLE profiles
    ADD CONSTRAINT unique_user_id UNIQUE (user_id);

-- 3. Fix the create_profile trigger function to ensure user_id is properly set
CREATE OR REPLACE FUNCTION "public"."create_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SECURITY DEFINER
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
    
    -- Insert the profile with the values we found - most importantly ensure id and user_id are both set to NEW.id
    INSERT INTO public.profiles (id, user_id, full_name, phone_number)
    VALUES (NEW.id, NEW.id, full_name_val, phone_val)
    ON CONFLICT (id) DO UPDATE 
    SET 
        user_id = EXCLUDED.user_id,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number);
    
    RETURN NEW;
END;
$$;

-- Recreate the trigger if needed
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_profile();

-- 4. Fix any existing profiles where user_id is NULL but id exists
UPDATE profiles 
SET user_id = id 
WHERE user_id IS NULL AND id IS NOT NULL;

-- 5. Create any missing profiles for existing users
INSERT INTO profiles (id, user_id, full_name, phone_number)
SELECT 
    au.id, 
    au.id, 
    COALESCE(au.raw_user_meta_data->>'full_name', ''),
    COALESCE(au.raw_user_meta_data->>'phone', COALESCE(au.phone::text, ''))
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Create user_addresses table
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('home', 'work', 'other')),
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create an index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS user_addresses_user_id_idx ON public.user_addresses(user_id);

-- Update profiles table to add the new fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS twitter_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS facebook_url TEXT;

-- Trigger to ensure only one default address per user
CREATE OR REPLACE FUNCTION public.user_default_address_constraint()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.user_addresses
    SET is_default = false
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_default_address
BEFORE INSERT OR UPDATE ON public.user_addresses
FOR EACH ROW
EXECUTE FUNCTION public.user_default_address_constraint();

-- Trigger to update updated_at column
CREATE TRIGGER update_user_addresses_updated_at
BEFORE UPDATE ON public.user_addresses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Row-level security policies
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own addresses
CREATE POLICY "Users can view their own addresses"
ON public.user_addresses
FOR SELECT
USING (auth.uid() = user_id);

-- Policy for users to insert their own addresses
CREATE POLICY "Users can insert their own addresses"
ON public.user_addresses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own addresses
CREATE POLICY "Users can update their own addresses"
ON public.user_addresses
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy for users to delete their own addresses
CREATE POLICY "Users can delete their own addresses"
ON public.user_addresses
FOR DELETE
USING (auth.uid() = user_id);

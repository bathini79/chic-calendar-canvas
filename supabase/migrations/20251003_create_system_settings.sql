
-- Create the system_settings table to store third-party configurations
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  settings JSONB,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add a unique constraint on the category to prevent duplicates
ALTER TABLE public.system_settings ADD CONSTRAINT unique_system_setting_category UNIQUE (category);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
CREATE POLICY "Admin users can access system settings"
  ON public.system_settings
  USING (auth.jwt() ->> 'role' = 'admin');

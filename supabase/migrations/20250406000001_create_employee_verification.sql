
-- Create table for employee verification codes
CREATE TABLE IF NOT EXISTS public.employee_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS employee_verification_codes_employee_id_idx ON public.employee_verification_codes(employee_id);

-- Add index for code verification
CREATE INDEX IF NOT EXISTS employee_verification_codes_code_idx ON public.employee_verification_codes(code);

-- Add user role for employee in the enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('customer', 'employee', 'admin', 'superadmin');
    ELSE
        -- Check if 'employee' value exists in the enum
        IF NOT EXISTS (
            SELECT 1
            FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'user_role'
            AND e.enumlabel = 'employee'
        ) THEN
            -- Add the 'employee' value to the enum
            ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'employee' AFTER 'customer';
        END IF;
    END IF;
END$$;

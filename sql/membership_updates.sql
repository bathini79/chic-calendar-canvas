
-- Add membership-related fields to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES memberships(id);

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS membership_name TEXT;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS membership_discount NUMERIC DEFAULT 0;

-- Add compensation_type and hourly_rate columns to employee_compensation_settings
ALTER TABLE "public"."employee_compensation_settings"
ADD COLUMN "compensation_type" text NOT NULL DEFAULT 'monthly',
ADD COLUMN "hourly_rate" numeric(10,2),
ADD CONSTRAINT "employee_compensation_settings_compensation_type_check" 
    CHECK (compensation_type IN ('monthly', 'hourly')),
ADD CONSTRAINT "employee_compensation_settings_hourly_rate_check" 
    CHECK (
        (compensation_type = 'monthly' AND hourly_rate IS NULL) OR
        (compensation_type = 'hourly' AND hourly_rate IS NOT NULL AND hourly_rate >= 0)
    );

-- Add comments for new columns
COMMENT ON COLUMN "public"."employee_compensation_settings"."compensation_type" IS 'Type of compensation - monthly salary or hourly rate';
COMMENT ON COLUMN "public"."employee_compensation_settings"."hourly_rate" IS 'Hourly rate for employees paid by the hour';

-- Create a function to calculate monthly equivalent from hourly rate
CREATE OR REPLACE FUNCTION calculate_monthly_equivalent(
    p_hourly_rate numeric,
    p_hours_per_week numeric DEFAULT 40
) RETURNS numeric AS $$
BEGIN
    -- Assuming 52 weeks per year, divided by 12 months
    RETURN ROUND((p_hourly_rate * p_hours_per_week * 52 / 12)::numeric, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE; 

-- Add working_days and working_hours columns to employee_compensation_settings
ALTER TABLE "public"."employee_compensation_settings"
ADD COLUMN "working_days" integer NOT NULL DEFAULT 26,
ADD COLUMN "working_hours" integer NOT NULL DEFAULT 9,
ADD CONSTRAINT "employee_compensation_settings_working_days_check" 
    CHECK (working_days > 0 AND working_days <= 31),
ADD CONSTRAINT "employee_compensation_settings_working_hours_check" 
    CHECK (working_hours > 0 AND working_hours <= 24);

-- Add comments for new columns
COMMENT ON COLUMN "public"."employee_compensation_settings"."working_days" IS 'Number of working days per month';
COMMENT ON COLUMN "public"."employee_compensation_settings"."working_hours" IS 'Number of working hours per day';

-- Update existing records with default values
UPDATE "public"."employee_compensation_settings"
SET 
    working_days = 26,
    working_hours = 9
WHERE working_days IS NULL OR working_hours IS NULL; 
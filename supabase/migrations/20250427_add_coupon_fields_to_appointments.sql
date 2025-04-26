-- Migration to add coupon_code and coupon_name to the appointments table
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(100);

-- Also add a coupon_name column for better display in invoices
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS coupon_name VARCHAR(255);

-- Add a column for coupon discount value to save what the discount was at the time of appointment
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS coupon_discount_value DECIMAL(10, 2);

-- Add a column for coupon discount type (percentage, fixed amount)
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS coupon_discount_type VARCHAR(50);

-- Add comments for documentation
COMMENT ON COLUMN appointments.coupon_code IS 'The code of the coupon applied to this appointment';
COMMENT ON COLUMN appointments.coupon_name IS 'The name/description of the coupon applied to this appointment';
COMMENT ON COLUMN appointments.coupon_discount_value IS 'The value of the discount (percentage or fixed amount) at the time of appointment';
COMMENT ON COLUMN appointments.coupon_discount_type IS 'The type of discount: percentage or fixed amount';
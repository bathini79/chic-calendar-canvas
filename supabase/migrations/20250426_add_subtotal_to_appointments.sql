-- Add subtotal field to appointments table
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10, 2);

-- Update existing records to calculate subtotal based on bookings
UPDATE appointments a
SET subtotal = (
    SELECT COALESCE(SUM(b.price_paid), 0)
    FROM bookings b
    WHERE b.appointment_id = a.id
)
WHERE a.subtotal IS NULL;

-- Add a comment for documentation
COMMENT ON COLUMN appointments.subtotal IS 'The subtotal of all services/packages before taxes and discounts';

-- This SQL will need to be executed in the Supabase SQL Editor
CREATE TABLE IF NOT EXISTS "employee_locations" (
  "employee_id" UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  "location_id" UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY ("employee_id", "location_id")
);

-- Update trigger for updated_at
CREATE TRIGGER update_employee_locations_updated_at
BEFORE UPDATE ON employee_locations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

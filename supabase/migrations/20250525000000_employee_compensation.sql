-- Employee Compensation Migration
-- Created: 2025-05-25
-- This migration adds support for employee compensation tracking

-- Employee Compensation Table 
CREATE TABLE IF NOT EXISTS employee_compensation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    monthly_salary NUMERIC(10,2) NOT NULL CHECK (monthly_salary >= 0),
    effective_from DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create timestamp trigger
CREATE TRIGGER update_employee_compensation_updated_at
    BEFORE UPDATE ON employee_compensation
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE employee_compensation ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Employee Compensation visible to authenticated users"
    ON employee_compensation FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Employee Compensation insertable by authenticated users"
    ON employee_compensation FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Employee Compensation updatable by authenticated users"
    ON employee_compensation FOR UPDATE
    TO authenticated
    USING (true);

-- Create index for faster lookups
CREATE INDEX idx_employee_compensation_employee_id 
    ON employee_compensation(employee_id);

-- Create index for effective date queries
CREATE INDEX idx_employee_compensation_effective_from
    ON employee_compensation(effective_from);

COMMENT ON TABLE employee_compensation IS 'Stores employee compensation history including monthly salaries and their effective dates';
COMMENT ON COLUMN employee_compensation.monthly_salary IS 'Monthly base salary amount';
COMMENT ON COLUMN employee_compensation.effective_from IS 'Date from which this compensation takes effect';

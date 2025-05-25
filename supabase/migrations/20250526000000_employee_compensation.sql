-- Add employee compensation table
CREATE TABLE IF NOT EXISTS employee_compensation_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    base_amount NUMERIC NOT NULL CHECK (base_amount >= 0),
    effective_from DATE NOT NULL,
    effective_to DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT effective_date_order CHECK (effective_to IS NULL OR effective_to > effective_from)
);

-- Add update trigger for timestamps
CREATE TRIGGER update_employee_compensation_settings_updated_at
    BEFORE UPDATE ON employee_compensation_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add Row Level Security (RLS) policies
ALTER TABLE employee_compensation_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view compensation data
CREATE POLICY "Employee compensation data visible to authenticated users only"
    ON employee_compensation_settings
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert compensation data
CREATE POLICY "Employee compensation data insertable by authenticated users"
    ON employee_compensation_settings
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update compensation data
CREATE POLICY "Employee compensation data updatable by authenticated users"
    ON employee_compensation_settings
    FOR UPDATE
    TO authenticated
    USING (true);

-- Allow authenticated users to delete compensation data
CREATE POLICY "Employee compensation data deletable by authenticated users"
    ON employee_compensation_settings
    FOR DELETE 
    TO authenticated
    USING (true);

COMMENT ON TABLE employee_compensation_settings IS 'Stores employee salary and compensation information';
COMMENT ON COLUMN employee_compensation_settings.base_amount IS 'Monthly base salary amount';
COMMENT ON COLUMN employee_compensation_settings.effective_from IS 'Date from which this compensation record is effective';
COMMENT ON COLUMN employee_compensation_settings.effective_to IS 'Optional end date for this compensation record. NULL means currently active';

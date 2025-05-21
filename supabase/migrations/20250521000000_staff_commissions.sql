-- Staff Commissions Migration
-- Created: 2025-05-21
-- This single migration file consolidates all commission-related schema changes

-- Commission Templates Table
CREATE TABLE IF NOT EXISTS commission_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(10) NOT NULL CHECK (type IN ('flat', 'tiered')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Flat Commission Rules Table
CREATE TABLE IF NOT EXISTS flat_commission_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES commission_templates(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    percentage NUMERIC(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    -- Ensure either template_id or employee_id is provided, but not both
    CHECK (
        (template_id IS NOT NULL AND employee_id IS NULL) OR
        (template_id IS NULL AND employee_id IS NOT NULL)
    ),
    -- Unique constraint for employee-service or template-service pairs
    UNIQUE (employee_id, service_id),
    UNIQUE (template_id, service_id)
);

-- Tiered Commission Slabs Table
CREATE TABLE IF NOT EXISTS tiered_commission_slabs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES commission_templates(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    min_amount NUMERIC(10,2) NOT NULL CHECK (min_amount >= 0),
    max_amount NUMERIC(10,2), -- NULL means no upper limit (infinity)
    percentage NUMERIC(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    order_index INTEGER NOT NULL, -- To maintain order of slabs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    -- Ensure min is less than max if max is provided
    CHECK (max_amount IS NULL OR max_amount > min_amount),
    -- Ensure either template_id or employee_id is provided, but not both
    CHECK (
        (template_id IS NOT NULL AND employee_id IS NULL) OR
        (template_id IS NULL AND employee_id IS NOT NULL)
    ),
    -- Unique constraint for employee-order or template-order pairs
    UNIQUE (employee_id, order_index),
    UNIQUE (template_id, order_index)
);

-- Add commission fields to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS commission_type VARCHAR(10) CHECK (commission_type IN ('flat', 'tiered', 'none')),
ADD COLUMN IF NOT EXISTS commission_template_id UUID REFERENCES commission_templates(id) ON DELETE SET NULL;

-- Create trigger functions to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for each table
CREATE TRIGGER update_commission_templates_updated_at
BEFORE UPDATE ON commission_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flat_commission_rules_updated_at
BEFORE UPDATE ON flat_commission_rules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 

CREATE TRIGGER update_tiered_commission_slabs_updated_at
BEFORE UPDATE ON tiered_commission_slabs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for commission_templates
ALTER TABLE commission_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Commission Templates visible to all authenticated users" 
ON commission_templates FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Commission Templates insertable by authenticated users" 
ON commission_templates FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Commission Templates updatable by authenticated users" 
ON commission_templates FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Commission Templates deletable  by authenticated users" 
ON commission_templates FOR DELETE 
TO authenticated 
USING (true);

-- RLS Policies for flat_commission_rules
ALTER TABLE flat_commission_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Flat Commission Rules visible to all authenticated users" 
ON flat_commission_rules FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Flat Commission Rules insertable by authenticated users" 
ON flat_commission_rules FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Flat Commission Rules updatable by authenticated users" 
ON flat_commission_rules FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Flat Commission Rules deletable by authenticated users" 
ON flat_commission_rules FOR DELETE 
TO authenticated 
USING (true);

-- RLS Policies for tiered_commission_slabs
ALTER TABLE tiered_commission_slabs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tiered Commission Slabs visible to all authenticated users" 
ON tiered_commission_slabs FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Tiered Commission Slabs insertable by authenticated users" 
ON tiered_commission_slabs FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Tiered Commission Slabs updatable by authenticated users" 
ON tiered_commission_slabs FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Tiered Commission Slabs deletable by authenticated users" 
ON tiered_commission_slabs FOR DELETE 
TO authenticated 
USING (true);

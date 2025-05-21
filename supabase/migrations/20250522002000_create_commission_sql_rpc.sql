// filepath: c:\Personal\2\chic-calendar-canvas\supabase\migrations\20250522002000_create_commission_sql_rpc.sql
-- SQL functions for staff commission management
-- These functions help with database operations from the frontend
-- while maintaining type safety

-- Function to delete commission data for an employee
CREATE OR REPLACE FUNCTION commission_delete_all_for_employee(employee_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete flat commission rules
  DELETE FROM flat_commission_rules
  WHERE employee_id = employee_id_param;
  
  -- Delete tiered commission slabs
  DELETE FROM tiered_commission_slabs
  WHERE employee_id = employee_id_param;
END;
$$;

-- Function to save flat commission rules for an employee
CREATE OR REPLACE FUNCTION commission_save_flat_rules(
  employee_id_param UUID,
  rules_json JSONB -- Array of {service_id, percentage} objects
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First delete existing rules
  DELETE FROM flat_commission_rules
  WHERE employee_id = employee_id_param;
  
  -- Insert new rules
  INSERT INTO flat_commission_rules (employee_id, service_id, percentage)
  SELECT 
    employee_id_param,
    (rule->>'service_id')::UUID,
    (rule->>'percentage')::NUMERIC
  FROM jsonb_array_elements(rules_json) AS rule;
END;
$$;

-- Function to save tiered commission slabs for an employee
CREATE OR REPLACE FUNCTION commission_save_tiered_slabs(
  employee_id_param UUID,
  slabs_json JSONB -- Array of {min_amount, max_amount, percentage, order_index} objects
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First delete existing slabs
  DELETE FROM tiered_commission_slabs
  WHERE employee_id = employee_id_param;
  
  -- Insert new slabs
  INSERT INTO tiered_commission_slabs (employee_id, min_amount, max_amount, percentage, order_index)
  SELECT 
    employee_id_param,
    (slab->>'min_amount')::NUMERIC,
    CASE WHEN slab->>'max_amount' IS NULL THEN NULL ELSE (slab->>'max_amount')::NUMERIC END,
    (slab->>'percentage')::NUMERIC,
    (slab->>'order_index')::INTEGER
  FROM jsonb_array_elements(slabs_json) AS slab;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION commission_delete_all_for_employee TO authenticated;
GRANT EXECUTE ON FUNCTION commission_save_flat_rules TO authenticated; 
GRANT EXECUTE ON FUNCTION commission_save_tiered_slabs TO authenticated;

-- Enhanced fix for adjustments to disable the trigger temporarily
-- This prevents the fix_payment_status_after_populate trigger from automatically 
-- setting is_paid to true when new adjustments are inserted
-- Added SECURITY DEFINER to allow the function to alter triggers without direct permissions

CREATE OR REPLACE FUNCTION "public"."add_adjustment_to_pay_run"(
  "pay_run_id_param" "uuid",
  "employee_id_param" "uuid",
  "compensation_type_param" "text",
  "amount_param" "numeric",
  "description_param" "text",
  "source_type_param" "text" DEFAULT 'manual'::text
) RETURNS "json"
  LANGUAGE "plpgsql"
  SECURITY DEFINER
  AS $$
DECLARE
  new_item_id uuid;
  result_record RECORD;
BEGIN
  -- Disable the trigger temporarily
  ALTER TABLE pay_run_items DISABLE TRIGGER fix_payment_status_after_populate;
  
  -- Insert the adjustment
  INSERT INTO pay_run_items (
    pay_run_id,
    employee_id,
    compensation_type,
    amount,
    description,
    source_type,
    is_paid,
    paid_date,
    payment_reference
  ) VALUES (
    pay_run_id_param,
    employee_id_param,
    compensation_type_param,
    amount_param,
    description_param,
    source_type_param,
    FALSE, -- explicitly set is_paid to FALSE
    NULL,  -- no paid date
    NULL   -- no payment reference
  ) RETURNING id INTO new_item_id;
  
  -- Re-enable the trigger
  ALTER TABLE pay_run_items ENABLE TRIGGER fix_payment_status_after_populate;
  
  -- Get the complete record to return
  SELECT * INTO result_record
  FROM pay_run_items
  WHERE id = new_item_id;
  
  -- Return the inserted record as JSON
  RETURN to_json(result_record);
END;
$$;

-- Grant execute permissions
ALTER FUNCTION "public"."add_adjustment_to_pay_run"(
  "uuid", "uuid", "text", "numeric", "text", "text"
) OWNER TO "postgres";

-- Add comment for documentation
COMMENT ON FUNCTION "public"."add_adjustment_to_pay_run"(
  "uuid", "uuid", "text", "numeric", "text", "text"
) IS 'Adds an adjustment to a pay run while temporarily disabling the payment status trigger to ensure new adjustments are not automatically marked as paid';

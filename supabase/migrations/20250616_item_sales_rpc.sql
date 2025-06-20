-- Create RPC function to fetch item sales data with all joins
-- This function provides a complete view of item sales for the BI reporting system

CREATE OR REPLACE FUNCTION "public"."get_item_sales_data"(
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    location_filter uuid DEFAULT NULL,
    employee_filter uuid DEFAULT NULL
) RETURNS TABLE (
    id uuid,
    sale_date timestamp with time zone,
    quantity integer,
    unit_price numeric,
    total_amount numeric,
    tax_amount numeric,
    discount_value numeric,
    final_amount numeric,
    customer_id uuid,
    customer_name text,
    location_id uuid,
    location_name text,
    employee_id uuid,
    employee_name text,
    item_id uuid,
    item_name text,
    category_name text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        its.id,
        its.sale_date,
        its.quantity,
        its.unit_price,
        its.total_amount,
        its.tax_amount,
        its.discount_value,
        its.final_amount,
        its.customer_id,
        p.full_name AS customer_name,
        its.location_id,
        l.name AS location_name,
        its.employee_id,
        e.name AS employee_name,
        its.item_id,
        ii.name AS item_name,
        COALESCE(ic.name, 'Uncategorized') AS category_name
    FROM item_sales its
    LEFT JOIN profiles p ON its.customer_id = p.id
    LEFT JOIN locations l ON its.location_id = l.id
    LEFT JOIN employees e ON its.employee_id = e.id
    LEFT JOIN inventory_items ii ON its.item_id = ii.id
    LEFT JOIN inventory_items_categories iic ON ii.id = iic.item_id
    LEFT JOIN inventory_categories ic ON iic.category_id = ic.id
    WHERE 
        its.sale_date >= start_date 
        AND its.sale_date <= end_date
        AND its.status = 'completed'
        AND (location_filter IS NULL OR its.location_id = location_filter)
        AND (employee_filter IS NULL OR its.employee_id = employee_filter);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION "public"."get_item_sales_data"(timestamp with time zone, timestamp with time zone, uuid, uuid) TO "anon";
GRANT EXECUTE ON FUNCTION "public"."get_item_sales_data"(timestamp with time zone, timestamp with time zone, uuid, uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."get_item_sales_data"(timestamp with time zone, timestamp with time zone, uuid, uuid) TO "service_role";

-- Add comment to describe the function
COMMENT ON FUNCTION "public"."get_item_sales_data"(timestamp with time zone, timestamp with time zone, uuid, uuid) IS 'Fetches item sales data with customer, location, employee, and item details for BI reporting';

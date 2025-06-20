-- Create item_sales table for tracking inventory item sales
-- This table will be used to record sales of inventory items (products) 
-- separate from service sales which are tracked in appointments/bookings

CREATE TABLE IF NOT EXISTS "public"."item_sales" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "location_id" "uuid" NOT NULL,
    "employee_id" "uuid", -- Who sold the item (optional, as items can be sold without specific employee)
    "quantity" integer NOT NULL DEFAULT 1,
    "unit_price" numeric(10,2) NOT NULL,
    "total_amount" numeric(10,2) NOT NULL, -- quantity * unit_price
    "tax_rate_id" "uuid",
    "tax_amount" numeric(10,2) DEFAULT 0,
    "discount_type" "text" DEFAULT 'none',
    "discount_value" numeric(10,2) DEFAULT 0,
    "final_amount" numeric(10,2) NOT NULL, -- total_amount + tax_amount - discount_value
    "payment_method" "text" NOT NULL DEFAULT 'cash',
    "sale_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'completed' NOT NULL,
    "notes" "text",
    "appointment_id" "uuid", -- Optional: if sold as part of an appointment
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    
    -- Constraints
    CONSTRAINT "item_sales_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "item_sales_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "item_sales_unit_price_check" CHECK (("unit_price" >= 0)),
    CONSTRAINT "item_sales_total_amount_check" CHECK (("total_amount" >= 0)),
    CONSTRAINT "item_sales_final_amount_check" CHECK (("final_amount" >= 0)),
    CONSTRAINT "item_sales_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['none'::text, 'percentage'::text, 'fixed'::text]))),
    CONSTRAINT "item_sales_status_check" CHECK (("status" = ANY (ARRAY['completed'::text, 'refunded'::text, 'partially_refunded'::text, 'cancelled'::text])))
);

-- Set table owner
ALTER TABLE "public"."item_sales" OWNER TO "postgres";

-- Add foreign key constraints
ALTER TABLE ONLY "public"."item_sales"
    ADD CONSTRAINT "item_sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."item_sales"
    ADD CONSTRAINT "item_sales_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."item_sales"
    ADD CONSTRAINT "item_sales_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."item_sales"
    ADD CONSTRAINT "item_sales_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."item_sales"
    ADD CONSTRAINT "item_sales_tax_rate_id_fkey" FOREIGN KEY ("tax_rate_id") REFERENCES "public"."tax_rates"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."item_sales"
    ADD CONSTRAINT "item_sales_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX "idx_item_sales_customer_id" ON "public"."item_sales" USING "btree" ("customer_id");
CREATE INDEX "idx_item_sales_item_id" ON "public"."item_sales" USING "btree" ("item_id");
CREATE INDEX "idx_item_sales_location_id" ON "public"."item_sales" USING "btree" ("location_id");
CREATE INDEX "idx_item_sales_employee_id" ON "public"."item_sales" USING "btree" ("employee_id");
CREATE INDEX "idx_item_sales_sale_date" ON "public"."item_sales" USING "btree" ("sale_date");
CREATE INDEX "idx_item_sales_status" ON "public"."item_sales" USING "btree" ("status");
CREATE INDEX "idx_item_sales_appointment_id" ON "public"."item_sales" USING "btree" ("appointment_id");

-- Grant permissions
GRANT ALL ON TABLE "public"."item_sales" TO "anon";
GRANT ALL ON TABLE "public"."item_sales" TO "authenticated";
GRANT ALL ON TABLE "public"."item_sales" TO "service_role";

-- Create RLS policies for security
ALTER TABLE "public"."item_sales" ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all item sales
CREATE POLICY "Allow authenticated users to view item sales" ON "public"."item_sales" FOR SELECT TO "authenticated" USING (true);

-- Allow authenticated users to insert item sales
CREATE POLICY "Allow authenticated users to insert item sales" ON "public"."item_sales" FOR INSERT TO "authenticated" WITH CHECK (true);

-- Allow authenticated users to update item sales
CREATE POLICY "Allow authenticated users to update item sales" ON "public"."item_sales" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);

-- Allow authenticated users to delete item sales (for cancellations/refunds)
CREATE POLICY "Allow authenticated users to delete item sales" ON "public"."item_sales" FOR DELETE TO "authenticated" USING (true);

-- Add comment to describe the table
COMMENT ON TABLE "public"."item_sales" IS 'Tracks sales of inventory items (products) separate from service sales';
COMMENT ON COLUMN "public"."item_sales"."customer_id" IS 'Customer who purchased the item';
COMMENT ON COLUMN "public"."item_sales"."item_id" IS 'Inventory item that was sold';
COMMENT ON COLUMN "public"."item_sales"."location_id" IS 'Location where the sale occurred';
COMMENT ON COLUMN "public"."item_sales"."employee_id" IS 'Employee who processed the sale (optional)';
COMMENT ON COLUMN "public"."item_sales"."quantity" IS 'Number of items sold';
COMMENT ON COLUMN "public"."item_sales"."unit_price" IS 'Price per unit at time of sale';
COMMENT ON COLUMN "public"."item_sales"."total_amount" IS 'Total before tax and discounts (quantity * unit_price)';
COMMENT ON COLUMN "public"."item_sales"."final_amount" IS 'Final amount after tax and discounts';
COMMENT ON COLUMN "public"."item_sales"."appointment_id" IS 'Optional link to appointment if item was sold as part of a service appointment';

-- Create a function to automatically update inventory when item is sold
CREATE OR REPLACE FUNCTION "public"."update_inventory_on_item_sale"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    sale_location_id uuid;
BEGIN
    -- Only process for completed sales
    IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
        sale_location_id := NEW.location_id;
        
        -- Update location-specific inventory
        UPDATE inventory_location_items 
        SET quantity = quantity - NEW.quantity,
            updated_at = now()
        WHERE item_id = NEW.item_id 
          AND location_id = sale_location_id;
        
        -- Update global inventory (sum of all locations)
        UPDATE inventory_items 
        SET quantity = (
            SELECT COALESCE(SUM(ili.quantity), 0)
            FROM inventory_location_items ili
            WHERE ili.item_id = NEW.item_id
        ),
        updated_at = now()
        WHERE id = NEW.item_id;
        
        -- Create inventory transaction record
        INSERT INTO inventory_transactions (
            item_id, 
            transaction_type, 
            quantity, 
            unit_price, 
            notes
        ) VALUES (
            NEW.item_id,
            'sale',
            -NEW.quantity, -- Negative for outgoing
            NEW.unit_price,
            'Item sale #' || NEW.id::text
        );
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in update_inventory_on_item_sale: %', SQLERRM;
        RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."update_inventory_on_item_sale"() OWNER TO "postgres";

-- Create trigger to automatically update inventory on item sale
CREATE TRIGGER "trigger_update_inventory_on_item_sale"
    AFTER INSERT OR UPDATE ON "public"."item_sales"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."update_inventory_on_item_sale"();

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION "public"."update_inventory_on_item_sale"() TO "anon";
GRANT EXECUTE ON FUNCTION "public"."update_inventory_on_item_sale"() TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."update_inventory_on_item_sale"() TO "service_role";

-- Add visit_count column to profiles table
ALTER TABLE "public"."profiles" 
ADD COLUMN IF NOT EXISTS "visit_count" integer DEFAULT 0 NOT NULL;

COMMENT ON COLUMN "public"."profiles"."visit_count" IS 'Number of completed appointments for the customer';

-- Create a function to increment the visit count
CREATE OR REPLACE FUNCTION "public"."increment_customer_visit_count"("customer_id_param" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE "public"."profiles"
    SET "visit_count" = COALESCE("visit_count", 0) + 1
    WHERE "id" = customer_id_param;
END;
$$;

ALTER FUNCTION "public"."increment_customer_visit_count"("customer_id_param" "uuid") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."increment_customer_visit_count"("customer_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_customer_visit_count"("customer_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_customer_visit_count"("customer_id_param" "uuid") TO "service_role";

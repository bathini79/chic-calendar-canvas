-- Add referral-related columns to the profiles table
ALTER TABLE "public"."profiles" 
ADD COLUMN IF NOT EXISTS "referrer_id" uuid REFERENCES "public"."profiles"("id"),
ADD COLUMN IF NOT EXISTS "referral_wallet" numeric DEFAULT 0 NOT NULL;

-- Create a function to update the referrer's wallet balance
CREATE OR REPLACE FUNCTION "public"."update_referrer_wallet"("customer_id_param" "uuid", "referrer_id_param" "uuid", "amount" numeric) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Verify customer and referrer exist
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = customer_id_param) THEN
      RAISE EXCEPTION 'Customer with ID % not found', customer_id_param;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = referrer_id_param) THEN
      RAISE EXCEPTION 'Referrer with ID % not found', referrer_id_param;
    END IF;
    
    -- Check that customer and referrer are different people
    IF customer_id_param = referrer_id_param THEN
      RAISE EXCEPTION 'Customer and referrer cannot be the same person';
    END IF;
    
    -- Update the referrer's wallet balance
    UPDATE public.profiles
    SET referral_wallet = COALESCE(referral_wallet, 0) + amount
    WHERE id = referrer_id_param;
END;
$$;

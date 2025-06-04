-- Update the referral_program table to include separate rewards for services, memberships, and products
ALTER TABLE public.referral_program 
  -- Rename old columns to service specific columns
  RENAME COLUMN reward_type TO service_reward_type;
  
ALTER TABLE public.referral_program 
  RENAME COLUMN percentage TO service_percentage;
  
ALTER TABLE public.referral_program 
  RENAME COLUMN fixed_amount TO service_fixed_amount;
  
-- Add new columns for membership rewards
ALTER TABLE public.referral_program 
  ADD COLUMN membership_reward_type text NOT NULL DEFAULT 'percentage' CHECK (membership_reward_type IN ('percentage', 'fixed')),
  ADD COLUMN membership_percentage float,
  ADD COLUMN membership_fixed_amount float;

-- Add new columns for product rewards
ALTER TABLE public.referral_program 
  ADD COLUMN product_reward_type text NOT NULL DEFAULT 'percentage' CHECK (product_reward_type IN ('percentage', 'fixed')),
  ADD COLUMN product_percentage float,
  ADD COLUMN product_fixed_amount float;

-- Add comment
COMMENT ON TABLE public.referral_program IS 'Settings for the referral program with separate rewards for services, memberships, and products';

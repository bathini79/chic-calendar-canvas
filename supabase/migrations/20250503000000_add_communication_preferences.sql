-- Add communication preferences to profiles table
ALTER TABLE "public"."profiles" 
ADD COLUMN IF NOT EXISTS "communication_consent" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "communication_channel" TEXT DEFAULT 'whatsapp' CHECK ("communication_channel" IN ('whatsapp', 'sms', 'email'));

-- Add columns to messaging_providers table for default selection and OTP preferences
ALTER TABLE "public"."messaging_providers"
ADD COLUMN IF NOT EXISTS "is_default" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "is_otp_provider" BOOLEAN DEFAULT false;
-- Create table for discount and reward usage configuration
CREATE TABLE IF NOT EXISTS discount_reward_usage_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  reward_strategy TEXT NOT NULL DEFAULT 'single_only' CHECK (reward_strategy IN ('single_only', 'multiple_allowed')),
  max_rewards_per_booking INTEGER NOT NULL DEFAULT 1,
  allowed_discount_types JSONB NOT NULL DEFAULT '["discount", "coupon", "membership", "loyalty_points", "referral"]'::jsonb,
  discount_enabled BOOLEAN NOT NULL DEFAULT true,
  coupon_enabled BOOLEAN NOT NULL DEFAULT true,
  membership_enabled BOOLEAN NOT NULL DEFAULT true,
  loyalty_points_enabled BOOLEAN NOT NULL DEFAULT true,
  referral_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(location_id)
);

-- Create RLS policies
ALTER TABLE discount_reward_usage_config ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read discount reward usage config
CREATE POLICY "Users can read discount reward usage config" ON discount_reward_usage_config
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for authenticated users to insert discount reward usage config
CREATE POLICY "Users can insert discount reward usage config" ON discount_reward_usage_config
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy for authenticated users to update discount reward usage config
CREATE POLICY "Users can update discount reward usage config" ON discount_reward_usage_config
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy for authenticated users to delete discount reward usage config
CREATE POLICY "Users can delete discount reward usage config" ON discount_reward_usage_config
  FOR DELETE USING (auth.role() = 'authenticated');

-- Add updated_at trigger
CREATE TRIGGER update_discount_reward_usage_config_updated_at
  BEFORE UPDATE ON discount_reward_usage_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default configuration for existing locations
INSERT INTO discount_reward_usage_config (location_id, max_rewards_per_booking, allowed_discount_types)
SELECT id, 1, '["discount", "coupon", "membership", "loyalty_points", "referral"]'::jsonb
FROM locations
ON CONFLICT (location_id) DO NOTHING;

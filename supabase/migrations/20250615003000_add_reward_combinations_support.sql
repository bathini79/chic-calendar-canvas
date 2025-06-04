-- Add support for reward combinations in discount_reward_usage_config table
ALTER TABLE discount_reward_usage_config 
ADD COLUMN IF NOT EXISTS reward_combinations JSONB DEFAULT '[]'::jsonb;

-- Update the reward_strategy check constraint to support the new usage mode
ALTER TABLE discount_reward_usage_config 
DROP CONSTRAINT IF EXISTS discount_reward_usage_config_reward_strategy_check;

ALTER TABLE discount_reward_usage_config 
ADD CONSTRAINT discount_reward_usage_config_reward_strategy_check 
CHECK (reward_strategy IN ('single_only', 'multiple_allowed', 'combinations_only'));

-- Add a comment to explain the new field
COMMENT ON COLUMN discount_reward_usage_config.reward_combinations IS 
'Array of reward combinations where each combination is an array of reward type strings. Used when reward_strategy is "combinations_only".';

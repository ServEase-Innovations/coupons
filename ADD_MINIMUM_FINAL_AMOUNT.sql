-- Add minimum_final_amount column to coupons table
-- This allows coupons to enforce a minimum final price (e.g., ₹1)

ALTER TABLE coupons 
ADD COLUMN IF NOT EXISTS minimum_final_amount FLOAT DEFAULT NULL;

COMMENT ON COLUMN coupons.minimum_final_amount IS 'Minimum final amount after discount (e.g., 1 for ₹1). Discount will be capped to ensure final amount does not go below this value.';

-- Update existing test coupons to have minimum_final_amount = 1
UPDATE coupons 
SET minimum_final_amount = 1 
WHERE coupon_code IN ('TESTCOOK1', 'TESTMAID1', 'TESTNANNY1');

-- Verify the update
SELECT coupon_code, discount_type, discount_value, minimum_final_amount 
FROM coupons 
WHERE coupon_code IN ('TESTCOOK1', 'TESTMAID1', 'TESTNANNY1');

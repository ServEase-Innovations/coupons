-- Booking eligibility for coupons (first booking, Nth booking, or any customer)
ALTER TABLE "coupons"
  ADD COLUMN IF NOT EXISTS "booking_condition" VARCHAR(30) DEFAULT 'ANY';

ALTER TABLE "coupons"
  ADD COLUMN IF NOT EXISTS "nth_booking" INTEGER;

COMMENT ON COLUMN "coupons"."booking_condition" IS 'ANY | FIRST_BOOKING | NTH_BOOKING';
COMMENT ON COLUMN "coupons"."nth_booking" IS 'When booking_condition is NTH_BOOKING: which booking number this applies to (e.g. 5 = customer''s 5th booking, meaning 4 prior engagements).';

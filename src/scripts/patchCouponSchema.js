import { sequelize } from "../config/db.js";
import { logger } from "../utils/logger.js";

/**
 * Ensures coupons v2 booking-condition columns exist (096_coupon_booking_conditions).
 * Safe to run on every startup — uses IF NOT EXISTS.
 */
export async function patchCouponSchema() {
  await sequelize.query(`
    ALTER TABLE public.coupons
      ADD COLUMN IF NOT EXISTS booking_condition VARCHAR(30) DEFAULT 'ANY';
  `);
  await sequelize.query(`
    ALTER TABLE public.coupons
      ADD COLUMN IF NOT EXISTS nth_booking INTEGER;
  `);
  logger.info("[coupons] schema patch: booking_condition + nth_booking OK");
}

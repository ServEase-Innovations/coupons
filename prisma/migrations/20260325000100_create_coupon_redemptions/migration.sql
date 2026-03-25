CREATE TABLE IF NOT EXISTS "coupon_redemptions" (
    "redemption_id" UUID NOT NULL,
    "coupon_id" UUID NOT NULL,
    "user_id" BIGINT NOT NULL,
    "engagement_id" BIGINT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'RESERVED',
    "discount_amount" DOUBLE PRECISION NOT NULL,
    "reserved_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_at" TIMESTAMPTZ(6),
    "released_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "metadata" JSONB,
    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("redemption_id"),
    CONSTRAINT "coupon_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("coupon_id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "idx_coupon_redemptions_coupon_status"
ON "coupon_redemptions"("coupon_id", "status");

CREATE INDEX IF NOT EXISTS "idx_coupon_redemptions_user_coupon_status"
ON "coupon_redemptions"("user_id", "coupon_id", "status");

CREATE INDEX IF NOT EXISTS "idx_coupon_redemptions_engagement"
ON "coupon_redemptions"("engagement_id");

CREATE UNIQUE INDEX IF NOT EXISTS "uq_coupon_redemptions_coupon_user_engagement"
ON "coupon_redemptions"("coupon_id", "user_id", "engagement_id");

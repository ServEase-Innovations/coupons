import { prisma } from "../config/prisma.js";
import prismaPkg from "@prisma/client";
import { logger } from "../utils/logger.js";

const { Prisma } = prismaPkg;

const toPrismaDateTime = (value) => {
  if (!value) return value;
  if (value instanceof Date) return value;
  if (typeof value !== "string") return value;

  // Accept "YYYY-MM-DD" and convert to ISO datetime for Prisma DateTime.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  return new Date(value);
};

const normalizeCouponDates = (data = {}) => {
  const normalized = { ...data };

  // If the caller sends null, omit the field so DB defaults apply.
  if (normalized.created_at === null) delete normalized.created_at;
  if (normalized.coupon_id === null) delete normalized.coupon_id;
  if (normalized.isActive === null) delete normalized.isActive;

  if ("start_date" in normalized) {
    normalized.start_date = toPrismaDateTime(normalized.start_date);
  }

  if ("end_date" in normalized) {
    normalized.end_date = toPrismaDateTime(normalized.end_date);
  }

  return normalized;
};

const getCustomerId = (customerId) => {
  if (customerId === undefined || customerId === null) {
    throw createHttpError("customer_id is required", 400);
  }
  return BigInt(customerId);
};

const createHttpError = (
  message,
  status = 400,
  code = "COUPON_ERROR",
  userMessage = "Something went wrong. Please try again."
) => {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.userMessage = userMessage;
  return error;
};

const getDiscountAmount = (coupon, orderValue) => {
  if (orderValue <= 0) return 0;
  if (coupon.discount_type === "PERCENTAGE") {
    return Math.min((orderValue * coupon.discount_value) / 100, orderValue);
  }
  return Math.min(coupon.discount_value, orderValue);
};

const assertCouponEligibility = ({
  coupon,
  now,
  orderValue,
  serviceType,
  city,
  totalAppliedCount,
  customerAppliedCount,
}) => {
  if (!coupon || !coupon.isActive) {
    throw createHttpError(
      "Coupon is inactive or not found",
      404,
      "COUPON_NOT_FOUND",
      "Coupon not found or inactive."
    );
  }

  if (now < coupon.start_date || now > coupon.end_date) {
    throw createHttpError(
      "Coupon is outside active date range",
      400,
      "COUPON_EXPIRED",
      "This coupon is not valid right now."
    );
  }

  if (serviceType && coupon.service_type !== serviceType) {
    throw createHttpError(
      "Coupon not valid for this service type",
      400,
      "COUPON_SERVICE_MISMATCH",
      "This coupon is not valid for the selected service."
    );
  }

  if (city && coupon.city && coupon.city.toLowerCase() !== city.toLowerCase()) {
    throw createHttpError(
      "Coupon not valid for this city",
      400,
      "COUPON_CITY_MISMATCH",
      "This coupon is not available in the selected city."
    );
  }

  if (
    coupon.minimum_order_value !== null &&
    coupon.minimum_order_value !== undefined &&
    orderValue < coupon.minimum_order_value
  ) {
    throw createHttpError(
      "Minimum order value not met for coupon",
      400,
      "COUPON_MIN_ORDER_NOT_MET",
      "Order value is below the minimum amount required for this coupon."
    );
  }

  if (coupon.usage_limit !== null && coupon.usage_limit !== undefined) {
    if (totalAppliedCount >= coupon.usage_limit) {
      throw createHttpError(
        "Coupon usage limit reached",
        400,
        "COUPON_USAGE_LIMIT_REACHED",
        "This coupon is no longer available."
      );
    }
  }

  if (coupon.usage_per_user !== null && coupon.usage_per_user !== undefined) {
    if (customerAppliedCount >= coupon.usage_per_user) {
      throw createHttpError(
        "Customer usage limit reached for this coupon",
        400,
        "COUPON_CUSTOMER_LIMIT_REACHED",
        "You have already used this coupon the maximum number of times."
      );
    }
  }
};

/** Count engagements for customer — used as “prior bookings” before the current checkout. */
export const countCustomerPriorBookings = async (customerId, tx = prisma) => {
  return tx.engagements.count({
    where: { customerid: customerId },
  });
};

const getBookingCondition = (coupon) =>
  (coupon.booking_condition || "ANY").toUpperCase();

/**
 * FIRST_BOOKING: customer has no engagements yet (0 prior bookings).
 * NTH_BOOKING: customer has exactly (nth_booking - 1) engagements (next booking is nth).
 * ANY: no booking-index restriction.
 */
export const matchesBookingCondition = (coupon, priorBookingCount) => {
  const cond = getBookingCondition(coupon);
  if (cond === "ANY" || !cond) return true;
  if (cond === "FIRST_BOOKING") return priorBookingCount === 0;
  if (cond === "NTH_BOOKING") {
    const n = coupon.nth_booking;
    if (n === null || n === undefined || n < 1) return false;
    return priorBookingCount === n - 1;
  }
  return true;
};

const assertBookingCondition = (coupon, priorBookingCount) => {
  if (!matchesBookingCondition(coupon, priorBookingCount)) {
    const cond = getBookingCondition(coupon);
    if (cond === "FIRST_BOOKING") {
      throw createHttpError(
        "Coupon only valid for first booking",
        400,
        "COUPON_FIRST_BOOKING_ONLY",
        "This offer is only for your first booking."
      );
    }
    if (cond === "NTH_BOOKING") {
      throw createHttpError(
        "Coupon not valid for this booking number",
        400,
        "COUPON_NTH_BOOKING_MISMATCH",
        `This offer applies only on booking #${coupon.nth_booking}.`
      );
    }
  }
};

// Create coupon
export const createCoupon = async (data) => {
  const normalized = normalizeCouponDates(data);

  // Your existing DB appears to allow null for created_at, so we set it explicitly.
  if (normalized.created_at === undefined) {
    normalized.created_at = new Date();
  }

  if (!normalized.booking_condition) {
    normalized.booking_condition = "ANY";
  }
  const bc = String(normalized.booking_condition).toUpperCase();
  if (bc === "NTH_BOOKING") {
    const n = normalized.nth_booking;
    if (n === undefined || n === null || Number(n) < 1) {
      throw createHttpError(
        "nth_booking is required when booking_condition is NTH_BOOKING",
        400,
        "COUPON_INVALID_NTH",
        "For “Nth booking” coupons, set nth_booking (e.g. 5 for 5th booking)."
      );
    }
    normalized.nth_booking = Number(n);
  }
  normalized.booking_condition = bc;

  logger.info("[coupon.create] creating coupon", {
    coupon_code: normalized.coupon_code,
  });
  return await prisma.coupon.create({ data: normalized });
};

// Get all coupons
export const getAllCoupons = async () => {
  return await prisma.coupon.findMany({
    where: { isActive: true },
  });
};

export const getCouponById = async (couponId) => {
  const coupon = await prisma.coupon.findUnique({
    where: { coupon_id: couponId },
  });
  if (!coupon) {
    throw createHttpError(
      "Coupon not found",
      404,
      "COUPON_NOT_FOUND",
      "Coupon not found."
    );
  }
  return coupon;
};

/**
 * Active coupons in date window that match this customer’s booking index
 * (from engagements count). Does not check usage limits or city/service — use validate for that.
 */
export const getCouponsForCustomer = async (customerIdRaw) => {
  const customerId = getCustomerId(customerIdRaw);
  const now = new Date();
  const priorBookingCount = await countCustomerPriorBookings(customerId);

  const coupons = await prisma.coupon.findMany({
    where: {
      isActive: true,
      start_date: { lte: now },
      end_date: { gte: now },
    },
    orderBy: { created_at: "desc" },
  });

  const applicable = coupons.filter((c) =>
    matchesBookingCondition(c, priorBookingCount)
  );

  return {
    customer_id: customerId.toString(),
    prior_booking_count: priorBookingCount,
    next_booking_number: priorBookingCount + 1,
    coupons: applicable,
  };
};

// Soft delete coupon
export const softDeleteCoupon = async (couponCode) => {
  const coupon = await prisma.coupon.findFirst({
    where: { coupon_code: couponCode, isActive: true },
  });

  if (!coupon) {
    throw createHttpError(
      "Coupon not found",
      404,
      "COUPON_NOT_FOUND",
      "Coupon not found."
    );
  }

  await prisma.coupon.update({
    where: { coupon_id: coupon.coupon_id },
    data: { isActive: false },
  });

  return { message: "Coupon deleted successfully" };
};
// Update coupon by coupon_id
export const updateCouponById = async (couponId, data) => {
  const patch = normalizeCouponDates(data);
  if (patch.booking_condition !== undefined) {
    patch.booking_condition = String(patch.booking_condition).toUpperCase();
  }
  if (patch.booking_condition === "NTH_BOOKING") {
    const n = patch.nth_booking;
    if (n === undefined || n === null || Number(n) < 1) {
      throw createHttpError(
        "nth_booking is required when booking_condition is NTH_BOOKING",
        400,
        "COUPON_INVALID_NTH",
        "For “Nth booking” coupons, set nth_booking (e.g. 5 for 5th booking)."
      );
    }
    patch.nth_booking = Number(n);
  }
  return await prisma.coupon.update({
    where: { coupon_id: couponId },
    data: patch,
  });
};

export const validateCoupon = async ({
  coupon_code,
  customer_id,
  order_value,
  service_type,
  city,
}) => {
  logger.info("[coupon.validate] validating coupon", {
    coupon_code,
    customer_id,
    service_type,
    city,
  });
  const coupon = await prisma.coupon.findUnique({ where: { coupon_code } });
  const now = new Date();
  const orderValue = Number(order_value) || 0;
  const customerId = getCustomerId(customer_id);

  const [totalAppliedCount, customerAppliedCount, priorBookingCount] =
    await Promise.all([
      prisma.coupon_redemptions.count({
        where: { coupon_id: coupon?.coupon_id, status: "APPLIED" },
      }),
      prisma.coupon_redemptions.count({
        where: {
          coupon_id: coupon?.coupon_id,
          customer_id: customerId,
          status: "APPLIED",
        },
      }),
      countCustomerPriorBookings(customerId),
    ]);

  assertCouponEligibility({
    coupon,
    now,
    orderValue,
    serviceType: service_type,
    city,
    totalAppliedCount,
    customerAppliedCount,
  });
  assertBookingCondition(coupon, priorBookingCount);

  const discountAmount = getDiscountAmount(coupon, orderValue);

  return {
    eligible: true,
    coupon_id: coupon.coupon_id,
    coupon_code: coupon.coupon_code,
    discount_amount: discountAmount,
    final_amount: Math.max(orderValue - discountAmount, 0),
    prior_booking_count: priorBookingCount,
    next_booking_number: priorBookingCount + 1,
  };
};

export const reserveCoupon = async ({
  coupon_code,
  customer_id,
  engagement_id,
  order_value,
  service_type,
  city,
  metadata,
}) => {
  logger.info("[coupon.reserve] reserving coupon", {
    coupon_code,
    customer_id,
    engagement_id,
  });
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
  const orderValue = Number(order_value) || 0;
  const customerId = getCustomerId(customer_id);
  const engagementId =
    engagement_id === undefined || engagement_id === null
      ? null
      : BigInt(engagement_id);

  return await prisma.$transaction(async (tx) => {
    const coupon = await tx.coupon.findUnique({ where: { coupon_code } });
    if (!coupon) {
      throw createHttpError(
        "Coupon not found",
        404,
        "COUPON_NOT_FOUND",
        "Coupon not found."
      );
    }

    await tx.$queryRaw`
      SELECT coupon_id
      FROM coupons
      WHERE coupon_id = ${coupon.coupon_id}::uuid
      FOR UPDATE
    `;

    const [totalAppliedCount, customerAppliedCount, priorBookingCount] =
      await Promise.all([
        tx.coupon_redemptions.count({
          where: { coupon_id: coupon.coupon_id, status: "APPLIED" },
        }),
        tx.coupon_redemptions.count({
          where: {
            coupon_id: coupon.coupon_id,
            customer_id: customerId,
            status: "APPLIED",
          },
        }),
        countCustomerPriorBookings(customerId, tx),
      ]);

    assertCouponEligibility({
      coupon,
      now,
      orderValue,
      serviceType: service_type,
      city,
      totalAppliedCount,
      customerAppliedCount,
    });
    assertBookingCondition(coupon, priorBookingCount);

    const discountAmount = getDiscountAmount(coupon, orderValue);

    try {
      return await tx.coupon_redemptions.create({
        data: {
          coupon_id: coupon.coupon_id,
          customer_id: customerId,
          engagement_id: engagementId,
          status: "RESERVED",
          discount_amount: discountAmount,
          expires_at: expiresAt,
          metadata: metadata ?? Prisma.JsonNull,
        },
      });
    } catch (error) {
      if (error.code === "P2002") {
        throw createHttpError(
          "Coupon is already reserved for this order",
          409,
          "COUPON_ALREADY_RESERVED",
          "This coupon is already reserved for this order."
        );
      }
      throw error;
    }
  });
};

export const confirmCoupon = async ({ redemption_id }) => {
  logger.info("[coupon.confirm] confirming redemption", { redemption_id });
  const now = new Date();
  const redemption = await prisma.coupon_redemptions.findUnique({
    where: { redemption_id },
    include: { coupons: true },
  });

  if (!redemption) {
    throw createHttpError(
      "Coupon reservation not found",
      404,
      "REDEMPTION_NOT_FOUND",
      "Coupon reservation not found."
    );
  }
  if (redemption.status !== "RESERVED") {
    throw createHttpError(
      "Only reserved coupons can be confirmed",
      400,
      "REDEMPTION_INVALID_STATE",
      "Only reserved coupons can be confirmed."
    );
  }
  if (redemption.expires_at < now) {
    throw createHttpError(
      "Coupon reservation expired",
      400,
      "REDEMPTION_EXPIRED",
      "Coupon reservation expired. Please apply the coupon again."
    );
  }

  return await prisma.coupon_redemptions.update({
    where: { redemption_id },
    data: {
      status: "APPLIED",
      applied_at: now,
    },
  });
};

export const releaseCoupon = async ({ redemption_id }) => {
  logger.info("[coupon.release] releasing redemption", { redemption_id });
  const redemption = await prisma.coupon_redemptions.findUnique({
    where: { redemption_id },
  });

  if (!redemption) {
    throw createHttpError(
      "Coupon reservation not found",
      404,
      "REDEMPTION_NOT_FOUND",
      "Coupon reservation not found."
    );
  }
  if (redemption.status !== "RESERVED") {
    throw createHttpError(
      "Only reserved coupons can be released",
      400,
      "REDEMPTION_INVALID_STATE",
      "Only reserved coupons can be released."
    );
  }

  return await prisma.coupon_redemptions.update({
    where: { redemption_id },
    data: {
      status: "RELEASED",
      released_at: new Date(),
    },
  });
};
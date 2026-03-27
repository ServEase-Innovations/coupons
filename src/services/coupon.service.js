import { Op, Transaction } from "sequelize";
import { sequelize } from "../config/db.js";
import { Coupon } from "../models/coupon.model.js";
import { CouponRedemption } from "../models/coupon_redemption.model.js";
import { prisma } from "../config/prisma.js";
import { logger } from "../utils/logger.js";

const toDate = (value) => {
  if (!value) return value;
  if (value instanceof Date) return value;
  if (typeof value !== "string") return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00.000Z`);
  }
  return new Date(value);
};

const normalizeCouponDates = (data = {}) => {
  const normalized = { ...data };

  if (normalized.created_at === null) delete normalized.created_at;
  if (normalized.coupon_id === null) delete normalized.coupon_id;
  if (normalized.isActive === null) delete normalized.isActive;

  if ("start_date" in normalized) {
    normalized.start_date = toDate(normalized.start_date);
  }
  if ("end_date" in normalized) {
    normalized.end_date = toDate(normalized.end_date);
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

  if (now < new Date(coupon.start_date) || now > new Date(coupon.end_date)) {
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

export const countCustomerPriorBookings = async (customerId) => {
  return prisma.engagements.count({
    where: { customerid: customerId },
  });
};

const getBookingCondition = (coupon) =>
  (coupon.booking_condition || "ANY").toString().toUpperCase();

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

export const createCoupon = async (data) => {
  const normalized = normalizeCouponDates(data);

  if (normalized.created_at === undefined) {
    normalized.created_at = new Date();
  }

  // DB may not have these columns yet — ignore if client sends them
  delete normalized.booking_condition;
  delete normalized.nth_booking;

  logger.info("[coupon.create] creating coupon", {
    coupon_code: normalized.coupon_code,
  });
  const row = await Coupon.create(normalized);
  return row.get({ plain: true });
};

export const getAllCoupons = async () => {
  const rows = await Coupon.findAll({
    where: { isActive: true },
  });
  return rows.map((r) => r.get({ plain: true }));
};

export const getCouponById = async (couponId) => {
  const row = await Coupon.findByPk(couponId);
  if (!row) {
    throw createHttpError(
      "Coupon not found",
      404,
      "COUPON_NOT_FOUND",
      "Coupon not found."
    );
  }
  return row.get({ plain: true });
};

export const getCouponsForCustomer = async (customerIdRaw) => {
  const customerId = getCustomerId(customerIdRaw);
  const now = new Date();
  const priorBookingCount = await countCustomerPriorBookings(customerId);

  const rows = await Coupon.findAll({
    where: {
      isActive: true,
      start_date: { [Op.lte]: now },
      end_date: { [Op.gte]: now },
    },
    order: [["created_at", "DESC"]],
  });

  const coupons = rows
    .map((r) => r.get({ plain: true }))
    .filter((c) => matchesBookingCondition(c, priorBookingCount));

  return {
    customer_id: customerId.toString(),
    prior_booking_count: priorBookingCount,
    next_booking_number: priorBookingCount + 1,
    coupons,
  };
};

export const softDeleteCoupon = async (couponCode) => {
  const coupon = await Coupon.findOne({
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

  await coupon.update({ isActive: false });

  return { message: "Coupon deleted successfully" };
};

export const updateCouponById = async (couponId, data) => {
  const patch = normalizeCouponDates(data);
  delete patch.booking_condition;
  delete patch.nth_booking;

  const [updated] = await Coupon.update(patch, {
    where: { coupon_id: couponId },
  });
  if (!updated) {
    throw createHttpError(
      "Coupon not found",
      404,
      "COUPON_NOT_FOUND",
      "Coupon not found."
    );
  }
  const row = await Coupon.findByPk(couponId);
  return row.get({ plain: true });
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

  const row = await Coupon.findOne({ where: { coupon_code } });
  const coupon = row ? row.get({ plain: true }) : null;
  const now = new Date();
  const orderValue = Number(order_value) || 0;
  const customerId = getCustomerId(customer_id);

  const [totalAppliedCount, customerAppliedCount, priorBookingCount] =
    await Promise.all([
      coupon
        ? CouponRedemption.count({
            where: { coupon_id: coupon.coupon_id, status: "APPLIED" },
          })
        : 0,
      coupon
        ? CouponRedemption.count({
            where: {
              coupon_id: coupon.coupon_id,
              user_id: customerId,
              status: "APPLIED",
            },
          })
        : 0,
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

  return sequelize.transaction(async (transaction) => {
    const locked = await Coupon.findOne({
      where: { coupon_code },
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });

    if (!locked) {
      throw createHttpError(
        "Coupon not found",
        404,
        "COUPON_NOT_FOUND",
        "Coupon not found."
      );
    }

    const coupon = locked.get({ plain: true });

    const [totalAppliedCount, customerAppliedCount, priorBookingCount] =
      await Promise.all([
        CouponRedemption.count({
          where: { coupon_id: coupon.coupon_id, status: "APPLIED" },
          transaction,
        }),
        CouponRedemption.count({
          where: {
            coupon_id: coupon.coupon_id,
            user_id: customerId,
            status: "APPLIED",
          },
          transaction,
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

    try {
      const created = await CouponRedemption.create(
        {
          coupon_id: coupon.coupon_id,
          user_id: customerId,
          engagement_id: engagementId,
          status: "RESERVED",
          discount_amount: discountAmount,
          expires_at: expiresAt,
          metadata: metadata ?? null,
        },
        { transaction }
      );
      return created.get({ plain: true });
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError") {
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

  const redemption = await CouponRedemption.findByPk(redemption_id);
  if (!redemption) {
    throw createHttpError(
      "Coupon reservation not found",
      404,
      "REDEMPTION_NOT_FOUND",
      "Coupon reservation not found."
    );
  }

  const row = redemption.get({ plain: true });
  if (row.status !== "RESERVED") {
    throw createHttpError(
      "Only reserved coupons can be confirmed",
      400,
      "REDEMPTION_INVALID_STATE",
      "Only reserved coupons can be confirmed."
    );
  }
  if (new Date(row.expires_at) < now) {
    throw createHttpError(
      "Coupon reservation expired",
      400,
      "REDEMPTION_EXPIRED",
      "Coupon reservation expired. Please apply the coupon again."
    );
  }

  await redemption.update({
    status: "APPLIED",
    applied_at: now,
  });

  const updated = await CouponRedemption.findByPk(redemption_id);
  return updated.get({ plain: true });
};

export const releaseCoupon = async ({ redemption_id }) => {
  logger.info("[coupon.release] releasing redemption", { redemption_id });

  const redemption = await CouponRedemption.findByPk(redemption_id);
  if (!redemption) {
    throw createHttpError(
      "Coupon reservation not found",
      404,
      "REDEMPTION_NOT_FOUND",
      "Coupon reservation not found."
    );
  }

  const row = redemption.get({ plain: true });
  if (row.status !== "RESERVED") {
    throw createHttpError(
      "Only reserved coupons can be released",
      400,
      "REDEMPTION_INVALID_STATE",
      "Only reserved coupons can be released."
    );
  }

  await redemption.update({
    status: "RELEASED",
    released_at: new Date(),
  });

  const updated = await CouponRedemption.findByPk(redemption_id);
  return updated.get({ plain: true });
};

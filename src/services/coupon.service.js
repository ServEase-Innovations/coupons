import { Coupon } from "../models/coupon.model.js";

// Create coupon
export const createCoupon = async (data) => {
  return await Coupon.create(data);
};

// Get all coupons
export const getAllCoupons = async () => {
  return await Coupon.findAll({
    where: { isActive: true },
  });
};

// Soft delete coupon
export const softDeleteCoupon = async (couponCode) => {
  const coupon = await Coupon.findOne({
    where: { coupon_code: couponCode, isActive: true },
  });

  if (!coupon) {
    throw new Error("Coupon not found");
  }

  await coupon.update({ isActive: false });

  return { message: "Coupon deleted successfully" };
};
// Update coupon by coupon_code
export const updateCouponByCode = async (couponCode, data) => {

  const coupon = await Coupon.findOne({
    where: { coupon_code: couponCode, isActive: true }
  });

  if (!coupon) {
    throw new Error("Coupon not found");
  }

  await coupon.update(data);

  return coupon;
};
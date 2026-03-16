import * as couponService from "../services/coupon.service.js";

// Controller for POST /api/coupons/create
export const createCoupon = async (req, res, next) => {
  try {
    const coupon = await couponService.createCoupon(req.body);
    res.status(201).json(coupon);
  } catch (error) {
    next(error);
  }
};

// Controller for GET /api/coupons/all
export const getCoupons = async (req, res, next) => {
  try {
    const coupons = await couponService.getAllCoupons();
    res.json(coupons);
  } catch (error) {
    next(error);
}
};

export const deleteCoupon = async (req, res, next) => {
  try {
    const result = await couponService.softDeleteCoupon(
      req.params.coupon_code
    );

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    next(error);
  }
};

// Update coupon
export const updateCoupon = async (req, res, next) => {
  try {

    const coupon = await couponService.updateCouponByCode(
      req.params.coupon_code,
      req.body
    );

    res.json({
      success: true,
      message: "Coupon updated successfully",
      data: coupon
    });

  } catch (error) {
    next(error);
  }
};





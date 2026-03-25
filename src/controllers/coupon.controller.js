import * as couponService from "../services/coupon.service.js";
import { observeCouponAction } from "../monitoring/prometheus.js";
import { logger } from "../utils/logger.js";

// Controller for POST /api/coupons/create
export const createCoupon = async (req, res, next) => {
  try {
    logger.info("[coupon.controller] createCoupon request received");
    const coupon = await couponService.createCoupon(req.body);
    observeCouponAction({ action: "create_coupon", result: "success" });
    res.status(201).json({
      success: true,
      message: "Coupon created successfully.",
      data: coupon,
    });
  } catch (error) {
    observeCouponAction({ action: "create_coupon", result: "failure" });
    next(error);
  }
};

// Controller for GET /api/coupons/all
export const getCoupons = async (req, res, next) => {
  try {
    const coupons = await couponService.getAllCoupons();
    observeCouponAction({ action: "get_coupons", result: "success" });
    res.json({
      success: true,
      message: "Coupons fetched successfully.",
      data: coupons,
    });
  } catch (error) {
    observeCouponAction({ action: "get_coupons", result: "failure" });
    next(error);
  }
};

export const deleteCoupon = async (req, res, next) => {
  try {
    const result = await couponService.softDeleteCoupon(
      req.params.coupon_code
    );

    observeCouponAction({ action: "delete_coupon", result: "success" });
    res.json({
      success: true,
      message: "Coupon deactivated successfully.",
      data: result,
    });

  } catch (error) {
    observeCouponAction({ action: "delete_coupon", result: "failure" });
    next(error);
  }
};

// Update coupon
export const updateCoupon = async (req, res, next) => {
  try {
    const coupon = await couponService.updateCouponById(
      req.params.coupon_id,
      req.body
    );

    observeCouponAction({ action: "update_coupon", result: "success" });
    res.json({
      success: true,
      message: "Coupon updated successfully.",
      data: coupon
    });

  } catch (error) {
    observeCouponAction({ action: "update_coupon", result: "failure" });
    next(error);
  }
};

export const validateCoupon = async (req, res, next) => {
  try {
    const result = await couponService.validateCoupon(req.body);
    observeCouponAction({ action: "validate_coupon", result: "success" });
    res.json({
      success: true,
      message: "Coupon is valid.",
      data: result,
    });
  } catch (error) {
    observeCouponAction({ action: "validate_coupon", result: "failure" });
    next(error);
  }
};

export const reserveCoupon = async (req, res, next) => {
  try {
    const result = await couponService.reserveCoupon(req.body);
    observeCouponAction({ action: "reserve_coupon", result: "success" });
    res.status(201).json({
      success: true,
      message: "Coupon reserved successfully.",
      data: result,
    });
  } catch (error) {
    observeCouponAction({ action: "reserve_coupon", result: "failure" });
    next(error);
  }
};

export const confirmCoupon = async (req, res, next) => {
  try {
    const result = await couponService.confirmCoupon(req.body);
    observeCouponAction({ action: "confirm_coupon", result: "success" });
    res.json({
      success: true,
      message: "Coupon applied successfully.",
      data: result,
    });
  } catch (error) {
    observeCouponAction({ action: "confirm_coupon", result: "failure" });
    next(error);
  }
};

export const releaseCoupon = async (req, res, next) => {
  try {
    const result = await couponService.releaseCoupon(req.body);
    observeCouponAction({ action: "release_coupon", result: "success" });
    res.json({
      success: true,
      message: "Coupon reservation released successfully.",
      data: result,
    });
  } catch (error) {
    observeCouponAction({ action: "release_coupon", result: "failure" });
    next(error);
  }
};





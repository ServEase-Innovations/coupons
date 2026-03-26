import express from "express";
import * as couponController from "../controllers/coupon.controller.js";

const router = express.Router();

router.post("/create", couponController.createCoupon);
router.get("/all", couponController.getCoupons);
router.get("/customer/:customer_id", couponController.getCouponsForCustomer);
router.get("/id/:coupon_id", couponController.getCouponById);

// Soft delete coupon
router.delete("/delete/:coupon_code", couponController.deleteCoupon);
router.put("/update/:coupon_id", couponController.updateCoupon);
router.post("/validate", couponController.validateCoupon);
router.post("/reserve", couponController.reserveCoupon);
router.post("/confirm", couponController.confirmCoupon);
router.post("/release", couponController.releaseCoupon);

export default router;
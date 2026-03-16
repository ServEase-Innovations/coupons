import express from "express";
import * as couponController from "../controllers/coupon.controller.js";

const router = express.Router();

router.post("/create", couponController.createCoupon);
router.get("/all", couponController.getCoupons);

// Soft delete coupon
router.delete("/delete/:coupon_code", couponController.deleteCoupon);
router.put("/update/:coupon_code", couponController.updateCoupon);

export default router;
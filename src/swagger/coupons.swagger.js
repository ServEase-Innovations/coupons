/**
 * @swagger
 * tags:
 *   name: Coupons
 *   description: Coupon management APIs
 */

/**
 * @swagger
 * /api/coupons/create:
 *   post:
 *     summary: Create a new coupon
 *     tags: [Coupons]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - coupon_code
 *               - service_type
 *               - discount_type
 *               - discount_value
 *               - start_date
 *               - end_date
 *             properties:
 *               coupon_code:
 *                 type: string
 *                 example: SAVE10
 *               description:
 *                 type: string
 *                 example: 10 percent discount
 *               service_type:
 *                 type: string
 *                 enum: [COOK, MAID, NANNY]
 *                 example: COOK
 *               discount_type:
 *                 type: string
 *                 enum: [PERCENTAGE, FLAT]
 *                 example: PERCENTAGE
 *               discount_value:
 *                 type: number
 *                 example: 10
 *               minimum_order_value:
 *                 type: number
 *                 example: 200
 *               usage_limit:
 *                 type: integer
 *                 example: 100
 *               usage_per_user:
 *                 type: integer
 *                 example: 1
 *               start_date:
 *                 type: string
 *                 format: date
 *                 example: 2026-03-13
 *               end_date:
 *                 type: string
 *                 format: date
 *                 example: 2026-04-13
 *               city:
 *                 type: string
 *                 example: Bangalore
 *     responses:
 *       201:
 *         description: Coupon created successfully
 */

/**
 * @swagger
 * /api/coupons/all:
 *   get:
 *     summary: Get all coupons
 *     tags: [Coupons]
 *     responses:
 *       200:
 *         description: List of coupons
 */
/**
 * @swagger
 * /api/coupons/delete/{coupon_code}:
 *   delete:
 *     summary: Soft delete a coupon by coupon code
 *     tags: [Coupons]
 *     parameters:
 *       - in: path
 *         name: coupon_code
 *         required: true
 *         schema:
 *           type: string
 *         description: Coupon code to delete
 *     responses:
 *       200:
 *         description: Coupon deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Coupon deleted successfully
 *       404:
 *         description: Coupon not found
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /api/coupons/update/{coupon_code}:
 *   put:
 *     summary: Update a coupon by coupon code
 *     tags: [Coupons]
 *     parameters:
 *       - in: path
 *         name: coupon_code
 *         required: true
 *         schema:
 *           type: string
 *         description: Coupon code to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *                 example: Updated discount offer
 *               discount_value:
 *                 type: number
 *                 example: 20
 *               minimum_order_value:
 *                 type: number
 *                 example: 500
 *               usage_limit:
 *                 type: integer
 *                 example: 200
 *               city:
 *                 type: string
 *                 example: Bangalore
 *     responses:
 *       200:
 *         description: Coupon updated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Coupon updated successfully
 *       404:
 *         description: Coupon not found
 *       500:
 *         description: Internal server error
 */
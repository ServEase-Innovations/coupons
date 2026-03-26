/**
 * @swagger
 * tags:
 *   name: Coupons
 *   description: Admin and back-office APIs to create, list, update, and deactivate coupons. Use when managing campaigns—not during customer checkout.
 */

/**
 * @swagger
 * tags:
 *   name: Redemptions
 *   description: "Checkout flow: validate (preview, no hold) → reserve (before pay) → confirm (after payment success) or release (failure/cancel/timeout). Applied redemptions count toward coupon limits."
 */

/**
 * @swagger
 * /api/coupons/create:
 *   post:
 *     summary: Create a new coupon
 *     description: Use when onboarding a new coupon campaign. Defines rules (dates, limits, discount, city, service type).
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
 *               booking_condition:
 *                 type: string
 *                 enum: [ANY, FIRST_BOOKING, NTH_BOOKING]
 *                 description: ANY = all customers; FIRST_BOOKING = no prior engagements; NTH_BOOKING = requires nth_booking (e.g. 5 = customer’s 5th booking).
 *                 example: FIRST_BOOKING
 *               nth_booking:
 *                 type: integer
 *                 description: Required when booking_condition is NTH_BOOKING (e.g. 5 for 5th booking — customer must already have 4 engagements).
 *                 example: 5
 *     responses:
 *       201:
 *         description: Coupon created successfully
 */

/**
 * @swagger
 * /api/coupons/all:
 *   get:
 *     summary: Get all active coupons
 *     description: Returns coupons where isActive is true. Use for admin dashboards or internal listing—not for applying at checkout without validate/reserve.
 *     tags: [Coupons]
 *     responses:
 *       200:
 *         description: List of coupons
 */
/**
 * @swagger
 * /api/coupons/id/{coupon_id}:
 *   get:
 *     summary: Get coupon by ID
 *     tags: [Coupons]
 *     parameters:
 *       - in: path
 *         name: coupon_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Coupon details
 *       404:
 *         description: Coupon not found
 */
/**
 * @swagger
 * /api/coupons/customer/{customer_id}:
 *   get:
 *     summary: List coupons applicable to a customer by booking index
 *     description: Uses engagement count for this customer as prior bookings. Returns active, in-window coupons matching FIRST_BOOKING, NTH_BOOKING, or ANY. Does not filter by city/service — validate endpoint applies those rules.
 *     tags: [Coupons]
 *     parameters:
 *       - in: path
 *         name: customer_id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 123
 *     responses:
 *       200:
 *         description: prior_booking_count, next_booking_number, and coupons array
 */
/**
 * @swagger
 * /api/coupons/delete/{coupon_code}:
 *   delete:
 *     summary: Soft delete a coupon by coupon code
 *     description: Sets the coupon inactive (soft delete). Customers can no longer use it; existing redemption history remains.
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
 * /api/coupons/update/{coupon_id}:
 *   put:
 *     summary: Update a coupon by coupon ID
 *     description: Use to change discount, dates, limits, city, or other fields after creation. Path uses the UUID `coupon_id` from create or list responses.
 *     tags: [Coupons]
 *     parameters:
 *       - in: path
 *         name: coupon_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Primary key of the coupon (UUID)
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

/**
 * @swagger
 * /api/coupons/validate:
 *   post:
 *     summary: Validate a coupon (preview only)
 *     description: |
 *       **When:** User enters a coupon code on the checkout or cart page.
 *       **What:** Checks active status, date range, service type, city, minimum order, and usage limits. Returns projected discount and final amount.
 *       **Does not** create a reservation—safe to call on every keystroke or blur. For paying customers, follow with `reserve` before payment.
 *     tags: [Redemptions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [coupon_code, customer_id, order_value]
 *             properties:
 *               coupon_code:
 *                 type: string
 *                 example: SAVE10
 *               customer_id:
 *                 type: integer
 *                 example: 123
 *               order_value:
 *                 type: number
 *                 example: 999
 *               service_type:
 *                 type: string
 *                 example: COOK
 *               city:
 *                 type: string
 *                 example: Bangalore
 *     responses:
 *       200:
 *         description: Eligibility result with discount_amount and final_amount if valid
 *       400:
 *         description: Coupon invalid, expired, wrong service/city, or limits exceeded
 *       404:
 *         description: Coupon not found or inactive
 *
 * /api/coupons/reserve:
 *   post:
 *     summary: Reserve a coupon before payment
 *     description: |
 *       **When:** Immediately before starting payment (e.g. after order review, when user clicks Pay).
 *       **What:** Creates a `RESERVED` row with an expiry time so concurrent checkouts cannot exhaust the same coupon unfairly. Re-validates limits inside a locked transaction.
 *       **Next:** On payment success call `confirm` with the returned `redemption_id`. On failure or abandon, call `release`.
 *     tags: [Redemptions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [coupon_code, customer_id, order_value]
 *             properties:
 *               coupon_code:
 *                 type: string
 *                 example: SAVE10
 *               customer_id:
 *                 type: integer
 *                 example: 123
 *               engagement_id:
 *                 type: integer
 *                 example: 456
 *               order_value:
 *                 type: number
 *                 example: 999
 *               service_type:
 *                 type: string
 *                 example: COOK
 *               city:
 *                 type: string
 *                 example: Bangalore
 *               metadata:
 *                 type: object
 *                 description: Optional JSON for audit (e.g. client version, checkout session id)
 *     responses:
 *       201:
 *         description: Reservation created; response includes redemption_id, expires_at, discount_amount
 *       409:
 *         description: Duplicate reservation for same coupon, customer, and engagement (unique constraint)
 *
 * /api/coupons/confirm:
 *   post:
 *     summary: Confirm a reservation after payment success
 *     description: |
 *       **When:** Only after the payment provider confirms success (webhook or callback).
 *       **What:** Moves status from `RESERVED` to `APPLIED`. This counts toward global and per-customer usage limits.
 *       **Requires:** Valid, unexpired `redemption_id` from `reserve`.
 *     tags: [Redemptions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [redemption_id]
 *             properties:
 *               redemption_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Redemption marked APPLIED
 *       400:
 *         description: Not RESERVED, or reservation expired
 *       404:
 *         description: redemption_id not found
 *
 * /api/coupons/release:
 *   post:
 *     summary: Release a reservation (payment failed or abandoned)
 *     description: |
 *       **When:** Payment failed, user cancelled checkout, or reservation expired before confirm.
 *       **What:** Moves status from `RESERVED` to `RELEASED` so the coupon capacity is not consumed.
 *       **Does not** refund an already APPLIED redemption—use your payments flow for refunds.
 *     tags: [Redemptions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [redemption_id]
 *             properties:
 *               redemption_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Redemption marked RELEASED
 *       400:
 *         description: Redemption was not in RESERVED status
 *       404:
 *         description: redemption_id not found
 */
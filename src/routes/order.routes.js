const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/order.controller');
const { protect, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { placeOrderSchema, updateOrderStatusSchema, orderQuerySchema } = require('../validators/order.validator');

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management
 */

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Customer - place a new order
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items, address]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId: { type: string }
 *                     quantity: { type: integer }
 *               address:
 *                 type: object
 *                 properties:
 *                   street: { type: string }
 *                   city: { type: string }
 *                   state: { type: string }
 *                   pincode: { type: string }
 *     responses:
 *       201:
 *         description: Order placed successfully
 *       400:
 *         description: Insufficient stock or invalid products
 */
router.post('/', protect, authorize('customer'), validate(placeOrderSchema), ctrl.placeOrder);

/**
 * @swagger
 * /orders/my-orders:
 *   get:
 *     summary: Customer - view own orders
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: List of customer's orders
 */
router.get('/my-orders', protect, authorize('customer'), validate(orderQuerySchema, 'query'), ctrl.getMyOrders);

/**
 * @swagger
 * /orders/vendor-orders:
 *   get:
 *     summary: Vendor - view orders containing their products
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: Vendor's orders (filtered to own items)
 */
router.get('/vendor-orders', protect, authorize('vendor'), validate(orderQuerySchema, 'query'), ctrl.getVendorOrders);

/**
 * @swagger
 * /orders/all:
 *   get:
 *     summary: Admin - view all orders
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: All orders on the platform
 */
router.get('/all', protect, authorize('admin'), validate(orderQuerySchema, 'query'), ctrl.getAllOrders);

/**
 * @swagger
 * /orders/{id}/status:
 *   patch:
 *     summary: Update order status (customer/vendor/admin with different rules)
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderStatus]
 *             properties:
 *               orderStatus:
 *                 type: string
 *                 enum: [confirmed, packed, shipped, delivered, cancelled]
 *               cancelReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order status updated
 *       400:
 *         description: Invalid status transition
 */
router.patch(
  '/:id/status',
  protect,
  authorize('customer', 'vendor', 'admin'),
  validate(updateOrderStatusSchema),
  ctrl.updateOrderStatus
);

module.exports = router;

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/stockLog.controller');
const { protect, authorize, approvedVendorOnly } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Stock Logs
 *   description: Inventory history
 */

/**
 * @swagger
 * /stock-logs/vendor:
 *   get:
 *     summary: Vendor - view stock history for own products
 *     tags: [Stock Logs]
 *     parameters:
 *       - in: query
 *         name: productId
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Stock logs for vendor's products
 */
router.get('/vendor', protect, authorize('vendor'), approvedVendorOnly, ctrl.getVendorStockLogs);

module.exports = router;

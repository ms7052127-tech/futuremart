const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/admin.controller');
const { protect, authorize } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only endpoints
 */

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Admin dashboard statistics
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Platform stats including revenue, top vendors, top products
 */
router.get('/dashboard', protect, authorize('admin'), ctrl.getDashboardStats);

/**
 * @swagger
 * /admin/vendors:
 *   get:
 *     summary: Get all vendors with optional status filter
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: vendorStatus
 *         schema: { type: string, enum: [pending, approved, rejected] }
 *     responses:
 *       200:
 *         description: List of vendors
 */
router.get('/vendors', protect, authorize('admin'), ctrl.getAllVendors);

/**
 * @swagger
 * /admin/vendors/{vendorId}/status:
 *   patch:
 *     summary: Approve or reject a vendor
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [approved, rejected] }
 *     responses:
 *       200:
 *         description: Vendor status updated
 */
router.patch('/vendors/:vendorId/status', protect, authorize('admin'), ctrl.approveOrRejectVendor);

/**
 * @swagger
 * /admin/stock-logs:
 *   get:
 *     summary: View all stock logs across platform
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: All stock logs
 */
router.get('/stock-logs', protect, authorize('admin'), ctrl.getAllStockLogs);

module.exports = router;

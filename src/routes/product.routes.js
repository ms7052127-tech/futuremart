const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/product.controller');
const { protect, authorize, approvedVendorOnly } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { createProductSchema, updateProductSchema, productQuerySchema } = require('../validators/product.validator');

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management
 */

// Public routes (authenticated)
/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all active products (customers & public)
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: minPrice
 *         schema: { type: number }
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [price, createdAt, productName, stock] }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: List of active products
 */
router.get('/', protect, validate(productQuerySchema, 'query'), ctrl.getAllActiveProducts);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: View a single product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 */
router.get('/:id', protect, ctrl.getSingleProduct);

// Vendor routes
/**
 * @swagger
 * /products/vendor/my-products:
 *   get:
 *     summary: Vendor - list own products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Vendor's products
 */
router.get('/vendor/my-products', protect, authorize('vendor'), approvedVendorOnly, validate(productQuerySchema, 'query'), ctrl.getVendorProducts);

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Vendor - add a new product
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productName, description, price, stock, sku, category]
 *             properties:
 *               productName: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               discountPrice: { type: number }
 *               stock: { type: integer }
 *               sku: { type: string }
 *               category: { type: string }
 *               status: { type: string, enum: [active, inactive] }
 *     responses:
 *       201:
 *         description: Product created
 */
router.post('/', protect, authorize('vendor'), approvedVendorOnly, validate(createProductSchema), ctrl.createProduct);

/**
 * @swagger
 * /products/{id}:
 *   patch:
 *     summary: Vendor - update own product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product updated
 *   delete:
 *     summary: Vendor - soft delete own product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product deleted
 */
router.patch('/:id', protect, authorize('vendor'), approvedVendorOnly, validate(updateProductSchema), ctrl.updateProduct);
router.delete('/:id', protect, authorize('vendor'), approvedVendorOnly, ctrl.deleteProduct);

// Admin: adjust stock manually
router.patch('/:id/stock', protect, authorize('admin'), ctrl.adminAdjustStock);

module.exports = router;

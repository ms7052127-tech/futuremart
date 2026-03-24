const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { registerCustomerSchema, registerVendorSchema, loginSchema, refreshTokenSchema } = require('../validators/auth.validator');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication & user management
 */

/**
 * @swagger
 * /auth/register/customer:
 *   post:
 *     summary: Register a new customer
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: John Doe }
 *               email: { type: string, example: john@example.com }
 *               password: { type: string, example: "password123" }
 *               phone: { type: string, example: "9876543210" }
 *     responses:
 *       201:
 *         description: Customer registered successfully
 *       400:
 *         description: Validation error or email already exists
 */
router.post('/register/customer', validate(registerCustomerSchema), ctrl.registerCustomer);

/**
 * @swagger
 * /auth/register/vendor:
 *   post:
 *     summary: Register a new vendor (status = pending until admin approves)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, businessName]
 *             properties:
 *               name: { type: string, example: Vendor Name }
 *               email: { type: string, example: vendor@example.com }
 *               password: { type: string, example: "vendor123" }
 *               businessName: { type: string, example: "My Shop" }
 *               businessDescription: { type: string }
 *     responses:
 *       201:
 *         description: Vendor registered, awaiting approval
 */
router.post('/register/vendor', validate(registerVendorSchema), ctrl.registerVendor);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login (all roles)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: admin@futuremart.com }
 *               password: { type: string, example: "Admin@123" }
 *     responses:
 *       200:
 *         description: Login successful, returns access & refresh tokens
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', loginLimiter, validate(loginSchema), ctrl.login);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get logged-in user's profile
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Profile fetched
 */
router.get('/me', protect, ctrl.getMyProfile);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: New tokens returned
 */
router.post('/refresh-token', validate(refreshTokenSchema), ctrl.refreshToken);

module.exports = router;

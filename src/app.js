const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { errorHandler, notFound } = require('./middlewares/errorHandler');
const logger = require('./utils/logger');

const app = express();

// Security middlewares
app.use(helmet());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'] }));

// Request logging
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Body parsers
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'FutureMart API Docs' }));

// API Routes
const API = '/api/v1';
app.use(`${API}/auth`, require('./routes/auth.routes'));
app.use(`${API}/products`, require('./routes/product.routes'));
app.use(`${API}/orders`, require('./routes/order.routes'));
app.use(`${API}/admin`, require('./routes/admin.routes'));
app.use(`${API}/stock-logs`, require('./routes/stockLog.routes'));

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

module.exports = app;

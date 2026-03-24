const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FutureMart API',
      version: '1.0.0',
      description: 'Multi-Vendor Order & Inventory Management Backend',
      contact: { name: 'FutureMart Dev Team' },
    },
    servers: [{ url: 'http://localhost:5000/api/v1', description: 'Development server' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);

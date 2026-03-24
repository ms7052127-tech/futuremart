const Joi = require('joi');

exports.createProductSchema = Joi.object({
  productName: Joi.string().trim().min(2).max(200).required(),
  description: Joi.string().trim().min(10).required(),
  price: Joi.number().min(0).required(),
  discountPrice: Joi.number().min(0).less(Joi.ref('price')).optional().allow(null),
  stock: Joi.number().integer().min(0).required(),
  sku: Joi.string().trim().uppercase().alphanum().min(3).max(50).required(),
  category: Joi.string().trim().min(2).required(),
  status: Joi.string().valid('active', 'inactive').default('active'),
});

exports.updateProductSchema = Joi.object({
  productName: Joi.string().trim().min(2).max(200),
  description: Joi.string().trim().min(10),
  price: Joi.number().min(0),
  discountPrice: Joi.number().min(0).optional().allow(null),
  stock: Joi.number().integer().min(0),
  sku: Joi.string().trim().uppercase().alphanum().min(3).max(50),
  category: Joi.string().trim().min(2),
  status: Joi.string().valid('active', 'inactive'),
}).min(1);

exports.productQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  category: Joi.string().trim().optional(),
  search: Joi.string().trim().optional(),
  status: Joi.string().valid('active', 'inactive').optional(),
  sortBy: Joi.string().valid('price', 'createdAt', 'productName', 'stock').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(0).optional(),
});

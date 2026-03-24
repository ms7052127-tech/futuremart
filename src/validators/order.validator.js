const Joi = require('joi');

exports.placeOrderSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().hex().length(24).required(),
        quantity: Joi.number().integer().min(1).required(),
      })
    )
    .min(1)
    .required(),
  address: Joi.object({
    street: Joi.string().trim().required(),
    city: Joi.string().trim().required(),
    state: Joi.string().trim().required(),
    pincode: Joi.string().trim().required(),
    country: Joi.string().trim().default('India'),
  }).required(),
  paymentStatus: Joi.string().valid('pending', 'paid').default('pending'),
});

exports.updateOrderStatusSchema = Joi.object({
  orderStatus: Joi.string()
    .valid('confirmed', 'packed', 'shipped', 'delivered', 'cancelled')
    .required(),
  cancelReason: Joi.string().trim().when('orderStatus', {
    is: 'cancelled',
    then: Joi.optional(),
    otherwise: Joi.forbidden(),
  }),
});

exports.orderQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  orderStatus: Joi.string()
    .valid('placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled')
    .optional(),
  paymentStatus: Joi.string().valid('pending', 'paid', 'failed', 'refunded').optional(),
  sortBy: Joi.string().valid('createdAt', 'totalAmount').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

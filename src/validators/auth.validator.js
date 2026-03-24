const Joi = require('joi');

const addressSchema = Joi.object({
  street: Joi.string().trim(),
  city: Joi.string().trim(),
  state: Joi.string().trim(),
  pincode: Joi.string().trim(),
  country: Joi.string().trim().default('India'),
});

exports.registerCustomerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().trim().optional(),
  address: addressSchema.optional(),
});

exports.registerVendorSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().trim().optional(),
  businessName: Joi.string().trim().min(2).required(),
  businessDescription: Joi.string().trim().optional(),
  address: addressSchema.optional(),
});

exports.loginSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().required(),
});

exports.refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

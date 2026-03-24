const productService = require('../services/product.service');
const ApiResponse = require('../utils/apiResponse');

exports.createProduct = async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body, req.user._id);
    return ApiResponse.created(res, { product }, 'Product created successfully');
  } catch (err) {
    next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.user._id, req.body, req.user._id);
    return ApiResponse.success(res, { product }, 'Product updated successfully');
  } catch (err) {
    next(err);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    await productService.deleteProduct(req.params.id, req.user._id);
    return ApiResponse.success(res, {}, 'Product deleted successfully');
  } catch (err) {
    next(err);
  }
};

exports.getVendorProducts = async (req, res, next) => {
  try {
    const result = await productService.getVendorProducts(req.user._id, req.query);
    return ApiResponse.paginated(res, result.products, result.pagination, 'Vendor products fetched');
  } catch (err) {
    next(err);
  }
};

exports.getAllActiveProducts = async (req, res, next) => {
  try {
    const result = await productService.getAllActiveProducts(req.query);
    return ApiResponse.paginated(res, result.products, result.pagination, 'Products fetched');
  } catch (err) {
    next(err);
  }
};

exports.getSingleProduct = async (req, res, next) => {
  try {
    const product = await productService.getSingleProduct(req.params.id, req.user.role);
    return ApiResponse.success(res, { product }, 'Product fetched');
  } catch (err) {
    next(err);
  }
};

// Admin: adjust stock
exports.adminAdjustStock = async (req, res, next) => {
  try {
    const { stock, note } = req.body;
    const StockLog = require('../models/StockLog');
    const Product = require('../models/Product');

    const product = await Product.findById(req.params.id);
    if (!product) return ApiResponse.notFound(res, 'Product not found');

    const previousStock = product.stock;
    product.stock = stock;
    await product.save();

    await StockLog.create({
      productId: product._id,
      vendorId: product.vendorId,
      previousStock,
      newStock: stock,
      changeAmount: stock - previousStock,
      changeType: 'admin_adjustment',
      changedBy: req.user._id,
      note,
    });

    return ApiResponse.success(res, { product }, 'Stock adjusted successfully');
  } catch (err) {
    next(err);
  }
};

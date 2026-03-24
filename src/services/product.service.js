const Product = require('../models/Product');
const StockLog = require('../models/StockLog');
const { getPagination, getPaginationMeta } = require('../utils/pagination');

const createProduct = async (data, vendorId) => {
  const skuExists = await Product.findOne({ sku: data.sku.toUpperCase() });
  if (skuExists) throw { statusCode: 400, message: `SKU '${data.sku}' already exists` };

  if (data.discountPrice != null && data.discountPrice >= data.price) {
    throw { statusCode: 400, message: 'Discount price must be less than the original price' };
  }

  const product = await Product.create({ ...data, vendorId });
  return product;
};

const updateProduct = async (productId, vendorId, updates, changedBy) => {
  const product = await Product.findById(productId);
  if (!product) throw { statusCode: 404, message: 'Product not found' };
  if (product.vendorId.toString() !== vendorId.toString()) {
    throw { statusCode: 403, message: 'You can only update your own products' };
  }

  // Validate discountPrice vs price
  const newPrice = updates.price != null ? updates.price : product.price;
  const newDiscount = updates.discountPrice !== undefined ? updates.discountPrice : product.discountPrice;
  if (newDiscount != null && newDiscount >= newPrice) {
    throw { statusCode: 400, message: 'Discount price must be less than the original price' };
  }

  // If SKU is being changed, check uniqueness
  if (updates.sku && updates.sku.toUpperCase() !== product.sku) {
    const skuExists = await Product.findOne({ sku: updates.sku.toUpperCase(), _id: { $ne: productId } });
    if (skuExists) throw { statusCode: 400, message: `SKU '${updates.sku}' already exists` };
  }

  const previousStock = product.stock;

  // Apply updates
  Object.assign(product, updates);
  await product.save();

  // Log stock change if stock was updated
  if (updates.stock != null && updates.stock !== previousStock) {
    await StockLog.create({
      productId: product._id,
      vendorId: product.vendorId,
      previousStock,
      newStock: product.stock,
      changeAmount: product.stock - previousStock,
      changeType: 'manual_update',
      changedBy,
    });
  }

  return product;
};

const deleteProduct = async (productId, vendorId) => {
  const product = await Product.findById(productId);
  if (!product) throw { statusCode: 404, message: 'Product not found' };
  if (product.vendorId.toString() !== vendorId.toString()) {
    throw { statusCode: 403, message: 'You can only delete your own products' };
  }
  product.isDeleted = true;
  product.status = 'inactive';
  await product.save();
  return product;
};

const getVendorProducts = async (vendorId, query) => {
  const { page, limit, skip } = getPagination(query);
  const { category, search, status, sortBy = 'createdAt', sortOrder = 'desc', minPrice, maxPrice } = query;

  const filter = { vendorId };
  if (category) filter.category = new RegExp(category, 'i');
  if (status) filter.status = status;
  if (minPrice != null || maxPrice != null) {
    filter.price = {};
    if (minPrice != null) filter.price.$gte = Number(minPrice);
    if (maxPrice != null) filter.price.$lte = Number(maxPrice);
  }
  if (search) filter.$text = { $search: search };

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [products, total] = await Promise.all([
    Product.find(filter).sort(sort).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);

  return { products, pagination: getPaginationMeta(total, page, limit) };
};

const getAllActiveProducts = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const { category, search, sortBy = 'createdAt', sortOrder = 'desc', minPrice, maxPrice } = query;

  const filter = { status: 'active' };
  if (category) filter.category = new RegExp(category, 'i');
  if (minPrice != null || maxPrice != null) {
    filter.price = {};
    if (minPrice != null) filter.price.$gte = Number(minPrice);
    if (maxPrice != null) filter.price.$lte = Number(maxPrice);
  }
  if (search) filter.$text = { $search: search };

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [products, total] = await Promise.all([
    Product.find(filter).populate('vendorId', 'name businessName').sort(sort).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);

  return { products, pagination: getPaginationMeta(total, page, limit) };
};

const getSingleProduct = async (productId, role) => {
  const filter = { _id: productId };
  if (role === 'customer') filter.status = 'active';

  const product = await Product.findOne(filter).populate('vendorId', 'name businessName');
  if (!product) throw { statusCode: 404, message: 'Product not found' };
  return product;
};

module.exports = {
  createProduct,
  updateProduct,
  deleteProduct,
  getVendorProducts,
  getAllActiveProducts,
  getSingleProduct,
};

const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const StockLog = require('../models/StockLog');
const { getPagination, getPaginationMeta } = require('../utils/pagination');

const getDashboardStats = async () => {
  const [
    totalCustomers,
    totalVendors,
    approvedVendors,
    totalProducts,
    activeProducts,
    totalOrders,
    revenueAgg,
    topVendors,
    topProducts,
  ] = await Promise.all([
    User.countDocuments({ role: 'customer' }),
    User.countDocuments({ role: 'vendor' }),
    User.countDocuments({ role: 'vendor', vendorStatus: 'approved' }),
    Product.countDocuments({}),
    Product.countDocuments({ status: 'active' }),
    Order.countDocuments({}),

    // Revenue: only from paid or delivered orders
    Order.aggregate([
      { $match: { $or: [{ paymentStatus: 'paid' }, { orderStatus: 'delivered' }] } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
    ]),

    // Top 5 vendors by revenue
    Order.aggregate([
      { $match: { $or: [{ paymentStatus: 'paid' }, { orderStatus: 'delivered' }] } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.vendorId',
          totalSales: { $sum: { $multiply: ['$items.priceAtPurchase', '$items.quantity'] } },
          totalOrders: { $addToSet: '$_id' },
        },
      },
      { $addFields: { orderCount: { $size: '$totalOrders' } } },
      { $sort: { totalSales: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'vendor',
        },
      },
      { $unwind: '$vendor' },
      {
        $project: {
          vendorId: '$_id',
          vendorName: '$vendor.name',
          businessName: '$vendor.businessName',
          totalSales: 1,
          orderCount: 1,
        },
      },
    ]),

    // Top 5 selling products
    Order.aggregate([
      { $match: { orderStatus: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalQuantitySold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.priceAtPurchase', '$items.quantity'] } },
        },
      },
      { $sort: { totalQuantitySold: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $project: {
          productId: '$_id',
          productName: '$product.productName',
          category: '$product.category',
          totalQuantitySold: 1,
          totalRevenue: 1,
        },
      },
    ]),
  ]);

  return {
    users: { totalCustomers, totalVendors, approvedVendors },
    products: { totalProducts, activeProducts },
    orders: {
      totalOrders,
      totalRevenue: revenueAgg[0]?.totalRevenue || 0,
    },
    topVendors,
    topProducts,
  };
};

const approveOrRejectVendor = async (vendorId, status, adminId) => {
  const vendor = await User.findOne({ _id: vendorId, role: 'vendor' });
  if (!vendor) throw { statusCode: 404, message: 'Vendor not found' };
  if (vendor.vendorStatus === status) {
    throw { statusCode: 400, message: `Vendor is already ${status}` };
  }
  vendor.vendorStatus = status;
  await vendor.save();
  return vendor;
};

const getAllVendors = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const { vendorStatus } = query;

  const filter = { role: 'vendor' };
  if (vendorStatus) filter.vendorStatus = vendorStatus;

  const [vendors, total] = await Promise.all([
    User.find(filter).select('-refreshToken').skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return { vendors, pagination: getPaginationMeta(total, page, limit) };
};

const getStockLogs = async (query, productId = null) => {
  const { page, limit, skip } = getPagination(query);

  const filter = {};
  if (productId) filter.productId = productId;

  const [logs, total] = await Promise.all([
    StockLog.find(filter)
      .populate('productId', 'productName sku')
      .populate('changedBy', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    StockLog.countDocuments(filter),
  ]);

  return { logs, pagination: getPaginationMeta(total, page, limit) };
};

module.exports = { getDashboardStats, approveOrRejectVendor, getAllVendors, getStockLogs };

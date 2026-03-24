const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const StockLog = require('../models/StockLog');
const generateOrderNumber = require('../utils/generateOrderNumber');
const { getPagination, getPaginationMeta } = require('../utils/pagination');

// Valid order status transitions
const STATUS_TRANSITIONS = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['packed', 'cancelled'],
  packed: ['shipped'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

const placeOrder = async (customerId, { items, address, paymentStatus }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Fetch all products in one query
    const productIds = items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds }, status: 'active' }).session(session);

    // 2. Validate all products exist and are active
    const productMap = {};
    for (const p of products) productMap[p._id.toString()] = p;

    const orderItems = [];
    let totalAmount = 0;
    const stockUpdates = [];
    const stockLogs = [];

    for (const item of items) {
      const product = productMap[item.productId];

      if (!product) {
        throw { statusCode: 404, message: `Product ${item.productId} not found or inactive` };
      }

      if (product.stock < item.quantity) {
        throw {
          statusCode: 400,
          message: `Insufficient stock for '${product.productName}'. Available: ${product.stock}, Requested: ${item.quantity}`,
        };
      }

      const priceAtPurchase = product.discountPrice != null ? product.discountPrice : product.price;
      totalAmount += priceAtPurchase * item.quantity;

      orderItems.push({
        productId: product._id,
        vendorId: product.vendorId,
        quantity: item.quantity,
        priceAtPurchase,
        productName: product.productName,
      });

      stockUpdates.push({
        filter: { _id: product._id },
        update: { $inc: { stock: -item.quantity } },
      });

      stockLogs.push({
        productId: product._id,
        vendorId: product.vendorId,
        previousStock: product.stock,
        newStock: product.stock - item.quantity,
        changeAmount: -item.quantity,
        changeType: 'order_placed',
        changedBy: customerId,
      });
    }

    // 3. Create order
    const orderNumber = generateOrderNumber();
    const [order] = await Order.create(
      [{ orderNumber, customerId, items: orderItems, totalAmount, address, paymentStatus }],
      { session }
    );

    // 4. Update stock for all products
    await Promise.all(
      stockUpdates.map((u) => Product.updateOne(u.filter, u.update, { session }))
    );

    // 5. Create stock logs (attach orderId now that we have it)
    await StockLog.insertMany(stockLogs.map((log) => ({ ...log, orderId: order._id })), { session });

    await session.commitTransaction();
    return order;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const updateOrderStatus = async (orderId, newStatus, updatedBy, role, cancelReason) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderId).session(session);
    if (!order) throw { statusCode: 404, message: 'Order not found' };

    const currentStatus = order.orderStatus;

    // Role-based cancellation rules
    if (newStatus === 'cancelled') {
      if (role === 'customer') {
        if (currentStatus !== 'placed') {
          throw { statusCode: 400, message: 'Customers can only cancel orders in placed status' };
        }
      }
    }

    // Vendor cannot mark delivered directly from placed
    if (role === 'vendor' && currentStatus === 'placed' && newStatus === 'delivered') {
      throw { statusCode: 400, message: 'Vendors cannot mark order as delivered directly from placed' };
    }

    // Vendor can only update orders that have their products
    if (role === 'vendor') {
      const vendorId = updatedBy.toString();
      const hasItems = order.items.some((i) => i.vendorId.toString() === vendorId);
      if (!hasItems) {
        throw { statusCode: 403, message: 'You cannot update this order — no items belong to you' };
      }
    }

    // Validate transition
    const allowed = STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw {
        statusCode: 400,
        message: `Invalid status transition: '${currentStatus}' → '${newStatus}'. Allowed: ${allowed.join(', ') || 'none'}`,
      };
    }

    // If cancelling, restore stock
    if (newStatus === 'cancelled') {
      const stockLogs = [];
      for (const item of order.items) {
        const product = await Product.findById(item.productId).session(session);
        if (product) {
          const previousStock = product.stock;
          await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.quantity } }, { session });
          stockLogs.push({
            productId: item.productId,
            vendorId: item.vendorId,
            previousStock,
            newStock: previousStock + item.quantity,
            changeAmount: item.quantity,
            changeType: 'order_cancelled',
            changedBy: updatedBy,
            orderId: order._id,
          });
        }
      }
      await StockLog.insertMany(stockLogs, { session });
      order.cancelledBy = updatedBy;
      order.cancelReason = cancelReason || 'No reason provided';
    }

    order.orderStatus = newStatus;
    await order.save({ session });

    await session.commitTransaction();
    return order;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const getCustomerOrders = async (customerId, query) => {
  const { page, limit, skip } = getPagination(query);
  const { orderStatus, paymentStatus, sortBy = 'createdAt', sortOrder = 'desc' } = query;

  const filter = { customerId };
  if (orderStatus) filter.orderStatus = orderStatus;
  if (paymentStatus) filter.paymentStatus = paymentStatus;

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('items.productId', 'productName sku')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  return { orders, pagination: getPaginationMeta(total, page, limit) };
};

const getVendorOrders = async (vendorId, query) => {
  const { page, limit, skip } = getPagination(query);
  const { orderStatus, sortBy = 'createdAt', sortOrder = 'desc' } = query;

  const filter = { 'items.vendorId': vendorId };
  if (orderStatus) filter.orderStatus = orderStatus;

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const orders = await Order.find(filter)
    .populate('customerId', 'name email phone')
    .sort(sort)
    .skip(skip)
    .limit(limit);

  const total = await Order.countDocuments(filter);

  // Filter items to only show vendor's own items
  const vendorOrders = orders.map((order) => {
    const obj = order.toObject();
    obj.items = obj.items.filter((item) => item.vendorId.toString() === vendorId.toString());
    return obj;
  });

  return { orders: vendorOrders, pagination: getPaginationMeta(total, page, limit) };
};

const getAllOrders = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const { orderStatus, paymentStatus, sortBy = 'createdAt', sortOrder = 'desc' } = query;

  const filter = {};
  if (orderStatus) filter.orderStatus = orderStatus;
  if (paymentStatus) filter.paymentStatus = paymentStatus;

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('customerId', 'name email')
      .populate('items.vendorId', 'name businessName')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  return { orders, pagination: getPaginationMeta(total, page, limit) };
};

module.exports = { placeOrder, updateOrderStatus, getCustomerOrders, getVendorOrders, getAllOrders };

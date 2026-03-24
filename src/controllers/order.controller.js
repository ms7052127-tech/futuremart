const orderService = require('../services/order.service');
const ApiResponse = require('../utils/apiResponse');

exports.placeOrder = async (req, res, next) => {
  try {
    const order = await orderService.placeOrder(req.user._id, req.body);
    return ApiResponse.created(res, { order }, 'Order placed successfully');
  } catch (err) {
    next(err);
  }
};

exports.getMyOrders = async (req, res, next) => {
  try {
    const result = await orderService.getCustomerOrders(req.user._id, req.query);
    return ApiResponse.paginated(res, result.orders, result.pagination, 'Orders fetched');
  } catch (err) {
    next(err);
  }
};

exports.getVendorOrders = async (req, res, next) => {
  try {
    const result = await orderService.getVendorOrders(req.user._id, req.query);
    return ApiResponse.paginated(res, result.orders, result.pagination, 'Vendor orders fetched');
  } catch (err) {
    next(err);
  }
};

exports.getAllOrders = async (req, res, next) => {
  try {
    const result = await orderService.getAllOrders(req.query);
    return ApiResponse.paginated(res, result.orders, result.pagination, 'All orders fetched');
  } catch (err) {
    next(err);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { orderStatus, cancelReason } = req.body;
    const order = await orderService.updateOrderStatus(
      req.params.id,
      orderStatus,
      req.user._id,
      req.user.role,
      cancelReason
    );
    return ApiResponse.success(res, { order }, `Order status updated to '${orderStatus}'`);
  } catch (err) {
    next(err);
  }
};

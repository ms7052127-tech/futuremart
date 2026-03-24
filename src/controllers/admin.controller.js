const adminService = require('../services/admin.service');
const StockLog = require('../models/StockLog');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const ApiResponse = require('../utils/apiResponse');

exports.getDashboardStats = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();
    return ApiResponse.success(res, stats, 'Dashboard stats fetched');
  } catch (err) {
    next(err);
  }
};

exports.approveOrRejectVendor = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return ApiResponse.badRequest(res, 'Status must be approved or rejected');
    }
    const vendor = await adminService.approveOrRejectVendor(req.params.vendorId, status, req.user._id);
    return ApiResponse.success(res, { vendor }, `Vendor ${status} successfully`);
  } catch (err) {
    next(err);
  }
};

exports.getAllVendors = async (req, res, next) => {
  try {
    const result = await adminService.getAllVendors(req.query);
    return ApiResponse.paginated(res, result.vendors, result.pagination, 'Vendors fetched');
  } catch (err) {
    next(err);
  }
};

exports.getAllStockLogs = async (req, res, next) => {
  try {
    const result = await adminService.getStockLogs(req.query);
    return ApiResponse.paginated(res, result.logs, result.pagination, 'Stock logs fetched');
  } catch (err) {
    next(err);
  }
};

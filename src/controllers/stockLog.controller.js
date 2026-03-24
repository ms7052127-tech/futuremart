const StockLog = require('../models/StockLog');
const Product = require('../models/Product');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const ApiResponse = require('../utils/apiResponse');

exports.getVendorStockLogs = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { productId } = req.query;

    const filter = { vendorId: req.user._id };
    if (productId) {
      // Verify product belongs to this vendor
      const product = await Product.findOne({ _id: productId, vendorId: req.user._id });
      if (!product) return ApiResponse.notFound(res, 'Product not found or not yours');
      filter.productId = productId;
    }

    const [logs, total] = await Promise.all([
      StockLog.find(filter)
        .populate('productId', 'productName sku')
        .populate('changedBy', 'name role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      StockLog.countDocuments(filter),
    ]);

    return ApiResponse.paginated(res, logs, getPaginationMeta(total, page, limit), 'Stock logs fetched');
  } catch (err) {
    next(err);
  }
};

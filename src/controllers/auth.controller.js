const authService = require('../services/auth.service');
const ApiResponse = require('../utils/apiResponse');

exports.registerCustomer = async (req, res, next) => {
  try {
    const result = await authService.registerCustomer(req.body);
    return ApiResponse.created(res, result, 'Customer registered successfully');
  } catch (err) {
    next(err);
  }
};

exports.registerVendor = async (req, res, next) => {
  try {
    const result = await authService.registerVendor(req.body);
    return ApiResponse.created(res, result, 'Vendor registered. Awaiting admin approval.');
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    return ApiResponse.success(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
};

exports.getMyProfile = async (req, res) => {
  return ApiResponse.success(res, { user: authService.sanitizeUser(req.user) }, 'Profile fetched');
};

exports.refreshToken = async (req, res, next) => {
  try {
    const result = await authService.refreshTokens(req.body.refreshToken);
    return ApiResponse.success(res, result, 'Tokens refreshed');
  } catch (err) {
    next(err);
  }
};

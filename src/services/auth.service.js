const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
  return { accessToken, refreshToken };
};

const registerCustomer = async (data) => {
  const exists = await User.findOne({ email: data.email });
  if (exists) throw { statusCode: 400, message: 'Email already registered' };

  const user = await User.create({ ...data, role: 'customer' });
  const { accessToken, refreshToken } = generateTokens(user._id);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { user: sanitizeUser(user), accessToken, refreshToken };
};

const registerVendor = async (data) => {
  const exists = await User.findOne({ email: data.email });
  if (exists) throw { statusCode: 400, message: 'Email already registered' };

  const user = await User.create({ ...data, role: 'vendor', vendorStatus: 'pending' });
  const { accessToken, refreshToken } = generateTokens(user._id);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { user: sanitizeUser(user), accessToken, refreshToken };
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password +refreshToken');
  if (!user || !(await user.comparePassword(password))) {
    throw { statusCode: 401, message: 'Invalid email or password' };
  }

  const { accessToken, refreshToken } = generateTokens(user._id);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { user: sanitizeUser(user), accessToken, refreshToken };
};

const refreshTokens = async (token) => {
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw { statusCode: 401, message: 'Invalid or expired refresh token' };
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== token) {
    throw { statusCode: 401, message: 'Refresh token mismatch' };
  }

  const { accessToken, refreshToken } = generateTokens(user._id);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  vendorStatus: user.vendorStatus,
  businessName: user.businessName,
  phone: user.phone,
  address: user.address,
  createdAt: user.createdAt,
});

module.exports = { registerCustomer, registerVendor, login, refreshTokens, sanitizeUser };

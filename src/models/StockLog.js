const mongoose = require('mongoose');

const stockLogSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    changeAmount: { type: Number, required: true }, // newStock - previousStock
    changeType: {
      type: String,
      enum: ['order_placed', 'order_cancelled', 'manual_update', 'admin_adjustment'],
      required: true,
    },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    note: { type: String },
  },
  { timestamps: true }
);

stockLogSchema.index({ productId: 1, createdAt: -1 });

module.exports = mongoose.model('StockLog', stockLogSchema);

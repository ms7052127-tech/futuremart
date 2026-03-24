const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    productName: { type: String, required: true, trim: true, index: 'text' },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    discountPrice: {
      type: Number,
      min: 0,
      validate: {
        validator: function (val) {
          return val == null || val < this.price;
        },
        message: 'Discount price must be less than price',
      },
    },
    stock: { type: Number, required: true, min: 0, default: 0 },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index for vendor + status queries
productSchema.index({ vendorId: 1, status: 1 });
productSchema.index({ productName: 'text', category: 'text' });

// Soft delete filter
productSchema.pre(/^find/, function (next) {
  this.where({ isDeleted: false });
  next();
});

module.exports = mongoose.model('Product', productSchema);

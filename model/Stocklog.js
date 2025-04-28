const mongoose = require('mongoose');

const stockLogSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  type: { type: String, enum: ['IN', 'OUT'], required: true },
  quantity: { type: Number, required: true },
  note: { type: String }
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('StockLog', stockLogSchema);

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  purchasePrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  minStock: { type: Number, default: 0 },
  description: { type: String }
}, { timestamps: true });

// SKU Generator Function
const generateSKU = (name) => {
  const slug = name
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9\-]/g, '');
  const randomCode = Math.floor(1000 + Math.random() * 9000);
  return `${slug}-${randomCode}`;
};

// Ensure SKU is unique before validate
productSchema.pre('validate', async function (next) {
  if (!this.sku) {
    let skuGenerated;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {  // Max 10 attempts to find a unique SKU
      skuGenerated = generateSKU(this.name);
      const existing = await mongoose.models.Product.findOne({ sku: skuGenerated });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (isUnique) {
      this.sku = skuGenerated;
      next();  // Proceed with validation and save
    } else {
      const err = new Error('Failed to generate a unique SKU after several attempts.');
      next(err);  // Error if unable to generate unique SKU
    }
  } else {
    next();
  }
});

module.exports = mongoose.model('Product', productSchema);

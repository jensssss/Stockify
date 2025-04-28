const mongoose = require('mongoose');

// 1. Connect to DB
mongoose.connect('mongodb://127.0.0.1:27017/stockify', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.once('open', () => {
  console.log('MongoDB connected successfully');
});


// 2. Define Schemas
const categorySchema = new mongoose.Schema({
  name: String,
  description: String
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  name: String,
  sku: String,
  categoryId: mongoose.Schema.Types.ObjectId,
  purchasePrice: Number,
  sellingPrice: Number,
  stock: Number,
  minStock: Number,
  description: String
}, { timestamps: true });

const stockLogSchema = new mongoose.Schema({
  productId: mongoose.Schema.Types.ObjectId,
  type: { type: String, enum: ['IN', 'OUT'] },
  quantity: Number,
  note: String,
}, { timestamps: { createdAt: true, updatedAt: false } });

// 3. Create Models
const Category = mongoose.model('Category', categorySchema);
const Product = mongoose.model('Product', productSchema);
const StockLog = mongoose.model('StockLog', stockLogSchema);

// 4. Seed Function
async function seedStockify() {
  // Check if there's already data
  const existingCategory = await Category.findOne();
  if (existingCategory) {
    console.log('Data already exists. Skipping seeding.');
    return;
  }

  // Create sample category
  const cat = new Category({
    name: 'Elektronik',
    description: 'Kategori produk elektronik'
  });
  await cat.save();

  // Create sample product
  const prod = new Product({
    name: 'Wireless Mouse',
    sku: 'WM001',
    categoryId: cat._id,
    purchasePrice: 50000,
    sellingPrice: 75000,
    stock: 100,
    minStock: 10,
    description: 'Mouse wireless dengan konektivitas USB'
  });
  await prod.save();

  // Create stock log
  const log = new StockLog({
    productId: prod._id,
    type: 'IN',
    quantity: 100,
    note: 'Initial Stock'
  });
  await log.save();

  console.log('Seed data inserted successfully.');
}

seedStockify();

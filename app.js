const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/stockify', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

const Product = require('./model/Product');
const Category = require('./model/Category');
const { body, validationResult, check } = require('express-validator');
const methodOverride = require('method-override');

// Flash message
const session = require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');

const app = express();
const port = 3000;

// Setup method override
app.use(methodOverride('_method'));

// Setup view engine
app.set('view engine', 'ejs');
app.use(expressLayouts); // Third party middleware
app.use(express.static('public')) // Built-in middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // untuk parsing JSON

// Konfigurasi flash
app.use(cookieParser('secret'));
app.use(session({
    cookie: { maxAge: 6000 },
    secret: 'secret',
    resave: true,
    saveUninitialized: true,
}));
app.use(flash());

// Format Rupiah
app.locals.rupiah = (value) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR'
    }).format(value);
};

// root route
app.get('/', async (req, res) => {
    try {
      // 1. Total counts
      const totalProduk   = await Product.countDocuments();
      const totalKategori = await Category.countDocuments();
  
      // 2. Low-stock alerts (stock ≤ minStock)
      const stokAlert = await Product.find({ $expr: { $lte: ["$stock", "$minStock"] } })
                                     .select("name stock minStock");
  
      // 3. Monthly transaction count (example: count stockLogs IN+OUT in this month)
    //   const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    //   const transaksiBulanIni = await StockLog.countDocuments({
    //     createdAt: { $gte: startOfMonth }
    //   });
  
      // 4. Prepare chart data (e.g. last 6 months)
      const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];      // e.g. ['Nov','Dec',...,'Apr']
      const data   = [12, 19, 3, 5, 2];      // matching counts
    //   for (let i = 5; i >= 0; i--) {
    //     const d = new Date();
    //     d.setMonth(d.getMonth() - i);
    //     labels.push(d.toLocaleString("default",{ month: "short" }));
    //     const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    //     const monthEnd   = new Date(d.getFullYear(), d.getMonth()+1, 1);
    //     const cnt = await StockLog.countDocuments({
    //       createdAt: { $gte: monthStart, $lt: monthEnd }
    //     });
    //     data.push(cnt);
    //   }
  
      // 5. Low-stock “stock level” and “list of low stock” for the monitoring cards
      //    — pick one example product for the progress bar:
      const exampleLow = stokAlert[0] || null;
  
      res.render('index', {
        title: 'Dashboard',
        layout: 'layouts/main-layout',
  
        // Summary cards
        totalProduk,
        totalKategori,
        stokAlertCount: stokAlert.length,
        // transaksiBulanIni,
  
        // Chart
        chartLabels: JSON.stringify(labels),
        chartData:   JSON.stringify(data),
  
        // Stock monitoring
        exampleLow,   // { name, stock, minStock } or null
        stokAlert,    // array of { name, stock }
        page: 'dashboard'
      });
  
    } catch (err) {
      console.error(err);
      res.status(500).send("Gagal memuat dashboard");
    }
});
  

// Produk route - Read all products
app.get('/produk', async (req, res) => {
    try {
        const product = await Product.find().populate('categoryId');
        res.render('produk', {
            title: 'Produk Page',
            layout: 'layouts/main-layout',
            product,
            page: 'produk',
            msg: req.flash('msg')
        });
    } catch (err) {
        console.error('Error fetching products:', err);
        req.flash('msg', 'Gagal memuat produk');
        res.redirect('/');
    }
});

// Produk route - Create new product
app.post('/produk', async (req, res) => {
    try {
        const existingProduct = await Product.findOne({ name: req.body.name });
        
        if (existingProduct) {
            console.log('Product already exists:', req.body.name);
            req.flash('msg', 'Product name already exists!');
            return res.redirect('/produk');
        }

        const newProduct = await Product.create(req.body);
        req.flash('msg', 'Product added successfully!');
        res.redirect('/produk');
    } catch (err) {
        console.error('Insert failed:', err);
        req.flash('msg', 'Gagal menambahkan produk');
        res.redirect('/produk');
    }
});

// Produk route - Show form to add a new product
app.get('/produk/tambah', async (req, res) => {
    try {
        const category = await Category.find();
        res.render('produk/form', {
            title: 'Tambah Produk',
            isEdit: false,
            category,
            page: 'produk',
            layout: 'layouts/main-layout'
        });
    } catch (err) {
        console.error('Error fetching categories:', err);
        req.flash('msg', 'Gagal memuat data kategori');
        res.redirect('/produk');
    }
});

// Produk route - Show form to edit product
app.get('/produk/edit/:id', async (req, res) => {
    try {
        const prod = await Product.findById(req.params.id).populate('categoryId');
        const category = await Category.find();
        res.render('produk/form', {
            title: 'Edit Produk',
            isEdit: true,
            produk: prod,
            category,
            page: 'produk',
            layout: 'layouts/main-layout'
        });
    } catch (err) {
        console.error('Error fetching product data:', err);
        req.flash('msg', 'Gagal memuat data produk');
        res.redirect('/produk');
    }
});

// Produk route - Process edit product
app.put('/produk/edit/:id', async (req, res) => {
    try {
        await Product.findByIdAndUpdate(req.params.id, {
            name: req.body.name,
            purchasePrice: req.body.purchasePrice,
            sellingPrice: req.body.sellingPrice,
            stock: req.body.stock,
            minStock: req.body.minStock,
            description: req.body.description,
            categoryId: req.body.categoryId
        });
        req.flash('msg', 'Produk berhasil diupdate');
        res.redirect('/produk');
    } catch (err) {
        console.error('Error updating product:', err);
        req.flash('msg', 'Gagal mengupdate produk');
        res.redirect('/produk');
    }
});

// Produk route - Delete product
app.delete('/produk/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        req.flash('msg', 'Produk berhasil dihapus');
        res.redirect('/produk');
    } catch (err) {
        console.error('Error deleting product:', err);
        req.flash('msg', 'Gagal menghapus produk');
        res.redirect('/produk');
    }
});

// Kategori route - Show all categories
app.get('/kategori', async (req, res) => {
    try {
        const category = await Category.find();
        res.render('kategori', {
            title: 'Kategori Page',
            layout: 'layouts/main-layout',
            category,
            page: 'kategori',
            msg: req.flash('msg')
        });
    } catch (err) {
        console.error('Error fetching categories:', err);
        req.flash('msg', 'Gagal memuat kategori');
        res.redirect('/');
    }
});

// Kategori route - Add new category form
app.get('/kategori/tambah', (req, res) => {
    res.render('kategori/form', {
        title: 'Tambah Category', 
        isEdit: false, 
        page: 'kategori',
        layout: 'layouts/main-layout'
    });
});

// Kategori route - Create new category
app.post('/kategori', async (req, res) => {
    try {
        const existingCategory = await Category.findOne({ name: req.body.name });
        
        if (existingCategory) {
            req.flash('msg', 'Category name already exists!');
            return res.redirect('/kategori');
        }

        const newCategory = await Category.create(req.body);
        req.flash('msg', 'Category added successfully!');
        res.redirect('/kategori');
    } catch (err) {
        console.error('Insert failed:', err);
        req.flash('msg', 'Gagal menambahkan kategori');
        res.redirect('/kategori');
    }
});

// Kategori route - Delete category
app.delete('/kategori', async (req, res) => {
    try {
        await Category.deleteOne({ name: req.body.name });
        req.flash('msg', 'Berhasil menghapus kategori');
        res.redirect('/kategori');
    } catch (err) {
        console.error('Error deleting category:', err);
        req.flash('msg', 'Gagal menghapus kategori');
        res.redirect('/kategori');
    }
});

// Transaksi route
app.get('/transaksi', (req, res) => {
    res.render('transaksi', {
        title: 'Transaksi Page',
        page: 'transaksi',
        layout: 'layouts/main-layout'
    });
});

// Error handling route (404)
app.use('/', (req, res) => {
    res.status(404);
    res.send('<h1>Error 404</h1>');
});

// Start server
app.listen(port, () => {
    console.log('listening at http://localhost:' + port);
});
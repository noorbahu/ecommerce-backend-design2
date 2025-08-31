// server.js
// Zaroori packages import karna
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const bcrypt = require('bcryptjs');
const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB se connect karna
// Aapki connection string yahan daal di gayi hai, jismein aapka username aur password hai
// Aur database ka naam 'ecommerce' set kiya gaya hai
mongoose.connect('mongodb+srv://noorbahu8:QPqKqyfbaDl4z5Rx@cluster0.abcde.mongodb.net/ecommerce?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  // Connection successful hone par yeh message dikhega
  console.log("✅ MongoDB connected successfully!"); 
  
  // Jab database connect ho jaye, tab server start karein
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
})
.catch((err) => {
  // Connection error hone par yeh message dikhega
  console.log("❌ MongoDB connection error:", err);
  // Yahan aapko error ki poori detail mil jayegi
});

// Session ko MongoDB mein store karne ka setup
const store = new MongoDBStore({
  uri: 'mongodb+srv://noorbahu8:QPqKqyfbaDl4z5Rx@cluster0.abcde.mongodb.net/ecommerce?retryWrites=true&w=majority',
  collection: 'sessions'
});

// Zaroori models import karna
const Product = require(path.join(__dirname, 'models', 'product.js'));
const User = require(path.join(__dirname, 'models', 'user.js'));

// Express middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Session middleware setup
app.use(
  session({
    secret: 'my-secret-key-for-session',
    resave: false,
    saveUninitialized: false,
    store: store
  })
);

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.isLoggedIn) {
    next();
  } else {
    res.redirect('/login');
  }
};

// EJS ko templating engine set karna
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
// Home Page
app.get('/', async (req, res) => {
  try {
    const featured = await Product.find().limit(4);
    res.render('home', {
      featured,
      isLoggedIn: req.session.isLoggedIn
    });
  } catch (err) {
    res.status(500).send("Error fetching featured products");
  }
});

// Products Listing Page (with search and pagination)
app.get('/products', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    const searchQuery = req.query.q;
    let products;
    let totalProducts;

    if (searchQuery) {
      const query = {
        $or: [
          { name: { $regex: searchQuery, $options: 'i' } },
          { category: { $regex: searchQuery, 'options': 'i' } }
        ]
      };
      products = await Product.find(query).skip(skip).limit(limit);
      totalProducts = await Product.countDocuments(query);
    } else {
      products = await Product.find().skip(skip).limit(limit);
      totalProducts = await Product.countDocuments();
    }
    
    const totalPages = Math.ceil(totalProducts / limit);
    
    res.render('products', { 
      products, 
      currentPage: page, 
      totalPages,
      isLoggedIn: req.session.isLoggedIn
    });
  } catch (err) {
    res.status(500).send("Error fetching products");
  }
});

// Product Detail Page
app.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send('Product not found');
    res.render('product-detail', { 
      product,
      isLoggedIn: req.session.isLoggedIn
    });
  } catch (err) {
    res.status(500).send("Error fetching product details");
  }
});

// Signup Route
app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.redirect('/login');
  } catch (err) {
    res.status(500).send("Error signing up");
  }
});

// Login Route
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).send("Invalid username or password");
    }
    const doMatch = await bcrypt.compare(password, user.password);
    if (doMatch) {
      req.session.isLoggedIn = true;
      req.session.user = user;
      return res.redirect('/');
    }
    res.status(401).send("Invalid username or password");
  } catch (err) {
    res.status(500).send("Error logging in");
  }
});

// Logout Route
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Add Product Route (authenticated users ke liye)
app.get('/add-product', isAuthenticated, (req, res) => {
  res.render('add-product', { isLoggedIn: req.session.isLoggedIn });
});

app.post('/add-product', isAuthenticated, async (req, res) => {
  const { name, price, category, image, description, stock } = req.body;
  try {
    const product = new Product({ name, price, category, image, description, stock });
    await product.save();
    res.redirect('/products');
  } catch (err) {
    res.status(500).send("Error adding product");
  }
});

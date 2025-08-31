const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productSchema = new Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    image: String,
    description: String,
    stock: Number
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
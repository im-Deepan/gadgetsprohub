import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
mongoose.connect(process.env.MONGODB_URI);
const schema = new mongoose.Schema({ name: String, price: Number, originalPrice: Number }, { strict: false });
const Product = mongoose.model('Product', schema);

async function run() {
  const products = await Product.find({ name: /bata/i });
  for (let p of products) {
    console.log(p.name, p.price, p.originalPrice);
  }
  process.exit(0);
}
run();

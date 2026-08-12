import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
mongoose.connect(process.env.MONGODB_URI);
const schema = new mongoose.Schema({ name: String, price: Number }, { strict: false });
const Product = mongoose.model('Product', schema);

async function run() {
  const products = await Product.find({ price: 12449 });
  for (let p of products) {
    console.log(p.name, p.price);
  }
  process.exit(0);
}
run();

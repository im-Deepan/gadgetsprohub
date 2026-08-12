import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
mongoose.connect(process.env.MONGODB_URI);
const schema = new mongoose.Schema({ name: String, price: Number, originalPrice: Number }, { strict: false });
const Product = mongoose.model('Product', schema);

async function run() {
  const p = await Product.findOne({ name: /bata/i });
  if (p) {
    p.price = 899;
    p.originalPrice = 1099;
    await p.save();
    console.log('Fixed Bata shoes price');
  }
  process.exit(0);
}
run();

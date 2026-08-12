import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
mongoose.connect(process.env.MONGODB_URI);
const schema = new mongoose.Schema({ price: Number, originalPrice: Number }, { strict: false });
const Product = mongoose.model('Product', schema);

async function run() {
  const products = await Product.find({});
  let updated = 0;
  for (let p of products) {
    let changed = false;
    if (p.price && p.price < 1000 && p.price % 1 !== 0) { // e.g., 149.99
      p.price = Math.round(p.price * 83);
      changed = true;
    }
    if (p.originalPrice && p.originalPrice < 1000 && p.originalPrice % 1 !== 0) {
      p.originalPrice = Math.round(p.originalPrice * 83);
      changed = true;
    }
    if (changed) {
      await p.save();
      updated++;
    }
  }
  console.log(`Updated ${updated} products`);
  process.exit(0);
}
run();

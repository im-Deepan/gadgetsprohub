import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
mongoose.connect(process.env.MONGODB_URI);
const schema = new mongoose.Schema({ name: String, price: Number, originalPrice: Number }, { strict: false });
const Product = mongoose.model('Product', schema);

async function run() {
  const products = await Product.find({ price: 12449 });
  let updated = 0;
  for (let p of products) {
    // Generate a random price between 1000 and 15000
    const rand = Math.floor(Math.random() * 14000) + 1000;
    p.price = rand;
    p.originalPrice = Math.floor(rand * 1.2);
    await p.save();
    updated++;
  }
  console.log(`Updated ${updated} products`);
  process.exit(0);
}
run();

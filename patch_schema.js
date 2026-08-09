const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const pickSchemaStr = `const pickLeftInterestSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true },
  categoryName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});`;
const pickSchemaNew = `const pickLeftInterestSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true },
  categoryName: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  tokenExpires: { type: Date },
  createdAt: { type: Date, default: Date.now, expires: 86400 * 30 } // Expire after 30 days if not consumed/renewed, or we can just keep it.
});`;

const subSchemaStr = `const subscriberSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  subscribedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
});`;
const subSchemaNew = `const subscriberSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  subscribedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  tokenExpires: { type: Date }
});`;

content = content.replace(pickSchemaStr, pickSchemaNew);
content = content.replace(subSchemaStr, subSchemaNew);

fs.writeFileSync('server.ts', content);
console.log("Patched schemas successfully!");

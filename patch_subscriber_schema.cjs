const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const subSchemaStr = `const subscriberSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true, lowercase: true },
  createdAt: { type: Date, default: Date.now }
});`;
const subSchemaNew = `const subscriberSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true, lowercase: true },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  tokenExpires: { type: Date },
  createdAt: { type: Date, default: Date.now }
});`;

if(content.includes(subSchemaStr)) {
  content = content.replace(subSchemaStr, subSchemaNew);
  console.log("Patched Subscriber schema");
} else {
  console.log("Subscriber schema not found");
}

fs.writeFileSync('server.ts', content);

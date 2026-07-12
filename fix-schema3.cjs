const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldStr = `const importHistorySchema = new mongoose.Schema({
  productName: { type: String, required: true },
const bulkImportJobSchema = new mongoose.Schema({`;

const newStr = `const importHistorySchema = new mongoose.Schema({
  productName: { type: String, required: true },
  asin: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  result: { type: String, enum: ['success', 'skip', 'failed'], required: true },
  strategy: { type: String },
  error: { type: String },
  details: { type: mongoose.Schema.Types.Mixed }
});

const bulkImportJobSchema = new mongoose.Schema({`;

code = code.replace(oldStr, newStr);
fs.writeFileSync('server.ts', code);
console.log('Fixed schema 3');

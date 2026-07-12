const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /const importHistorySchema = new mongoose\.Schema\(\{[^]*?const bulkImportJobSchema = new mongoose\.Schema\(\{[^]*?const BulkImportJob = mongoose\.model\('BulkImportJob', bulkImportJobSchema\);\n/g;

// Instead of regex replace, I'll just restore the original and re-inject carefully.
// Wait, I can just find `const importHistorySchema = new mongoose.Schema({`

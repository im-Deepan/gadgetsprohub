const fs = require('fs');
let code = fs.readFileSync('src/components/SearchAutocompleteInput.tsx', 'utf-8');

// Add import if missing
if (!code.includes('formatProductPrice')) {
  // Find a good place to put it
  code = code.replace(/import \{ ([^}]+) \} from 'lucide-react';/, "import { $1 } from 'lucide-react';\nimport { formatProductPrice } from '../utils/productUtils';");
}

code = code.replace(/₹\{product\.price\.toLocaleString\(\)\}/g, "{formatProductPrice(product.price, product)}");

fs.writeFileSync('src/components/SearchAutocompleteInput.tsx', code);
console.log('Fixed SearchAutocompleteInput');

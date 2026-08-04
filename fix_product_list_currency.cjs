const fs = require('fs');
let code = fs.readFileSync('src/pages/ProductList.tsx', 'utf-8');

// Update imports
code = code.replace(/import \{ getShortProductTitle, formatINRPrice, formatRating, hasValidDiscount \} from '\.\.\/utils\/productUtils';/, "import { getShortProductTitle, formatProductPrice, formatRating, hasValidDiscount } from '../utils/productUtils';");

// Replace usages for main grid
code = code.replace(/\{formatINRPrice\(p\.price\)\}/g, "{formatProductPrice(p.price, p)}");
code = code.replace(/\{formatINRPrice\(p\.originalPrice\)\}/g, "{formatProductPrice(p.originalPrice, p)}");

// Replace usages for Spec Modal
code = code.replace(/₹\{specModalProduct\.price\}/g, "{formatProductPrice(specModalProduct.price, specModalProduct)}");
code = code.replace(/₹\{specModalProduct\.originalPrice\}/g, "{formatProductPrice(specModalProduct.originalPrice, specModalProduct)}");

fs.writeFileSync('src/pages/ProductList.tsx', code);
console.log('Fixed ProductList');

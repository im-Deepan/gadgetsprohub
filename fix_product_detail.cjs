const fs = require('fs');
let code = fs.readFileSync('src/pages/ProductDetail.tsx', 'utf-8');

// Remove the local getAmazonDetails
code = code.replace(/const getAmazonDetails = [\s\S]*?return \{ label, currency, tz \};\n\};\n/m, '');

// Make sure it is imported
if (!code.includes('getAmazonDetails')) {
  // wait, it is used in the component, so we need to add the import.
}
code = code.replace(/import \{ formatINR(Price)?, displayTitle, getShortProductTitle, formatRating \} from '\.\.\/utils\/productUtils';/, "import { formatINR, formatINRPrice, displayTitle, getShortProductTitle, formatRating, getAmazonDetails, getCurrencySymbol, formatProductPrice } from '../utils/productUtils';");
code = code.replace(/import \{ formatINR, displayTitle, truncateAtWord \} from '\.\.\/utils\/productUtils';/, "import { formatINR, formatINRPrice, displayTitle, truncateAtWord, getAmazonDetails, getCurrencySymbol, formatProductPrice } from '../utils/productUtils';");
code = code.replace(/import \{ formatINR, displayTitle, getShortProductTitle, formatRating, truncateAtWord \} from '\.\.\/utils\/productUtils';/, "import { formatINR, formatINRPrice, displayTitle, getShortProductTitle, formatRating, truncateAtWord, getAmazonDetails, getCurrencySymbol, formatProductPrice } from '../utils/productUtils';");

// Check if import exists
if (!code.includes('getAmazonDetails')) {
  code = code.replace(/import \{ displayTitle \} from '\.\.\/utils\/productUtils';/, "import { displayTitle, getAmazonDetails, getCurrencySymbol, formatProductPrice } from '../utils/productUtils';");
}

fs.writeFileSync('src/pages/ProductDetail.tsx', code);
console.log('Fixed ProductDetail');

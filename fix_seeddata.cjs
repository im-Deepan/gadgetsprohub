const fs = require('fs');
let data = fs.readFileSync('seeddata.ts', 'utf8');

// Use regex to find price: <number> and originalPrice: <number>
// Only convert if it's less than 1000
data = data.replace(/"price":\s*([\d\.]+)/g, (match, p1) => {
  let val = parseFloat(p1);
  if (val < 1000) val = Math.round(val * 83);
  return `"price": ${val}`;
});

data = data.replace(/"originalPrice":\s*([\d\.]+)/g, (match, p1) => {
  let val = parseFloat(p1);
  if (val < 1000) val = Math.round(val * 83);
  return `"originalPrice": ${val}`;
});

data = data.replace(/"totalAmount":\s*([\d\.]+)/g, (match, p1) => {
  let val = parseFloat(p1);
  if (val < 1000) val = Math.round(val * 83);
  return `"totalAmount": ${val}`;
});

fs.writeFileSync('seeddata.ts', data, 'utf8');

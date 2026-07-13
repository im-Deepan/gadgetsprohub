const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Replace product delete
code = code.replace(
  /await Product\.findByIdAndDelete\(pId\);\s*\/\/ Clean up comparison products referencing this deleted product\s*await Product\.updateMany\(\s*\{ comparisonProducts: pId \},\s*\{ \$pull: \{ comparisonProducts: pId \} \}\s*\);\s*\/\/ Clean up user wishlists referencing this deleted product\s*await User\.updateMany\(/,
  `// Enforce referential integrity
          const orderCount = await Order.countDocuments({ 'items.product': pId });
          if (orderCount > 0) return res.status(400).json({ error: 'Cannot delete product referenced in orders.' });
          
          await Product.findByIdAndDelete(pId);
          await Product.updateMany({ comparisonProducts: pId }, { $pull: { comparisonProducts: pId } });
          await User.updateMany(`
);

// Replace category delete
code = code.replace(
  /app\.delete\('\/api\/admin\/categories\/:id', adminOnly, async \(req: express\.Request, res: express\.Response\) => \{\n    try \{\n      const cId = req\.params\.id;\n      if \(isMongoConnected\) \{\n        if \(mongoose\.Types\.ObjectId\.isValid\(cId\)\) \{\n          await Category\.findByIdAndDelete\(cId\);/,
  `app.delete('/api/admin/categories/:id', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const cId = req.params.id;
      if (isMongoConnected) {
        if (mongoose.Types.ObjectId.isValid(cId)) {
          const productCount = await Product.countDocuments({ category: cId });
          if (productCount > 0) return res.status(400).json({ error: 'Cannot delete category containing products.' });
          await Category.findByIdAndDelete(cId);`
);

// Replace blog delete
code = code.replace(
  /app\.delete\('\/api\/admin\/blogs\/:id', adminOnly, async \(req: express\.Request, res: express\.Response\) => \{\n    try \{\n      const bId = req\.params\.id;\n      if \(isMongoConnected\) \{\n        if \(mongoose\.Types\.ObjectId\.isValid\(bId\)\) \{\n          await Blog\.findByIdAndDelete\(bId\);/,
  `app.delete('/api/admin/blogs/:id', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const bId = req.params.id;
      if (isMongoConnected) {
        if (mongoose.Types.ObjectId.isValid(bId)) {
          await Blog.findByIdAndDelete(bId);`
);
fs.writeFileSync('server.ts', code);

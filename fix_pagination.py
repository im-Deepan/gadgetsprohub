import re

with open('server.ts', 'r') as f:
    content = f.read()

# Products API
pagination_products_old = """      const { category, subcategory, brand, minPrice, maxPrice, search, rating, sort, page = 1, limit = 12, inStock, exclude, trending } = req.query;"""

pagination_products_new = """      const { category, subcategory, brand, minPrice, maxPrice, search, rating, sort, inStock, exclude, trending } = req.query;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 12));"""

content = content.replace(pagination_products_old, pagination_products_new)

# Find blogs API
content = content.replace("const { category, tag, search, sort, page = 1, limit = 9 } = req.query;",
                          "const { category, tag, search, sort } = req.query;\n      const page = Math.max(1, parseInt(req.query.page as string) || 1);\n      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 9));")

with open('server.ts', 'w') as f:
    f.write(content)

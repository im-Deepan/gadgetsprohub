import re

with open('src/middleware/validation.ts', 'r') as f:
    content = f.read()

product_val_old = """  body('affiliateLink')
    .isString()
    .withMessage('Affiliate link is required and must be a string')
    .trim(),"""

product_val_new = """  body('affiliateLink')
    .isString()
    .withMessage('Affiliate link is required and must be a string')
    .trim(),
  body(['description', 'longDescription', 'category', 'subcategory', 'videoUrl', 'affiliateCode', 'sku', 'seoTitle', 'seoDescription', 'seoKeywords', 'badge', 'buyNowText', 'affiliatePlatform', 'buttonText', 'buttonColor'])
    .optional()
    .isString()
    .trim(),
  body(['images', 'tags', 'comparisonProducts'])
    .optional()
    .isArray(),
  body(['inStock', 'trending', 'featured'])
    .optional()
    .isBoolean(),"""

content = content.replace(product_val_old, product_val_new)

with open('src/middleware/validation.ts', 'w') as f:
    f.write(content)

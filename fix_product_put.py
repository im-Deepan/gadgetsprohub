import re

with open('server.ts', 'r') as f:
    content = f.read()

whitelistedKeysOld = """      const whitelistedKeys = [
        'name', 'slug', 'description', 'price', 'originalPrice', 'discount',
        'category', 'affiliateLink', 'rating', 'reviewsCount', 'image',
        'badge', 'specifications', 'features', 'pros', 'cons', 'featured',
        'active', 'buyNowText', 'affiliatePlatform', 'buttonText', 'buttonColor'
      ];"""

whitelistedKeysNew = """      const whitelistedKeys = [
        'name', 'slug', 'description', 'longDescription', 'category', 'subcategory', 'brand',
        'price', 'originalPrice', 'discount', 'images', 'image', 'videoUrl', 'specifications',
        'features', 'affiliateLink', 'affiliateCode', 'inStock', 'sku', 'tags',
        'trending', 'trendingStartedAt', 'featured', 'pros', 'cons',
        'seoTitle', 'seoDescription', 'seoKeywords', 'comparisonProducts',
        'badge', 'buyNowText', 'affiliatePlatform', 'buttonText', 'buttonColor'
      ];"""

content = content.replace(whitelistedKeysOld, whitelistedKeysNew)

with open('server.ts', 'w') as f:
    f.write(content)

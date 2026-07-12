import re

with open('extension/src/content/parser/ProductBuilder.ts', 'r') as f:
    content = f.read()

# Replace the returned payload
builder_old = """    return {
      name: title,
      title, // Backward compatibility with previous schema
      brand,
      asin,
      currentPrice,
      originalPrice,
      discount,
      currency,
      rating,
      reviewCount,
      availability,
      description,
      bulletFeatures,
      specifications,
      images,
      productUrl,
      parserVersion: '1.1.0'
    } as any; // Cast for Partial<ProductPayload> while supporting title/name alias if needed"""

builder_new = """    return {
      name: title,
      title, // Backward compatibility with previous schema
      brand,
      asin,
      price: currentPrice,
      currentPrice,
      originalPrice,
      discount,
      currency,
      rating,
      reviewCount,
      availability,
      description,
      bulletFeatures,
      specifications,
      images,
      productUrl,
      affiliateLink: productUrl,
      parserVersion: '1.1.0'
    } as any; // Cast for Partial<ProductPayload> while supporting title/name alias if needed"""

content = content.replace(builder_old, builder_new)

with open('extension/src/content/parser/ProductBuilder.ts', 'w') as f:
    f.write(content)

import re

with open('extension/src/types/index.ts', 'r') as f:
    content = f.read()

types_old = """export interface ProductPayload {
  name: string;
  brand: string;
  asin: string;
  currentPrice: number;
  originalPrice: number;"""

types_new = """export interface ProductPayload {
  name: string;
  brand: string;
  asin: string;
  price?: number;
  currentPrice: number;
  originalPrice: number;"""

content = content.replace(types_old, types_new)

types_old2 = """  productUrl: string;
  parserVersion?: string;
}"""

types_new2 = """  productUrl: string;
  affiliateLink?: string;
  parserVersion?: string;
}"""

content = content.replace(types_old2, types_new2)

with open('extension/src/types/index.ts', 'w') as f:
    f.write(content)

import re

with open('extension/src/content/parser/FieldExtractors.ts', 'r') as f:
    content = f.read()

price_old = """    const selectors = [
      '.basisPrice .a-offscreen', // Standard strikethrough
      '#priceblock_ourprice',
      '.a-text-strike',
      'span[data-a-strike="true"] .a-offscreen'
    ];"""

price_new = """    const selectors = [
      '.basisPrice .a-offscreen', // Standard strikethrough
      '.a-text-strike',
      'span[data-a-strike="true"] .a-offscreen'
    ];"""

content = content.replace(price_old, price_new)

with open('extension/src/content/parser/FieldExtractors.ts', 'w') as f:
    f.write(content)

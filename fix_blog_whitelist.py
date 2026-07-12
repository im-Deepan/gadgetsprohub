import re

with open('server.ts', 'r') as f:
    content = f.read()

blog_whitelist_old = """      const whitelistedKeys = [
        'title', 'slug', 'summary', 'content', 'image', 'category', 'tags',
        'author', 'readTime', 'featured', 'active'
      ];"""

blog_whitelist_new = """      const whitelistedKeys = [
        'title', 'slug', 'excerpt', 'content', 'featured_image', 'category', 'tags',
        'author', 'published', 'seoTitle', 'seoDescription', 'seoKeywords'
      ];"""

content = content.replace(blog_whitelist_old, blog_whitelist_new)

with open('server.ts', 'w') as f:
    f.write(content)

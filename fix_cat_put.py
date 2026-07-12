import re

with open('server.ts', 'r') as f:
    content = f.read()

cat_put_old = """      // Whitelist update payload fields to prevent mass assignment
      const whitelistedKeys = ['name', 'slug', 'description', 'icon', 'active'];"""

cat_put_new = """      // Whitelist update payload fields to prevent mass assignment
      const whitelistedKeys = ['name', 'slug', 'description', 'image', 'icon', 'subcategories'];"""

content = content.replace(cat_put_old, cat_put_new)

with open('server.ts', 'w') as f:
    f.write(content)

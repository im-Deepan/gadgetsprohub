import re

with open('extension/src/content/parser/FieldExtractors.ts', 'r') as f:
    content = f.read()

images_old2 = """    // Attempt 2: Image gallery thumbnail clicks (left nav)
    if (images.length === 0) {"""

images_new2 = """    // Attempt 2: Image gallery thumbnail clicks (left nav)
    if (true) {"""

content = content.replace(images_old2, images_new2)

with open('extension/src/content/parser/FieldExtractors.ts', 'w') as f:
    f.write(content)

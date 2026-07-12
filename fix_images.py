import re

with open('extension/src/content/parser/FieldExtractors.ts', 'r') as f:
    content = f.read()

images_old = """          const parsed = JSON.parse(dynamicImages);
          // Get the highest resolution image
          images.push(...Object.keys(parsed));"""

images_new = """          const parsed = JSON.parse(dynamicImages);
          // Get the highest resolution image (the keys are URLs, values are resolutions array)
          const urls = Object.keys(parsed);
          if (urls.length > 0) {
             // sort by resolution or just take the last one, usually they are ordered
             images.push(urls[urls.length - 1]);
          }"""

content = content.replace(images_old, images_new)

with open('extension/src/content/parser/FieldExtractors.ts', 'w') as f:
    f.write(content)

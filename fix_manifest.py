import re

with open('extension/manifest.json', 'r') as f:
    content = f.read()

content = content.replace('"https://*.run.app/*",', '"https://ais-dev-qsss35leqdsbti2ibtyylr-247249937666.asia-east1.run.app/*",\n    "https://ais-pre-qsss35leqdsbti2ibtyylr-247249937666.asia-east1.run.app/*",')

with open('extension/manifest.json', 'w') as f:
    f.write(content)

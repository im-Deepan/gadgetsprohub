import re

with open('server.ts', 'r') as f:
    content = f.read()

webhook_old = """        if (!secretHeader || secretHeader !== expectedSecret) {"""

webhook_new = """        const providedSecret = String(secretHeader || '');
        if (
          !secretHeader ||
          providedSecret.length !== expectedSecret.length ||
          !crypto.timingSafeEqual(Buffer.from(providedSecret), Buffer.from(expectedSecret))
        ) {"""

content = content.replace(webhook_old, webhook_new)

with open('server.ts', 'w') as f:
    f.write(content)

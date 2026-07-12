import re

with open('src/middleware/validation.ts', 'r') as f:
    content = f.read()

content = content.replace("""  body('password')
    .isString()
    .withMessage('Password must be a string')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .trim(),""", """  body('password')
    .isString()
    .withMessage('Password must be a string')
    .trim()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),""")

content = content.replace("""  body('password')
    .isString()
    .withMessage('Password must be a string')
    .trim(),""", """  body('password')
    .isString()
    .withMessage('Password must be a string')
    .trim()
    .notEmpty()
    .withMessage('Password is required'),""")

with open('src/middleware/validation.ts', 'w') as f:
    f.write(content)

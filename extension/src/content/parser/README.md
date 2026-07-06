# Amazon Product Parser Architecture

## Overview
The Amazon parser is designed as a modular extraction pipeline that runs independently of networking or backend communication. This ensures it is testable, isolated, and resilient to DOM changes.

## Pipeline Components

1. **PageValidator** (`PageValidator.ts`)
   - **Responsibility:** Ensure the parser only runs on valid Amazon product pages.
   - **Logic:** Checks the URL for invalid paths (search, cart, category) and confirms the existence of key product DOM markers (like `#productTitle` or a Buy Box).

2. **FieldExtractors** (`FieldExtractors.ts`)
   - **Responsibility:** Extract raw strings and HTML data from the DOM.
   - **Selector Strategy:** Never rely on a single selector. Each field must have multiple fallback selectors.
   - **Examples:** Checking `#productTitle`, then `#title`, then `h1.a-size-large`.

3. **DataNormalizer** (`DataNormalizer.ts`)
   - **Responsibility:** Clean, cast, and format extracted strings into consistent data types.
   - **Logic:** Removes currency symbols, strips out whitespace, and parses floats/integers safely.

4. **ProductBuilder** (`ProductBuilder.ts`)
   - **Responsibility:** Orchestrate the field extraction and normalization, returning a structured `Partial<ProductPayload>`.
   - **Monitoring:** Logs the duration of field extraction and records any non-critical extraction warnings.

5. **ProductValidator** (`ProductValidator.ts`)
   - **Responsibility:** Apply business logic validation on the final product object.
   - **Logic:** Instead of throwing exceptions, it returns structured validation results (`errors` and `warnings`) to be displayed in the popup.

## Best Practices
- Add new selectors to the beginning of the fallback arrays in `FieldExtractors.ts` when Amazon rolls out UI updates.
- Keep `DataNormalizer` purely functional for easy unit testing.

## Parser Contract
The following is the expected contract of the parsed data. It dictates which fields are strict requirements vs. which can gracefully degrade.

### Required Fields
If any of these fields are missing, the extraction fails completely (`result.errors` will contain the reason):
- `title` (or `name`): Product Title
- `asin`: 10-character Amazon Standard Identification Number
- `productUrl`: Clean URL to the product

### Optional Fields (Graceful Degradation)
If these fields are missing, they will be given safe default values (e.g., 0, empty string, empty array). A warning is added to `result.warnings` for debugging, but the extraction still succeeds:
- `currentPrice` (Default: 0)
- `originalPrice` (Default: same as `currentPrice`)
- `discount` (Default: 0)
- `currency` (Default: 'USD')
- `rating` (Default: 0)
- `reviewCount` (Default: 0)
- `availability` (Default: true)
- `brand` (Default: 'Unknown Brand')
- `description` (Default: '')
- `bulletFeatures` (Default: [])
- `specifications` (Default: {})
- `images` (Default: [] - although ideally we'd want at least one image)

## Telemetry
In development, the parser calculates an `extractionSuccessRate` percentage. This tracks how many of the fields were successfully found on the page vs how many had to fallback to defaults. Failed fields are listed in `failedFields`.

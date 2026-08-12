# 🗺️ GadgetsProHub: Comprehensive System & Architecture Blueprint

Welcome to the **GadgetsProHub** Master System Architecture and Engineering Blueprint. This document details the end-to-end design, file formats, databases, security hardeners, real-time sync systems, API surfaces, and Chrome extension architectures that power our high-performance full-stack affiliate marketing and e-commerce content automation platform.

---

## 📂 System & Directory Directory Structure

The platform is designed as a modular, full-stack application.

```
/
├── server.ts                               # Unified Express entry point, middleware, and API router
├── seeddata.ts                             # Structured pre-populated bootstrap datasets for categories/products
├── package.json                            # Unified runtime dependencies and deployment scripts
├── .env.example                            # Schema of all required environment variables and keys
├── PROJECT_ARCHITECTURE.md                 # [This File] Ultimate architectural and logic documentation
├── src/                                    # Front-End React + Vite Client Application
│   ├── main.tsx                            # Client entry point
│   ├── App.tsx                             # Master client container and page-router configuration
│   ├── types.ts                            # Strict global TypeScript interface registry
│   ├── firebase.ts                         # Client-side Firebase/Auth configuration loader
│   ├── components/                         # Visually-polished design components
│   │   ├── GlareHover.tsx                  # Realistic lens/reflection hovering effects
│   │   ├── BorderGlow.tsx                  # Elegant moving borders on interactions
│   │   ├── AdSenseBanner.tsx               # Native Google AdSense integration containers
│   │   └── MediaLibrary.tsx                # Centralized asset uploads manager
│   └── pages/                              # Primary container views
│       ├── Home.tsx                        # Main portal with interactive feeds and telemetry widgets
│       ├── ProductDetail.tsx               # Analytics, comparison grids, and price tracking history
│       └── Admin/                          # Restricted administrative control consoles (AI/SEO/Sync)
└── extension/                              # Universal "Curator Companion" Chrome WebExtension
    ├── manifest.json                       # WebExtension Manifest V3 (Dynamic host wildcards)
    ├── vite.config.ts                      # Bundling and compilation instructions for extension bundle
    └── src/
        ├── background/                     # Background service workers, router, and queue managers
        ├── content/                        # DOM Scraping algorithms and data validators
        ├── popup/                          # Visual extension dashboard popup
        └── services/                       # Storage obfuscation, logger, and API clients
```

---

## 🗄️ Database Schema & Architecture

The application supports a dual-mode database architecture, utilizing **MongoDB Atlas** for primary persistent storage with seamless local in-memory/file-system fallback when MongoDB is unavailable.

### 📦 Key Data Models

1. **User Schema (`User`)**
   - Holds account records. Fields: `email` (unique, lowercase), `name`, `password` (cryptographically salted), `googleId`, `role` (`'user' | 'admin'`), `wishlist` (refs `Product`), and `recentlyViewed` (historical navigation logs).

2. **Product Schema (`Product`)**
   - High-fidelity product listings. Fields: `name`, `brand`, `description`, `price`, `originalPrice`, `discount`, `currency`, `images` (array), `rating`, `totalReviews`, `category` (ref `Category`), `inStock`, `affiliateLink`, `affiliateCode`, `asin` (unique lookup key), `specifications`, `features`.

3. **Category Schema (`Category`)**
   - Classification system. Fields: `name`, `slug` (unique), `description`, `icon`, `clicks`, `conversions`.

4. **Order Schema (`Order`)**
   - Purchases. Fields: `userId` (ref `User`), `items` (array of product refs and quantities), `totalAmount`, `status` (`'PENDING' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled'`), `trackingNumber` (default `'PENDING'`), `carrier` (default `'Awaiting Carrier Assignment'`), `estimatedDelivery`, `createdAt`.

5. **Analytics Schema (`Analytics`)**
   - Telemetry. Fields: `productId` (ref `Product`), `clicks`, `conversions`, `revenue`, `timestamp`.

6. **PriceHistory Schema (`PriceHistory`)**
   - Historical records. Fields: `productId` (ref `Product`), `price`, `timestamp`.

7. **ProductChange Schema (`ProductChange`)**
   - Tracking edits. Fields: `productId` (ref `Product`), `field` (e.g., `'price'`), `oldValue`, `newValue`, `timestamp`.

8. **AlertRule Schema (`AlertRule`)**
   - Triggers for monitoring. Fields: `name`, `productId` (ref `Product`), `triggerType` (`'price_drop_pct' | 'out_of_stock' | 'back_in_stock'`), `triggerThreshold`, `active`, `createdAt`.

---

## ⚙️ Core System Logics & Automation Engines

### 1. Sunday Automation & Weekly Summary Engine (`runSundayAutomation`)
The backend features an automatic background cron-like coordinator running every Sunday:
- **Automation Cycles**: Evaluates elapsed intervals since the last execution. If $\ge 7$ days, compiles performance reports and commits logs.
- **Auto-Seeding**: Checks category densities. If any category contains no products, the engine uses `generateUniqueProduct` to populate authentic seed placeholders, protecting visual integrity.
- **BSON Error Prevention**: Filters all mapped IDs using `mongoose.Types.ObjectId.isValid(id)` before instantiation. This completely stops system crashes from corrupted string parsing or invalid hex lengths during bulk indexing.

### 2. High-Availability Boot & Dual-Mode Local Resilience
- **Dual-Mode Architecture**: The application starts asynchronously with instant HTTP port availability. In environments where MongoDB Atlas is unavailable or delayed, the server seamlessly utilizes in-memory local state collections (`localOrders`, `localProducts`, `localUsers`) backed by file-system persistence.
- **Non-Blocking Connection Retry**: `connectWithRetry()` handles MongoDB connection attempts asynchronously in the background. If Atlas is unreachable after repeated exponential backoffs, connection state transitions cleanly while local fallback stores keep the API operational.
- **Administrative Offline Block**: The database toggle command `/api/admin/db-toggle` protects database mode transitions, ensuring that sessions, catalog data, and analytics remain consistent.

---

## 🔐 Advanced Security Controls

### 1. Affiliate Link Processing & Profile Enforcing
To eliminate link ambiguity and ensure commission attribution:
- **Enforced Tracking Injection**: Product import routes parse incoming URLs and apply the platform's active site tag (`AMAZON_AFFILIATE_TAG` or configured provider profile) to guarantee valid commission tracking.
- **Restricted Access**: Administrative import endpoints are strictly guarded by `adminOnly` middleware requiring authenticated admin JWT credentials.

### 2. Chrome Extension Storage Obfuscation
To protect administrative credentials and JWTs stored on the user's disk from extraction or standard signature scans:
- **Reversed Base64 Cipher**: Inside the extension's `StorageService`, the `authToken` is run through a custom reversal-and-base64 obfuscator before hitting `chrome.storage.session` or `localStorage`.
- **Restricted Storage Bus**: The messaging router `routeMessage` strictly limits read/write storage command actions (`STORAGE_WRITE`/`STORAGE_READ`) to a pre-defined set of safe public keys (e.g. `lastImportedAsin`), completely blocking any remote calls to fetch `gph_settings` or auth configurations.

### 3. Decoupled AI Key Management
- **Stable Key Derivation**: AI Service configuration keys are encrypted at rest using `AI_KEY_ENCRYPTION_SECRET` (defined securely in `.env.example`).
- **Rotation Isolation**: The `JWT_SECRET` fallback has been completely removed. This guarantees that rotating the web-session `JWT_SECRET` will **never** brick or corrupt stored third-party AI keys in the database.

### 4. Direct Authentic Standalone Login
- **Bypass Removal**: Removed the mock hardcoded developer login bypasses (`admin@gadgetsprohub.com`) inside `/extension/src/popup/Popup.tsx`.
- **Standalone Live Proxy**: If the extension is opened in a standalone web tab (where `chrome.runtime` is missing), the popup directly performs authentic API fetches against the live backend `/api/auth/login` to obtain and verify JWT signatures.

### 5. Honest Order Tracking
- **Pending Carrier State**: Newly placed customer orders in `server.ts` are initialized with an honest status of `'PENDING'` tracking number and `'Awaiting Carrier Assignment'` carrier, instead of generating simulated fake courier tracking IDs.

---

## 📡 Core API Reference Registry

### 🔐 Authentication Context
- `POST /api/auth/register`: Salts and registers a standard customer account.
- `POST /api/auth/login`: Verifies passwords and registers an `HS256` signed JWT cookie.
- `POST /api/auth/logout`: Blacklists tokens using a TTL MongoDB collection.
- `GET /api/auth/me`: Decodes active cookies and returns user metadata.
- `POST /api/auth/pair`: Generates an automated 6-digit PIN handshake allowing secure extension pairing.

### 🛒 Inventory & Imports
- `GET /api/products`: Cursor-paginated query interface supporting full-text search.
- `POST /api/admin/products/import`: Handles bulk product ingestion from the companion scraper.
- `DELETE /api/admin/products/:id`: Cascades deletes on related analytics and wishlists, blocking deletes on products tied to active Orders to enforce referential integrity.
- `DELETE /api/admin/categories/:id`: Rejects category deletion if referenced by any active product.

### 🤖 AI Content Intelligence
- `POST /api/admin/generate-content`: Server-side connection proxying the modern `@google/genai` SDK. Outputs blog posts and spec summaries as real-time Server-Sent Events (SSE) streams.

---

## 🔌 Integrated Automation Pipelines

### 1. n8n Scraping Webhooks
- **Scheduled Checks**: Scans inventory for outdated prices and inventory changes.
- **Deduplicated Queue Pipeline**: Deduplicates product URLs during extraction jobs to avoid redundant requests to merchant sites.

### 2. Telegram Bot Interface (`/api/webhooks/telegram`)
- **Conversational Admin**: Provides `/start` and `/cancel` commands for a guided, step-by-step product creation conversation over chat.

---

This blueprint details the production-ready state of GadgetsProHub. By prioritizing structural security, strict referential integrity, and complete transparency of user metrics, the system scales securely and effectively.

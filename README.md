# GadgetsProHub: Full-Stack E-Commerce Affiliate & Content Automation Platform

Welcome to the **GadgetsProHub** master documentation. This repository contains a fully-integrated, production-ready full-stack affiliate ecosystem comprising a high-performance **React Web Frontend (Vite)**, a robust **Express API Server (TypeScript/Node.js)**, a resilient offline-first **Database Layer (MongoDB/Mongoose + Local JSON-File Fallbacks)**, and an intelligent **Chrome Scraping Extension** for bulk automated product imports.

---

## 🗺️ System & Directory Architecture

The repository is divided into two primary contexts: the **Core Web Application (Server & Web Client)** and the **Chrome Extension**.

### 1. Root Directory & Server Core (`/`)
- `server.ts`: The unified entry point. It manages Express server instances, registers production-grade middleware (Helmet, CORS with origin strict-matching, Express Rate Limiter, Mongo-Sanitizer), initializes connections to MongoDB (via Mongoose), registers the Sunday Automation Engine, and manages the Express Router.
- `package.json`: Configures execution scripts (`npm run dev` via `tsx`, `npm run build` using Rollup/Vite/Esbuild bundles, `npm run start` running on `dist/server.cjs`).
- `local_products.json`, `local_users.json`, `local_sunday_logs.json`: Active JSON storage buffers. These serve as the high-availability local storage layer when the remote MongoDB cluster is disconnected.
- `seeddata.ts`: Pre-populated bootstrap data representing categories, sample products, and blogs.
- `zip-extension.js`: Bundling script that automatically compiles and zips the Chrome Extension during the root build cycle.

### 2. React Web Client (`/src/`)
- `src/main.tsx` & `src/App.tsx`: Applet mounting context and layout router.
- `src/types.ts`: Master TypeScript interface registry containing strict schemas for `Product`, `Category`, `Blog`, `User`, `Review`, `SundayLog`, and `Session`.
- `src/firebase.ts`: Authentication and client-side configuration loaders.
- `src/pages/`: Page containers including `Home` (Interactive feed & analytics), `ProductList`, `ProductDetail` (specs & price trackers), `Blog`, `BlogDetail`, `Admin` (Security/AI/SEO/Sync Consoles), and core legal compliance structures (`Disclaimer`, `PrivacyPolicy`, `TermsConditions`).
- `src/components/`: Modular, high-end components including:
  - `GlareHover.tsx` & `BorderGlow.tsx`: Premium card hovering reflections and interaction elements.
  - `AdSenseBanner.tsx`: Configurable AdSense container for platform monetization.
  - `LazySection.tsx`: Low-overhead viewport intersection loaders.
  - `MediaLibrary.tsx`: Centralized asset uploads manager.
  - `RecentViewedMarquee.tsx`: Dynamic looping marquee tracking user navigation history.

### 3. Chrome Scraping Extension (`/extension/`)
- `extension/manifest.json`: WebExtension Manifest V3. Configures content script injections on Amazon and allied sites, and registers background service workers.
- `extension/src/content/`:
  - `parser/FieldExtractors.ts`: Highly precise DOM scraper targeting item titles, image galleries, ratings, stock statuses, and raw tabular specifications.
  - `parser/DataNormalizer.ts`: Standardizes scraped currencies, strips extraneous whitespace, and shapes properties.
  - `parser/PageValidator.ts`: Detects page contexts and guards against firing parsers on non-product pages.
- `extension/src/popup/`: A lightweight React popup prompting admins to log in or pair using high-entropy code exchanges.
- `extension/src/background/`: Manages cross-script messaging routers, keeps proxy authentications alive, and manages storage synchronization.

---

## 🛠️ Key Architectural Features & Logics

### 1. High-Availability Offline-First Fallback
The backend implements a dual-mode database strategy via the `isMongoConnected` control flag:
- **Online Mode:** Performs ACID transactions, aggregates, and schemas via a remote MongoDB cluster.
- **Offline Fallback:** Automatically switches read/write operations to the secure, disk-persisted local JSON stores (`local_products.json`, `local_users.json`, `local_sunday_logs.json`). If MongoDB goes offline or is unprovisioned, the server remains fully operational, reading and writing to disk seamlessly. Once MongoDB reconnects, write methods dynamically sync or fallback as required.

### 2. Sunday Automation & Weekly Summary Engine (`runSundayAutomation`)
The platform includes an automated cron-like task executor designed to run every Sunday (and checking/running on startup if a week has elapsed):
- **Weekly Progress Logging:** Logs automated product additions and generates performance reports.
- **Unique Mock Product Generation:** Uses `generateUniqueProduct` to populate dummy sample items for category filling, preventing blank layouts.
- **Mongoose ObjectId Validation Protection:** When logging the automation outputs, IDs are rigorously sanitized. The array of product IDs is pre-filtered via `mongoose.Types.ObjectId.isValid(id)` before being mapped via `new mongoose.Types.ObjectId(id)`. This explicitly prevents the server from crashing or throwing `BSONError` runtime exceptions when invalid hex strings enter the database pipeline in either fallback or live states.

### 3. Crypto-Secure Authentication & Session Guards
- **Algorithm Pinning:** Pinning JWT validation explicitly to the `HS256` symmetric algorithm to guard against signature-bypass attacks (e.g., `alg: "none"` spoofing).
- **Auto-Generating High-Entropy Secrets:** If no `JWT_SECRET` exists in the environmental variables, the server dynamically generates a 64-byte high-entropy fallback secret on boot, keeping session signatures safe.
- **CSRF & Cookie Hardening:** Session cookies enforce `httpOnly: true`, `secure: true`, and `sameSite: "strict"`.
- **Global `wrapAsync` Middleware:** Seamlessly catches synchronous and asynchronous handler errors, piping them to the global Express error responder, which prevents stack traces from leaking database structures or internal directories.

---

## 📡 API Endpoints Reference

### 🔐 Authentication Endpoints
- **`POST /api/auth/register`**: Validates parameters and registers a new local user. Passes passwords through secure hashes with salt hooks.
- **`POST /api/auth/login`**: Validates email/password and returns a signed HS256 JWT, binding secure session cookies.
- **`POST /api/auth/logout`**: Adds the active token to a MongoDB TTL index collection (`BlacklistedToken`) to immediately invalidate the session.
- **`GET /api/auth/me`**: Decodes and returns the caller's session details (e.g. email, role) with sensitive fields safely stripped.
- **`POST /api/auth/exchange-code`**: Exchanges a temporary 6-digit numeric PIN for a valid Chrome Extension session JWT (used during extension pairing).

### 🛒 Product & Category Endpoints
- **`GET /api/products`**: Supports cursor pagination, full-text search, and multi-category slug filters.
- **`GET /api/products/:id`**: Retrieves detailed specifications, prices, and nested customer reviews for a given product ID.
- **`POST /api/products`**: (Admin Only) Creates a product entry.
- **`PUT /api/products/:id`**: (Admin Only) Updates structural fields or changes active pricing metrics.
- **`DELETE /api/products/:id`**: (Admin Only) Removes the target item.
- **`GET /api/categories`**: Lists all active product classification groups.

### 🤖 AI Content Intelligence & Bulk Tools (Gemini SDK)
- **`POST /api/admin/generate-content`**: Connects server-side to the modern `@google/genai` SDK to dynamically draft blog posts, summarize specification tables, or write customer reviews using customizable system templates. Utilizes a Server-Sent Events (SSE) stream for real-time text output.
- **`POST /api/admin/import-csv`**: Performs bulk database updates from raw CSV streams.
- **`GET /api/diagnostic/products`**: A diagnostic endpoint displaying schema shapes and fallback configurations.

### 📬 User Enquiries & Automation Hooks
- **`POST /api/contact`**: Validates input schema constraints and files customer enquiries.
- **`POST /api/newsletter/subscribe`**: Adds target emails to the subscriber database.
- **`POST /api/webhooks/telegram`**: Receives webhooks from the integrated Telegram Bot for performing product management tasks conversations.

---

## 🔌 Integrated Services & Automations

### 1. n8n Real-Time Automation Workflows
Provides real-time product price scraping pipelines:
- **Background Checks:** Runs every 10 minutes to scan for products with prices older than 12 hours.
- **Real-Time Locks:** Employs a dedicated `RequestLock` MongoDB schema with a TTL index to enforce mutual exclusion, preventing concurrent duplicate scraping requests on the same product and protecting affiliate sites from request flooding.

### 2. Telegram CRUD Bot
A conversational bot mapped via `/api/webhooks/telegram` that enables admins to manage inventory on the go:
- `/start`: Mounts bot context and checks admin authorization.
- `/add [name] | [link] | [price]`: Instantly saves a new affiliate item.
- `/list`: Displays pagination summaries of the latest products.
- `/price [productId] [newPrice]`: Remotely updates database item costs.
- `/delete [productId]`: Removes items from catalog systems.

### 3. Google AdSense & SEO Optimization
- **Dynamic Headers:** `Helmet.tsx` manages viewport canonicals, automated schema-markup injection (JSON-LD), and sitemap registrations.
- **AdSense Container:** Easily enabled via `AdSenseBanner.tsx` with customized layout layouts for responsive horizontal, vertical, or multiplex formats.

---

## 🚀 Building & Launching the Application

### 1. Environment Configurations
Create a `.env` file at the root of your project using the keys defined in `.env.example`:
```env
MONGODB_URI=your_mongodb_connection_uri
JWT_SECRET=your_secure_hs256_secret
GEMINI_API_KEY=your_google_ai_studio_api_key
ADMIN_EMAILS=admin@gadgetsprohub.com
```

### 2. Standard Commands
- **Install Dependencies:** `npm install` (and `npm install` in `/extension`).
- **Run Local Development Server:** `npm run dev`
- **Compile & Package Assets:** `npm run build`
  *(Compiles React assets, packages the Chrome Extension, bundles the Express server via esbuild into CJS, and creates `/extension.zip`)*.
- **Start Production Build:** `npm run start`

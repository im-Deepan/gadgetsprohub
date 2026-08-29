# GadgetsProHub: Full-Stack E-Commerce Affiliate & Content Automation Platform

[![CI & Quality Assurance](https://github.com/deepan20060609/gadgetsprohub/actions/workflows/ci.yml/badge.svg)](https://github.com/deepan20060609/gadgetsprohub/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node: v20 | v22](https://img.shields.io/badge/Node.js-v20%20%7C%20v22-green.svg)](https://nodejs.org)
[![Security: AES-256-GCM](https://img.shields.io/badge/Security-AES--256--GCM-blue.svg)](SECURITY.md)

Welcome to the **GadgetsProHub** master documentation. This repository contains an integrated, production-grade affiliate ecosystem comprising a high-performance **React Web Frontend (Vite & Tailwind CSS)**, a robust **Express API Server (TypeScript/Node.js)**, a resilient offline-first **Database Layer (MongoDB/Mongoose + Atomic Local JSON-File Fallbacks)**, and an intelligent **Chrome Scraping Extension (Manifest V3)** for automated product imports.

---

## 👨‍💻 Maintainers & Contributor Info

- **Project Lead & Author**: Deepan ([deepan20060609@gmail.com](mailto:deepan20060609@gmail.com))
- **Contribution Guide**: See [CONTRIBUTING.md](CONTRIBUTING.md)
- **Security & Vulnerability Reporting**: See [SECURITY.md](SECURITY.md)

---

## 🗺️ System & Directory Architecture

The repository is organized into distinct, modular functional layers:

### 1. Root Directory & Backend Core (`/`)
- `server.ts`: The unified server entry point. Manages Express instances, registers production-grade middleware (Helmet, CORS with origin strict-matching, Express Rate Limiter, Mongo-Sanitizer), connects to MongoDB (via Mongoose), registers the Sunday Automation Engine, and provides RESTful APIs.
- `src/services/`: High-performance services:
  - `MediaService.ts`: Secure image optimization, SSRF private IP validation, multi-format transcoding (`webp`, `avif`) via `sharp`.
  - `AiService.ts`: Multi-provider AI content generation (Google Gemini, OpenAI, Claude, OpenRouter) with authenticated encrypted API key storage.
  - `CacheService.ts`: In-memory LRU cache for accelerated reads.
- `src/utils/`:
  - `encryption.ts`: Authenticated **AES-256-GCM** encryption and decryption utilities.
- `src/__tests__/`: Automated unit and integration test suites:
  - `adminEndpoints.test.ts`: JWT HS256 enforcement, alg:none defense, pairing handshake PIN lifecycle.
  - `encryption.test.ts`: Authenticated encryption, semantic security, tampering detection.
  - `dbFallback.test.ts`: High-concurrency atomic persistence and graceful offline resilience.
  - `parser.test.ts`: Price normalizer, ASIN extraction, and strict Zod validation.

### 2. React Web Client (`/src/`)
- `src/main.tsx` & `src/App.tsx`: Applet mounting context and layout router.
- `src/types.ts`: TypeScript interface registry containing schemas for `Product`, `Category`, `Blog`, `User`, `Review`, and `SundayLog`.
- `src/pages/`: Interactive views including `Home` (feed & analytics), `ProductList`, `ProductDetail` (specs & price tracking), `Blog`, `Admin` (Security/AI/SEO Consoles), and legal compliance pages (`Disclaimer`, `PrivacyPolicy`, `TermsConditions`).

### 3. Chrome Scraping Extension (`/extension/`)
- `extension/manifest.json`: WebExtension Manifest V3 with minimal host permissions (`*.amazon.*`).
- `extension/src/content/`: DOM scrapers, data normalizers, and schema validators for Amazon product pages.
- `extension/src/background/`: Privilege-checked inter-script messaging router, alarms, and API synchronization.
- `extension/src/popup/`: React + Tailwind popup coordinating user sessions, PIN exchanges, and bulk import queues.
- `extension/src/**/__tests__/`: Jest test suite verifying content parsing and background messaging security boundaries.

---

## 🔐 Advanced Security & Cryptographic Controls

### 1. Zero-Disk Ephemeral Storage in Extension
- **Memory-Only Session Storage**: Sensitive authentication tokens (`authToken`, `sessionToken`) in the Chrome extension are stored exclusively in `chrome.storage.session`. No tokens are written to unencrypted persistent local disk storage.
- **5-Minute One-Time Pairing PIN**: Extension pairing uses a single-use 6-digit numeric PIN with strict brute-force rate-limiting (max 5 attempts per 10 minutes) generated via `/api/admin/products/import/pairing-code`. The PIN is atomically destroyed upon initial verification.

### 2. Authenticated Encryption at Rest (AES-256-GCM)
- Third-party AI provider credentials and sensitive keys are encrypted at rest using **AES-256-GCM** (`src/utils/encryption.ts`) with unique 96-bit IVs and 128-bit authentication tags.
- Rotation of session `JWT_SECRET` does not affect stored encrypted AI keys due to decoupled key derivation via `AI_KEY_ENCRYPTION_SECRET`.

### 3. JWT Algorithm Enforcement
- Strict `HS256` verification blocks unsigned `alg: "none"` bypass attempts and algorithm substitution attacks.

---

## 🚀 Deployment Targets & Strategy

### 1. Full-Stack Production Target (Recommended)
- **Target Platform**: Node.js Container, Google Cloud Run, Render, AWS ECS, or DigitalOcean App Platform.
- **Why**: Hosts the full Express API server, MongoDB connection, native Sharp image pipelines, background Sunday automations, and Telegram webhook integration.
- **Production Start Command**: `npm run start` (serves `dist/server.cjs` which includes built Vite static assets).

### 2. Static & Serverless Hosting (Vercel & Netlify)
- `vercel.json` and `netlify.toml` are configured with matching Content Security Policies (CSP), security headers, and rewrite routes for static frontend distribution or proxy configurations.

---

## 📦 Package Manager & Lockfile Standard

- **Standard Package Manager**: This repository strictly standardizes on `npm` with `package-lock.json`.
- Do NOT commit secondary lockfiles (e.g., `bun.lock`, `yarn.lock`).
- Continuous Integration (`.github/workflows/ci.yml`) runs `npm ci` to guarantee deterministic builds.

---

## 🖼️ Native Modules (`sharp`) & Build Environment

- The platform utilizes `sharp` for high-speed image resizing, metadata inspection, and WebP/AVIF compression.
- **Supported Runtimes**: Linux (x64, arm64), macOS, and Windows. Prebuilt native bindings are resolved automatically during `npm ci`.
- **Fault-Tolerant Fallback**: In constrained or serverless environments where native bindings are unavailable, `MediaService.ts` catches initialization errors gracefully and passes through raw image buffers without interrupting application execution.

---

## 🧪 Quality Assurance & Test Suites

The project maintains 100% passing automated test suites across both the server backend and the Chrome extension:

```bash
# Run root unit & integration tests
npm test

# Run Chrome extension automated test suite
npm run test:extension

# Run entire end-to-end test suite
npm run test:all

# Run TypeScript typechecks
npm run lint

# Run high-severity security vulnerability audit
npm run audit

# Build complete production bundle & extension zip
npm run build
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and configure your environment:

```env
# Server & Database Configuration
PORT=3000
MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/gadgetsprohub?retryWrites=true&w=majority"
JWT_SECRET="your-secure-64-byte-hs256-secret-key"

# AI Key Encryption Secret (Dedicated for encrypting third-party API keys at rest)
AI_KEY_ENCRYPTION_SECRET="your-cryptographically-secure-ai-key-encryption-secret"

# Third-Party AI Services (Optional)
GEMINI_API_KEY=""

# Affiliate Tracking Configuration
AMAZON_AFFILIATE_TAG="gadgetsprohub-20"
ADMIN_EMAILS="admin@gadgetsprohub.com"
```

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).

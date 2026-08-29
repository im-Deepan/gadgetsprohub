# Contributing to GadgetsProHub

Thank you for your interest in contributing to **GadgetsProHub**! We welcome code contributions, bug reports, feature requests, and documentation improvements.

---

## 🛠️ Development Environment & Tooling

### Package Manager Standard
- **Standard Package Manager**: This repository strictly standardizes on `npm` (`npm ci`, `package-lock.json`).
- Do not commit other lockfiles (such as `bun.lock` or `yarn.lock`).

### Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **npm**: `v10.x`+
- **MongoDB**: Local instance or MongoDB Atlas cluster URI (optional, falls back gracefully to atomic local persistence)

---

## 🚀 Getting Started

1. **Clone the Repository & Install Dependencies**:
   ```bash
   git clone https://github.com/deepan20060609/gadgetsprohub.git
   cd gadgetsprohub
   npm ci
   cd extension && npm ci --legacy-peer-deps && cd ..
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in any necessary secrets:
   ```bash
   cp .env.example .env
   ```

3. **Start Local Development**:
   ```bash
   npm run dev
   ```
   The backend API and Vite client will be available on `http://localhost:3000`.

---

## 🧪 Testing & Quality Assurance

All contributions must pass the automated test suites and typechecks before submitting a pull request:

```bash
# Run root unit & integration tests
npm test

# Run Chrome extension test suite
npm run test:extension

# Run full project test suite
npm run test:all

# Verify TypeScript types and linting
npm run lint
cd extension && npx tsc --noEmit && cd ..

# Verify production build compilation
npm run build
```

---

## 📂 Project Structure

```
├── .github/workflows/    # CI/CD pipelines and Dependabot configurations
├── extension/            # Manifest V3 Chrome Extension (React + TS + Tailwind)
│   ├── src/background/   # Service worker, router, and action handlers
│   ├── src/content/      # DOM parsers, extractors, and content scripts
│   └── src/popup/        # User interface & management popup
├── src/                  # Core frontend React components & backend services
│   ├── services/         # MediaService, AiService, Cache, Database
│   ├── utils/            # Cryptographic & encryption utilities
│   └── __tests__/        # Automated unit and integration test suites
├── server.ts             # Express server entry point, API routes, middleware
└── PROJECT_ARCHITECTURE.md # Architectural specifications and security controls
```

---

## 🤝 Code Style & Guidelines

- **TypeScript**: Strict type definitions, avoid `any` where possible.
- **Security-First**: Never log secrets or persist unencrypted sensitive tokens.
- **Atomic Operations**: Ensure file-system operations are atomic and resilient.
- **Commit Messages**: Follow standard conventional commit formats (e.g. `feat: add price alert notifier`, `fix(extension): normalize asin extraction`).

---

## 📬 Contact & Maintainers

- **Project Lead**: Deepan (`deepan20060609@gmail.com`)

# GadgetsProHub Chrome Extension (Manifest V3)

This is a production-ready Chrome Extension (Manifest V3) integrated with the **GadgetsProHub** Affiliate Store backend.

## Architecture & Responsibilities

1. **Popup (UI Context)**: Located in `src/popup/`. Handled by React + Tailwind. No direct scraping or database access. Coordinates user actions, settings, bulk queue operations, import history, and analytics.
2. **Content Script**: Located in `src/content/index.ts`. Injected strictly on authorized Amazon product pages. Responsible ONLY for reading the DOM, extracting product metadata, running schema validation, and communicating structured payloads back to the background worker.
3. **Background Service Worker**: Located in `src/background/index.ts` and `src/background/router.ts`. Coordinates privilege-checked inter-script messaging, queue management, alarms, and calls the secure backend API.
4. **Storage & Auth Design**:
   - **Zero Secret Storage**: No passwords, long-lived API keys, or secrets are ever persisted to disk storage (`chrome.storage.local`).
   - **Ephemeral Session Tokens**: Authentication uses short-lived tokens stored exclusively in in-memory session storage (`chrome.storage.session`), automatically discarded on browser close or logout without relying on ad-hoc obfuscation hacks.
   - **6-Digit One-Time Pairing Handshake**: Administrators generate a 5-minute single-use PIN code on the portal (`/api/admin/products/import/pairing-code`). The extension exchanges this PIN at `/api/auth/pair` (protected by brute-force rate-limiting of max 5 requests per 10 minutes) for a 12-hour scoped ephemeral token. The PIN record is atomically consumed upon exchange.

## Permissions & Security Boundaries

- **Manifest Permissions**: Requests strictly the minimum necessary APIs: `activeTab`, `storage`, `tabs`, `notifications`, and `alarms`.
- **Scoped Host Permissions**: Restricts match patterns strictly to supported Amazon store domains (`*.amazon.com`, `*.amazon.in`, `*.amazon.co.uk`, `*.amazon.ca`) and the authorized backend API origins.
- **Message Origin & Privilege Verification**: Background router enforces that privileged administrative actions (`SET_SESSION_TOKEN`, `STORAGE_WRITE`, `EXECUTE_LOGIN`, `BULK_IMPORT_*`) can only be invoked by internal extension contexts, rejecting untrusted tab origins.

## Testing & Build Pipeline

1. **Automated Test Suite**:
   ```bash
   cd extension
   npm test
   ```
   Runs Jest with `ts-jest` and `jsdom` testing:
   - Content script DOM field extractors, normalizers, and Amazon product parser edge cases
   - Background router messaging, privilege boundaries, and unauthorized action rejection
   - API client integration, authentication state transitions, and session invalidation

2. **Building for Production**:
   ```bash
   cd extension
   npm run build
   ```

3. **Loading into Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top-right)
   - Click **Load unpacked** and choose the `extension/dist` folder

## File Map

- `manifest.json`: Manifest V3 configuration with minimum permissions and scoped host patterns.
- `jest.config.cjs`: Jest and `ts-jest` configuration for automated unit and integration tests.
- `vite.config.ts`: Multi-target bundler configuration producing background, content, and popup bundles.
- `src/background/router.ts`: Privilege-aware background message router.
- `src/background/queueManager.ts`: Concurrent bulk import manager with alarm heartbeats.
- `src/content/parser/`: Robust DOM extraction modules (`FieldExtractors`, `AmazonParser`, `ProductValidator`, `DataNormalizer`).
- `src/services/storage.ts`: Secure storage adapter enforcing memory-only session token handling.
- `src/services/api.ts`: Resilient API client with correlation tracking and auth renewal.
- `src/popup/Popup.tsx`: Extension interface with Live Importer, Bulk Queue, History, and Analytics.

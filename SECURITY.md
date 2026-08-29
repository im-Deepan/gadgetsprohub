# Security Policy

The **GadgetsProHub** team takes application security, data integrity, and user privacy seriously. This document outlines our security policies, cryptographic standards, and vulnerability reporting procedures.

---

## 🛡️ Supported Versions

We provide security updates and patches for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## 🔐 Cryptographic & Security Architecture

### 1. Authenticated Encryption at Rest (AES-256-GCM)
- All persisted third-party API tokens, credentials, and sensitive configurations are encrypted using authenticated **AES-256-GCM** (Galois/Counter Mode) via `src/utils/encryption.ts`.
- Every encrypted payload includes a cryptographically random 96-bit Initialization Vector (IV) and a 128-bit authentication tag, guaranteeing semantic security and preventing ciphertext tampering.

### 2. Token Security & Authentication Boundaries
- **Algorithm Enforcement**: All JWT verification strictly enforces `HS256`. Unsigned tokens, `alg:none` bypass attempts, and algorithm substitution attacks are strictly blocked.
- **Chrome Extension Zero-Disk Storage**: Authentication tokens (`authToken`, `sessionToken`) in the companion extension are stored exclusively in in-memory session storage (`chrome.storage.session`). No credentials or tokens are ever written to unencrypted persistent disk storage (`chrome.storage.local`).
- **One-Time Pairing Handshake**: Extension pairing utilizes a single-use 6-digit PIN with a 5-minute time-to-live and strict brute-force rate-limiting (max 5 attempts per 10 minutes). The PIN is atomically destroyed upon initial verification.

### 3. Native Dependencies & Image Processing (Sharp)
- Image optimization pipelines in `MediaService.ts` utilize prebuilt native `sharp` binaries with input buffer validation, dimension constraints (max 4096px), and internal timeout limits to prevent memory exhaustion (DoS) or decompression bombs.

### 4. Input Sanitization & SSRF Defense
- All URL imports and media fetches pass through strict private IP / link-local DNS resolution checks (`isIpPrivate`), blocking Server-Side Request Forgery (SSRF) attacks against internal networks or cloud metadata services.
- Database queries are sanitized against NoSQL injection using `express-mongo-sanitize`.

---

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability within GadgetsProHub, please report it privately:

1. **Email**: Send detailed information to `deepan20060609@gmail.com` with the subject `[SECURITY VULNERABILITY] GadgetsProHub`.
2. **Details to Include**:
   - Description of the vulnerability and attack vector
   - Step-by-step proof of concept (PoC) or reproduction steps
   - Potential impact
3. **Response Time**: We will acknowledge receipt of your report within 24–48 hours and provide a timeline for triage and remediation.

Please **do not** open public GitHub issues or public discussions for unpatched security vulnerabilities.

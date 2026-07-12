# Phase 9: AI Content Generation & Smart Content Intelligence Documentation

This document describes the design, implementation, backend APIs, and usage of the enterprise-grade AI Content Intelligence system developed in Phase 9.

---

## 1. AI Architecture Overview

The system features a **provider-agnostic abstraction layer** that decouples the application's copywriting, translation, and enrichment logic from specific AI service providers. This architecture guarantees future-proof integration of new large language models (LLMs) and supports automatic fallback policies.

```
       +-------------------------------------------------------+
       |                  Admin Dashboard UI                   |
       +-------------------------------------------------------+
                                   |
                                   v
       +-------------------------------------------------------+
       |               Express API Route Handlers              |
       +-------------------------------------------------------+
                                   |
                                   v
       +-------------------------------------------------------+
       |                  AI Service Hub                       |
       |  (Orchestration, Prompt Management, Caching, Queue)  |
       +-------------------------------------------------------+
            /             |                \             \
           v              v                 v             v
    +------------+  +------------+   +------------+  +-----------+
    | Gemini API |  | OpenAI API |   | Claude API |  | Local LLM |
    |  (@google/ |  |            |   |            |  |  Ollama   |
    |   genai)   |  |            |   |            |  | LM Studio |
    +------------+  +------------+   +------------+  +-----------+
```

### Core Architecture Components:
1. **AiService Abstraction (Hub)**: Resolves active provider configurations, manages secure API credentials decryption, coordinates template injections, handles streaming over Server-Sent Events (SSE), and evaluates the generated content against compliance guidelines.
2. **AI Queue System (Parallel Workers)**: Manages bulk content enrichment in background queues. Supports pause, resume, cancel, and automated retries.
3. **AI Caching Layer**: Multi-level cache with automatic invalidation keys to minimize token usage and API latency.
4. **Content Quality & Safety Audit Trail**: Scans all outputs for empty payloads, hallucinated specifications, thin content, duplicates, and compliance issues before offering them to admins for approval.

---

## 2. Supported Providers & Model Configurations

The engine natively supports the following providers with unified settings:

* **Google Gemini**: Uses the modern `@google/genai` TypeScript SDK (model default: `gemini-3.5-flash`).
* **OpenAI**: Compatible with `gpt-4o-mini` and other custom models.
* **Anthropic Claude**: Connects with Claude 3.5 Haiku and Sonnet APIs.
* **OpenRouter**: Accesses hundreds of open-source models (Llama, Mistral, Qwen) using the uniform OpenAI-compatible payload.
* **Ollama & LM Studio**: Local-hosted LLMs for zero-cost secure internal content generation.
* **Azure OpenAI**: Enterprise cloud model proxies.

---

## 3. Database Enhancements & Indexes

The following collections are registered inside the MongoDB database under `/src/services/AiService.ts`:

### Collections:
1. **AiPrompt**: Holds prompt templates, system instructions, parameter variables, and multi-version historical backups.
2. **AiProviderSetting**: Encrypts and persists credentials (using AES-256-CBC) and custom temperatures, max tokens, and timeout profiles.
3. **AiCache**: MD5-hashed prompt, provider, and model mappings for instant zero-token responses.
4. **AiJob**: Manages background asynchronous queue jobs, progress indicators, processed counts, and completion results.
5. **AiResponse**: Tracks generated content drafts, active approval workflows, readability score assessments, safety checks, and review history logs.
6. **AiAnalytics**: Telemetry logging requests, input/output tokens, response latencies, and estimated costs.

---

## 4. API Reference

All REST endpoints require authorization and are protected under `adminOnly` middleware.

### Content Generation
* **`POST /api/admin/ai/generate`**:
  * Body parameters: `productId`, `promptKey`, `customVars`, `stream` (boolean)
  * Returns: A streaming chunked text stream when `stream: true` (Server-Sent Events), or a direct `AiResponse` document.

* **`POST /api/admin/ai/rewrite`**:
  * Body parameters: `text`, `tone` (`friendly`, `professional`, `seo`, etc.)
  * Returns: `{ success: true, rewrittenText }`

* **`POST /api/admin/ai/translate`**:
  * Body parameters: `text`, `language`
  * Returns: `{ success: true, translatedText }`

### Configuration & Settings
* **`GET /api/admin/ai/providers`**: Retrieves all providers and masks API Keys.
* **`POST /api/admin/ai/providers`**: Saves or updates key credentials and temperature parameters.

### Prompt Management
* **`GET /api/admin/ai/prompts`**: Lists all active templates.
* **`POST /api/admin/ai/prompts`**: Upserts a prompt and automatically increments its version.
* **`POST /api/admin/ai/prompts/rollback`**: Rolls back a prompt to a historical version.

### Queue Management
* **`GET /api/admin/ai/queue`**: Retrieves recent background jobs.
* **`POST /api/admin/ai/queue/batch-enrich`**: Spawns a bulk job.
* **`POST /api/admin/ai/queue/:jobId/action`**: Controls background execution (`pause`, `resume`, `cancel`, `retry`).

---

## 5. Security & Key Encryption Policy

To protect sensitive API tokens:
* Credentials are **never** returned in raw form to the browser.
* API Keys are encrypted before saving using **AES-256-CBC** cryptography using a 32-byte key derived from `JWT_SECRET`.
* Masking logic `substring(0, 4) + '...' + substring(length - 4)` obfuscates all output returned to the admin dashboard.

---

## 6. Cost Optimization Guidelines

* **Caching**: Identical prompt calls are served locally from `AiCache`. Cache invalidates instantly when the underlying prompt template or product data changes.
* **Token Estimation**: Estimated costs are logged into `AiAnalytics` and updated live on the administrator dashboard to help managers find optimal budget-to-quality combinations.
* **Local Models**: Admins can configure the active provider to Ollama or LM Studio to run completely local and cost-free models during test runs.

---

## 7. Troubleshooting

* **Model Error: API Key not configured**: Ensure you have populated the correct API key under the *Engine Config* tab on the AI Content dashboard.
* **Slow Generations**: If timeout occurs, increase the timeout parameter (default 30 seconds) inside the *Engine Config* settings tab.

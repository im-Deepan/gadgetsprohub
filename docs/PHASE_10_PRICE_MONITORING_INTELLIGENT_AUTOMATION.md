# Phase 10 – Price Monitoring, Product Synchronization & Intelligent Automation

This document outlines the architectural implementation and deployment specs for Phase 10, bringing enterprise-grade pricing intelligence, background queues, and automated workflows to the Amazon Affiliate system.

---

## 1. Core Data Models (Mongoose Schemas)

The following database models are integrated securely to support non-blocking background queue tasks and data auditing:

### A. `PriceHistory`
Maintains granular timeline checkpoints of price movements, inventory fluctuations, and buybox ownership.
* `productId`: Mongoose ObjectId referencing `Product` (Indexed)
* `price`: Current price value (Number, Required)
* `originalPrice`: Original baseline price (Number)
* `discount`: Active discount percentage (Number)
* `seller`: Buy-Box merchant name (String, Default: Amazon)
* `inStock`: Inventory status flag (Boolean)
* `timestamp`: Date checkpoint log (Default: `Date.now`)

### B. `ProductChange` (Smart Change Detection)
Tracks exact mutations during synchronization to fuel differential triggers.
* `productId`: Ref `Product` (Indexed)
* `changedFields`: Map of dynamic field changes: `FieldName -> { oldValue, newValue }`
* `timestamp`: DateTime of change event

### C. `SyncJob` (Background Queue Worker)
Tracks queued bulk or scheduled catalog synchronization tasks with support for pause, resume, cancel, and retry.
* `name`: Synchronization run descriptor (String)
* `status`: Queue status enum: `['waiting', 'running', 'completed', 'failed', 'retrying', 'cancelled']`
* `priority`: Queue priority weight (Number)
* `progress`: Processing percentage (Number, 0-100)
* `totalItems` / `processedItems` / `failedItems`: Tracking count metrics
* `results`: Audit logs of per-product status and synchronization warnings

### D. `SchedulerTask`
Allows configuring real-time audit cycles.
* `name`: Schedule identifier (String)
* `interval`: Execution frequency profile (e.g. '5m', '15m', '30m', 'hourly', 'daily')
* `active`: Active state toggle (Boolean)
* `successCount` / `failCount`: Metrics track records
* `averageDurationMs`: Average processing duration

### E. `AlertRule` (Price Alert Subscriptions)
Defines custom notification triggers for price drops or inventory changes.
* `name`: Alert descriptor
* `productId`: Optional product lock restriction
* `triggerType`: `['price_drop_pct', 'price_drop_abs', 'out_of_stock', 'back_in_stock']`
* `threshold`: Trigger threshold (e.g. 15% drop)
* `channels`: `['browser', 'email', 'telegram', 'discord', 'slack']`

### F. `ProductHealth` (Diagnostics Engine)
Maintains individual product scores from 0 to 100 based on affiliate link validity, SEO metadata, and description quality.

---

## 2. Background Queue & Sync Engine Mechanics

1. **Non-Blocking Processing**: The worker operates on a custom interval loop. When a new `SyncJob` with `waiting` state is detected, the queue locks and processes each item asynchronously, preventing any blocks to the main Express event loop.
2. **State Control**: Rest APIs allow administrators to toggle job states (`pause`, `resume`, `cancel`, `retry`) in real-time.
3. **Trigger Pipeline**:
   ```
   Sync Cycle -> Scrape/Update -> Detect Changes -> Save PriceHistory -> Fire AlertRules -> Trigger Automation Rules -> Recalculate HealthScore
   ```

---

## 3. Integrated API Routes (Admin Rest Handlers)

The backend exposes fully authorized REST interfaces mounted under `/api/admin/sync`:
* `GET /api/admin/sync/dashboard` - Sourcing real-time tracking metrics
* `GET/POST /api/admin/sync/jobs` - Background queue management
* `POST /api/admin/sync/jobs/:id/action` - Pause, Resume, Cancel, Retry controls
* `GET /api/admin/sync/schedules` - Scheduler profile listing
* `POST /api/admin/sync/schedules/:id/toggle` - Activate / Deactivate schedules
* `POST /api/admin/sync/schedules/:id/run` - Trigger instant automated cron jobs
* `GET/POST/DELETE /api/admin/sync/alerts` - Alert rules orchestration
* `GET/POST/DELETE /api/admin/sync/rules` - IF-THEN automation engine setup
* `GET /api/admin/sync/timeline/:productId` - Price chart points & mutation history
* `POST /api/admin/sync/link-validate` - Live Tracking ID validator
* `GET /api/admin/sync/notifications` - Multi-channel system logs

---

## 4. Administrative Dashboard Control Panel (`SyncDashboard.tsx`)

A bespoke, dark-themed control hub integrated as a premium tab into the main Admin screen, featuring:
* **Interactive Statistics Counters**: High-visibility metric trackers.
* **Price Trend Visualizations**: `recharts` powered pricing trends area graphs.
* **Link parameter Auditor**: Instantly audit Amazon Associate URL parameter tags.
* **Visual Rule Builder**: Custom configure price alerts or multi-channel logging dispatches.
* **Dispatch Logs**: Comprehensive audit logs for tracing all automated execution triggers.

# PROJECT MAP — OPTECH ERP v2

## TECH_STACK
- **Runtime:** Node.js 24.x LTS
- **Framework:** Express 5.2.1 (ACTIVE LTS)
- **Database:** JSON file (data/optech.json) with write queue for concurrency
- **Security:** Helmet 8.x, bcrypt 5.x for passwords, input sanitization middleware
- **Frontend:** Vanilla JS + CSS3 (no framework)
- **Auth:** Token-based sessions (server-side Map, 24h TTL, expiry cleanup)
- **Logging:** Async file logger (logs/YYYY-MM-DD.log), 4 levels (error/warn/info/debug)
- **Printing:** iframe → standalone HTML templates → window.print()

## SYSTEM_FLOW
```
[Browser] ←HTTP/JSON→ [Express Server (server/index.js)]
                             ├── Static files (public/)
                             ├── API routes (routes/)
                             ├── Auth middleware (middleware/requireAuth.js)
                             ├── Input sanitization (middleware/validate.js)
                             └── Custom static serving (middleware/static.js)
                                    ↓
                            [Data Layer (lib/db.js)]
                             ├── Read: fs.readFileSync + in-memory cache
                             └── Write: serialized promise queue (no race conditions)
```

## ARCHITECTURE
```
optech-erp/
├── server/
│   ├── index.js                 # Express bootstrap, middleware stack, route mounting
│   ├── config.js                # PORT, DB path, session TTL, log level
│   ├── lib/
│   │   ├── db.js                # JSON file DB with write queue
│   │   └── logger.js            # Async file logger (error/warn/info/debug)
│   ├── routes/
│   │   ├── auth.js              # POST login/logout, GET me/ping
│   │   ├── users.js             # CRUD users (admin-only, bcrypt passwords)
│   │   ├── data.js              # Generic collection CRUD (invoices, receipts, etc.)
│   │   └── activities.js        # Activity log (last 100)
│   └── middleware/
│       ├── requireAuth.js       # Session management (create/destroy/verify)
│       ├── validate.js          # XSS sanitization (< > removal)
│       └── static.js            # Custom static file server (path traversal protection, URL-decodes paths for filenames with spaces)
├── public/
│   ├── index.html               # SPA shell
│   ├── login.html               # Login page
│   ├── CRM.html                 # Standalone CRM (Kanban, leads, analytics)
│   ├── css/style.css            # All styles (incl. dark mode, print, responsive)
│   ├── js/
│   │   ├── app.js               # Main SPA (navigation, modals, CRUD, print)
│   │   └── db-client.js         # API client (fetch wrapper, localStorage fallback)
│   ├── print/                   # Standalone print templates
│   │   ├── INVOICE.html
│   │   ├── Cash-Recipt.html
│   │   └── Quotation.html
│   └── assets/                  # Images (logos, signature, stamp)
├── data/
│   └── optech.json              # Database file (gitignored)
├── logs/                        # Log files (gitignored)
├── package.json
└── PROJECT_MAP.md
```

## DATA_MODEL
9 collections in `optech.json`:
- **users**: id, username, password (bcrypt), name, role (admin/user), active, created, lastLogin
- **invoices**: id, client, phone, date, due, total, _items[], _tax, _ship, _inst, _instVal, _disc, _discVal, _paid, _nextPayment, _terms[]
- **receipts**: id, from, phone, email, amount, method, desc, date
- **customers**: name, phone, email, company, city, notes, created
- **quotations**: id, client, phone, email, date, validUntil, preparedBy, total, status, _items[] (with imgBase64, spec), _tax, _ship, _inst, _instVal, _disc, _discVal, _terms[]
- **leads**: id, name, company, phone, email, value, stage, priority, source, closeDate, notes, created
- **activities**: id, type, description, date, time, user, leadId, leadName, done, next, created
- **inventory**: id, sku, name, category, unit, costPrice, salePrice, currentStock, minStock, location, supplier, description, imgBase64, created
- **inventory_movements**: id, itemId, itemName, itemSku, type (in/out/adjustment), quantity, date, reference, reason, notes, user, stockAfter, created
- **suppliers**: id, name, category, contactPerson, phone, email, address, paymentTerms, products, rating, notes, created

## CHANGES MADE (v1 → v2)

### Backend
- Migrated from `server.js` (single file) to modular `server/` structure
- Upgraded Express 4 → 5.2.1, added Helmet 8.x + bcrypt 5.x
- Passwords hashed with bcrypt (auto-migration on first boot)
- Added async file logger with 4 levels
- Added session expiry (24h TTL) + cleanup interval
- Added input sanitization (XSS prevention)
- Added custom static middleware (directory traversal protection)
- Write queue prevents concurrent write corruption

### Frontend
- Files organized under `public/` with proper paths
- AI Assistant functions (`showAIAssistant`, `runAIAssistant`, `applyAIResult`, etc.) moved from `app.js` into `main.js` as shared core (available to all modules)
- Duplicate functions (`duplicateInvoice`, `duplicateQuotation`, `duplicateItem`, `duplicateReceipt`) moved from `app.js` into respective module files (`invoices.js`, `quotations.js`, `inventory.js`, `receipts.js`)
- Inline status-update dropdown added to quotations table (`updateQuotationStatus`)

### Server Fix
- **`server.js`**: Changed `express.static(path.join(__dirname))` → `express.static(path.join(__dirname, 'public'))` and catch-all route from `index.html` → `public/index.html` to properly serve the v2 modular SPA. Previously the server served the old root `index.html` which loaded `app.js` (monolithic), ignoring all v2 modular files under `public/`.
- Print template iframe paths fixed (`print/` prefix)
- `_refreshView()` now uses `_currentSection` instead of fragile `innerHTML.includes()`
- `db.activities` added to initial schema (CRM was using undefined collection)
- Toast notification system added
- Responsive sidebar CSS (mobile support)
- Added spinner/keyframe animations

### Login Page Fix
- **`public/login.html`**: Changed `<script src="db-client.js">` → `<script src="js/db-client.js">`. The old path resolved to `public/db-client.js` (doesn't exist), causing the catch-all to serve HTML as JS → `DbClient` undefined → "Checking server connection..." hung forever.
- **Asset files**: Copied `Signature.png`, `optech-green-dot copy.png`, `optech-green-dot copy 2.png` from project root into `public/` so they resolve correctly under the new static file root.

### Bug Fixes
- **INVOICE.html**: Removed duplicate `loadInvoiceData()` definition
- **Quotation.html**: Fixed `termsContainer` → `termsList` ID mismatch (terms never loaded)
- **Print race condition**: Reduced iframe print timeout and simplified cleanup
- **Schema**: Added `activities` to initial `db` object in app.js

### Print Layout
- **INVOICE.html** / **Quotation.html**: Sig/stamp removed from `position: fixed` footer. Now in-flow `.signature-section` / `.thank-you-bar` (`.bottom-note`) appear naturally at the end of the document in both screen and print. Removed `position: fixed` footer CSS/HTML, reduced `padding-bottom` from 380px → 60px.
- **Images**: All images (`optech-green-dot copy 2.png`, `optech-green-dot copy.png`, `Signature.png`, `optech_stamp.png`) copied into `public/print/` so relative paths resolve correctly. `optech_stamp.png` also copied into `public/` for root-level access.
- **Static middleware** (`server/middleware/static.js`): Fixed URL-encoded filenames — added `decodeURIComponent()` so files with spaces (like `optech-green-dot copy 2.png`) resolve correctly on disk. Express 5.x `req.path` does not decode `%20` → spaces, causing all files with spaces to return HTML (catch-all) instead of the actual file.

### Text Alignment & Formatting
- **INVOICE.html**: `.desc-input` changed from `text-align: right` to `left` (product names are English). Added `.price { text-align: right }` and `.total-cell { text-align: right }` for professional finance number alignment.
- **Quotation.html**: Added `.price { text-align: right }` and `.total-cell { text-align: right }` for consistent number alignment.

### Meta-data Alignment
- **INVOICE.html**: meta-rows (`Invoice No` / `Date` / `Due Date`) reordered to `<label><input>` (LTR) and `justify-content` changed to `flex-start` so the block aligns left. `.invoice-details` changed from `justify-content: space-between` to `gap: 60px` so bill-to and meta-data sit side-by-side on the left (true LTR).
- **Quotation.html**: meta-rows (`Quotation No` / `Issue Date` / `Prepared By`) reordered to `<label><input>` (LTR), input `text-align` changed from `center` to `right` for Arabic-friendly right-aligned text.

### PDF Filename (Print Title)
- **INVOICE.html** / **Quotation.html**: Replaced fragile `prepareAndPrint()` title-set + `setTimeout` restore with `window.addEventListener('beforeprint', …)`. This sets `document.title` from live form fields (client, number, date) immediately before the browser reads it for the Print → Save as PDF filename, eliminating race conditions.

### Duplicate Button
- **Invoices / Quotations / Inventory / Receipts**: Added "Dup" button (orange `#ff9800`) in each row's actions column. Functions `duplicateInvoice()`, `duplicateQuotation()`, `duplicateItem()`, `duplicateReceipt()` deep-copy the record, generate a new ID/number, and open the edit modal pre-filled with the copied data.
- **openItemModal()**: Extended signature to accept an optional `prefill` object (2nd parameter) for duplication without touching the DB.

### AI Agent Integration
- **Server** (`server/routes/ai.js`): `/api/ai/complete` endpoint proxies to any OpenAI-compatible API. Configured via `AI_ENDPOINT`, `AI_API_KEY`, `AI_MODEL` env vars. Protected by `requireAuth` middleware. Also exposes `GET /api/ai/config` to report configuration status.
- **Config** (`server/config.js`): `ai` block defaults: endpoint → OpenRouter (`https://openrouter.ai/api/v1`), model → `openai/gpt-4o-mini`, API key configured with user-provided OpenRouter key as fallback when env var unset.
- **Client** (`public/js/main.js`): AI Assistant functions (`showAIAssistant`, `runAIAssistant`, `applyAIResult`, `parseAIJSON`, `closeAIAssistant`, `escapeHtml`) — shared core available to all modules.
- **Client** (`public/js/modules/invoices.js`, `quotations.js`, `inventory.js`): "🤖 AI" button (purple `#9c27b0`) in each modal toolbar.
- **System-wide AI Agent** (`server/routes/ai-agent.js`): `POST /api/ai/agent` endpoint that accepts natural language commands and executes system operations via `db.js` directly. Supports 13 tools: chat, export_data, delete_record, add_invoice, add_quotation, add_inventory_item, add_receipt, add_activity, add_customer, add_lead, get_customers, get_inventory, get_data.
  - `export_data`: Exports any collection as CSV (default) or JSON. `executeTool()` formats all records into CSV with headers (handles nested objects via JSON.stringify in cells) or pretty-printed JSON. Returns `{exportData, exportFilename, exportMime}`. Route handler detects `result.exportData` and sends to client. Client `sendAgentMessage` triggers browser download via Blob + object URL.
  - `delete_record` (enhanced): Two-phase delete with user confirmation. Now searches across **ALL fields** (including nested arrays like `_items`), supports **bulk deletion** of multiple matching records. `executeTool()` filters all records where any field contains the identifier text (case-insensitive). Stores `{collection, ids: []}` (array of IDs) in `pendingDeletions` Map keyed by a random token (2 min TTL), returns `{pending: true, confirmToken, count, preview}`. The route handler detects `result.pending` and returns token + count to client.
  - `POST /api/ai/agent/confirm`: Consumes the token, iterates all pending IDs in reverse, splices matching records from the DB array, calls `db.write()`, returns count of deleted records.
- **Client** (`public/js/main.js`): AI Agent redesigned as chat interface (`showAIAgent`, `sendAgentMessage`, `clearAgentChat`, `closeAIAgent`) with conversation history, message bubbles (user/bot), auto-refresh on success.
  - **No raw JSON in responses**: Added `formatDataForDisplay(arr)` — detects record type by key fingerprint (client+_items → invoice, from → receipt, name+sku → inventory, etc.) and renders human-readable lines with emojis (📄 Invoice, 💰 Receipt, 📦 Item, 👤 Lead, 👥 Customer, 📋 Activity). Max 20 records shown, remainder counted. Added export download handler for `data.exportData` — triggers browser download via Blob + click.
  - Added `agentConfirmDelete(token)` and `agentCancelDelete(token)` — on `data.pending`, renders an orange confirmation card with [Confirm Delete] / [Cancel] buttons. Confirm POSTs to `/api/ai/agent/confirm`, Cancel removes the card and shows cancellation message.
  - Added `toggleCRMDropdown()` and updated `showSection()` to highlight CRM nav-toggle when any CRM sub-section is active.
- **Client** (`public/index.html`): Sidebar nav now has CRM dropdown (`nav-dropdown`) with sub-items: Pipeline, Leads, Activities, Analytics. CRM sub-items call `showSection('crm')`, `showSection('crm-leads')`, etc. Added `crm.js` script include. AI Agent nav item preserved.
- **CRM Module** (`public/js/modules/crm.js`): New file — ported from `CRM.html` standalone page into SPA module. All functions adapted to use global `db` object (`db.leads`, `db.activities`) and `saveDB()` instead of local variables/functions. Contains: `renderCRM(container, tab)` with tab switching (`switchCRMTab`), pipeline Kanban (`renderPipeline`, `dealCardHTML`, drag/drop via `dragDeal`/`dropDeal`), leads table (`renderLeadsTable`, `filterLeads`), activities view (`renderActivities`, `markActDone`, `deleteActivity`), analytics with Chart.js (`renderAnalytics`), modal engine (`openOverlay`/`closeOverlay`), deal modals (`openDealModal`, `openEditModal`, `saveDealForm`, `confirmDeleteDeal`), activity modals (`openActivityModal`, `openEditActivityModal`, `saveActivityForm`), and CSV export (`exportCRMCSV`).
- **CRM** (`public/CRM.html`): Preserved as standalone page for backward compatibility.
- **System Animations** (`public/css/style.css`): Added keyframes (fadeIn, scaleIn, slideUp, slideDown, pulse). Overlay fade/scale-in on all modals (`#app-modal-overlay`, `#ai-assistant-overlay`, `#ai-agent-overlay`, `#inv-picker-overlay`, `.crm-overlay`). Section slide-up on `#view-container`. Stat-card hover lift (translateY + shadow). Button press effect (scale .97). Sidebar active nav indicator (slideDown green bar). **CRM dropdown**: `.nav-dropdown-content` with slideDown animation on `.open`. **CRM tabs**: `.crm-tab` with hover/active states, `.crm-badge` for counts. **CRM stats/tables/overlay**: All CSS classes ported from CRM.html (`.stats-row`, `.scard`, `table.ct`, `.pill-*`, `.crm-overlay`, `.crm-modal`, `.cm-*`, `.fg`, `.form-row`). **Button shared styles**: `.btn` family (primary/outline/danger/success, -sm/-xs sizes). **Nav hover animation**: `.nav-item:hover { padding-left: 26px }` for subtle indent effect.

## ORPHANS & PENDING
- [ ] **Cash-Recipt.html**: Filename typo (Recipt → Receipt) — requires rename + route redirect
- [ ] **printInvoiceInline()**: Deprecated function not used by any UI path — candidate for removal in next cleanup pass
- [ ] **printModal()**: Legacy print helper, kept for backward compat but no longer used by modals
- [ ] **autoRegisterCustomer()**: Potential duplicates when name is "Unknown" — needs dedup logic
- [ ] **Inventory CSV export**: Missing image column (intentional, but noted)
- [ ] **Dark mode**: Not applied to login.html or CRM.html
- [ ] **No pagination**: Large data tables (invoices, receipts) need virtual scrolling or pagination
- [ ] **Base64 images in JSON**: Storage bloat — candidate for file-based upload in future

# Light Close Readiness Radar

**An AI-native finance operations demo** — showing how software can help finance teams close the month faster with real-time readiness tracking, smart workflow automation, and plain-English posting explanations.

> **What This Is:** A fully-functional mock of Light's Close Readiness workflow. No API key needed. Built in 2 days to demonstrate product engineering thinking for multinational finance operations.

**Live Demo:**
- Close Readiness: http://localhost:3000  
- Ledger Lens: http://localhost:3000/ledger

---

## 🚀 Quick Start

```bash
pnpm install
pnpm build:mock
pnpm dev:demo
```

Open http://localhost:3000

---

## 💡 Finance Concepts for Engineers

*New to finance? Here's what this demo is actually modeling:*

### The General Ledger (GL)
Think of it as **version control for money**. Every financial transaction gets recorded as a ledger entry with at least two lines:
- **Debit** (money coming in, or assets increasing)  
- **Credit** (money going out, or liabilities increasing)

**Example:** Customer pays you $1,000:
```
DEBIT:  Bank Account        $1,000  (asset ↑)
CREDIT: Accounts Receivable $1,000  (asset ↓ — they no longer owe you)
```

The GL is **immutable** — once posted, entries can't be deleted (only reversed with new entries). This is why state machines matter in finance.

### State Machines (Why "Forward-Only"?)
In finance, documents move through workflow states that create audit trails:

```
DRAFT → SUBMITTED → APPROVED → POSTED → PAID
```

**Why can't you go backwards?**
- **DRAFT**: You're still editing. No financial impact.  
- **SUBMITTED**: Locked for approval. Now it's a promise.  
- **APPROVED**: Commitment made. Affects financial forecasts.  
- **POSTED**: Written to the ledger. Shows up in financial statements.  
- **PAID**: Cash actually moved. Bank balance changed.

Going from PAID → DRAFT would be like `git rebase` on production — you're rewriting financial history. Auditors hate that. Regulators hate that more.

### Accounts Receivable (AR) vs. Accounts Payable (AP)
- **AR** = Money customers owe YOU (asset)  
  - Draft invoice → Submit → Customer pays → Mark as paid  
  - Blocker: "5 draft invoices" means revenue not yet recognized  
  
- **AP** = Money YOU owe vendors (liability)  
  - Receive bill → Approve → Pay vendor  
  - Blocker: "3 bills awaiting approval" means cash flow unclear  

### Month-End Close
Finance teams **close the books** monthly to generate financial statements (P&L, Balance Sheet). Before closing:
- All invoices must be finalized (no drafts)  
- All bills must be approved (know your liabilities)  
- All transactions must be categorized (expense accounts correct)  
- Foreign exchange must be revalued (accurate FX gains/losses)  

**The problem this demo solves:** "Are we ready to close?" used to take 30 minutes of hunting through modules. Now it's a 10-second dashboard glance.

### Cursor Pagination vs. Offset
**Offset pagination** (traditional):
```
GET /invoices?page=2&limit=20  // Skip first 20, get next 20
```
**Problem:** If someone inserts 5 new invoices while you're on page 2, you see duplicates or miss records.

**Cursor pagination** (stable):
```
GET /invoices?cursor=eyJpZCI6MTIzfQ==&limit=20
```
**Solution:** Cursor anchors to a specific record ("start after invoice #123"). New inserts don't break your place.

**Why it matters:** Finance teams export data for analysis. Offset breaking mid-export = corrupt data files = angry CFO.

---

## 🎯 What's In This Demo

### 1. Close Readiness Radar (`/`)
- **Entity-level readiness scores** (Ready/Almost/Not Ready)  
- **4 blocker categories**: AR drafts, AP awaiting approval, unclassified cards, FX flags  
- **Real-time scoring**: 100 − (AR drafts × 30) − (AP bills × 25) − ...  
- **Interactive drawer**: Click entity → see itemized blockers → fix inline  

### 2. AI Assistant (Mocked, Rule-Based)
- **Contextual suggestions**: "I noticed 2 AR drafts. Want me to open them?"  
- **One-click bulk actions**: Opens all drafts with assigned invoice numbers  
- **FX reminders**: "Last revaluation was 3 days ago. Run it again?"  
- Shows **AI-native thinking** without needing real ML infrastructure  

### 3. Ledger Lens (`/ledger`)
- **GL transaction table** with sortable columns  
- **"Explain Posting" panel**: Click any line → see the full audit trail:
  ```
  GL Transaction Line (what was posted)
      ↓
  Invoice Line (source document)
      ↓
  Product Defaults (where tax/account came from)
      ↓
  Plain-English explanation ("Customer owes us £12,000...")
  ```
- Bridges the **finance literacy gap** — most engineers don't understand double-entry bookkeeping  

### 4. Inline Workflow Actions
- **Open AR drafts** → assigns invoice numbers, locks for immutability  
- **Approve AP payables** → advances state (INIT → APPROVED)  
- **Classify card transactions** → patches accountId + taxCodeId  
- **Confirm FX revaluation** → clears flags for bank accounts  

---

## 🏗️ Architecture

```
packages/mock-sdk/              # In-memory Light API
  src/
    MockLightClient.ts          # Client with side effects
    types.ts                    # TypeScript interfaces
  fixtures/
    entities.json               # 3 companies (UK, US, DE)
    arInvoices.json             # AR with DRAFT/OPEN states
    apPayables.json             # AP with INIT/APPROVED
    cardTransactions.json       # Classified/unclassified spend
    ledgerAccounts.json         # Chart of accounts + FX flags

apps/demo/
  app/
    page.tsx                    # Close Readiness Radar (main demo)
    ledger/page.tsx             # Explain Posting
    api/
      readiness/route.ts        # Blocker aggregation
      ar-open/route.ts          # Open invoices
      ap-approve/route.ts       # Approve bills
      card-patch/route.ts       # Categorize spend
      fx-confirm/route.ts       # Confirm FX
  lib/
    clientFactory.ts            # Mock/real client switcher
    readinessScore.ts           # Scoring logic
```

**Tech Stack:**
- Next.js 14 (App Router), React, TypeScript, Tailwind CSS  
- In-memory mock (no database, no API key)  
- Simulated 250ms latency for realistic feel  

---

## 📊 Readiness Scoring Model

```javascript
score = 100 
  - (arDraftCount × 30)      // Revenue recognition blocked
  - (apInitCount × 25)        // Cash flow unclear
  - (cardUnclassCount × 15)   // Expense accounts wrong
  - (fxFlagCount × 20)        // Material FX misstatement risk
```

**Thresholds:**
- `≥90` → 🟩 **Ready** (green)  
- `70-89` → 🟨 **Almost** (yellow)  
- `<70` → 🟥 **Not Ready** (red)  

**Why these penalties?**
- **AR drafts** are highest (−30) because they block revenue recognition (can't report earnings until invoices are finalized)  
- **AP bills** are medium (−25) because they affect cash flow forecasting (don't know how much you owe)  
- **Card spend** is lower (−15) — usually discretionary, can defer  
- **FX flags** are high (−20) — for multinationals, FX gains/losses can be material misstatements  

---

## 🎨 Design Decisions

### Why Close Readiness?
**Real pain point:** Finance teams waste hours chasing down blockers before month-end.

**Before (traditional ERP):**
1. Check AR module → find 5 draft invoices  
2. Switch to AP module → find 3 unapproved bills  
3. Check card spend → 8 unclassified transactions  
4. Email back-and-forth to coordinate  
5. Repeat daily: "Are we ready yet?"  

**After (this demo):**
1. Open dashboard → see readiness score 68% (Not Ready)  
2. Click UK entity → see all blockers in one drawer  
3. AI suggests "Open all AR drafts?" → click yes  
4. Score jumps to 88% (Almost)  
5. Done in 2 minutes.

### Why AI Assistant (Mocked)?
- Demonstrates **AI-native thinking** without needing real ML  
- Rule-based now, ML-ready later (shows architecture)  
- Reduces cognitive load: "Want me to fix this?" beats "Here are 5 things you need to manually do"  

### Why "Explain Posting"?
- **Finance literacy gap** — engineers rarely understand debits/credits  
- **Audit trail transparency** — shows immutable ledger → source document → product defaults  
- **Educational** — helps new finance team members learn the system  

### Why Cursor Pagination?
- **Stability** — offset breaks when records are inserted/deleted mid-pagination  
- **Scalability** — no expensive `COUNT(*)` queries at scale  
- **Honest UX** — "More results available" vs. misleading "Page 1 of 47" that changes as you click  

---

## 🔧 What's Real vs. Mocked

### Fully Functional ✅
- Close readiness aggregation (blocker counts → scores)  
- AR invoice opening (assigns numbers, locks state)  
- AP approval workflow (state advances)  
- Card transaction categorization  
- FX flag confirmation  
- Ledger → Invoice → Product trail visualization  
- Cursor pagination with nextCursor/prevCursor  
- Filter/sort syntax (`field:operator:value`)  
- Simulated latency (250ms delays)  

### Intelligently Mocked ⚠️
- **AI Assistant** — rule-based (no ML model)  
- **Multi-user presence** — single-player (no WebSockets)  
- **Persistence** — in-memory only (refresh = reset)  
- **Authentication** — skipped (no OAuth)  

### Out of Scope ❌
- Real Light API integration (stub present, easy to swap)  
- Full AP approval workflows (multi-level, limits, delegations)  
- Tax engines, bank reconciliation, consolidated reporting  
- Mobile app (responsive web only)  

---

## 💡 What I'd Add Next

1. **Time-travel playback** — Scrub through last 5 minutes of close  
2. **Collaborative presence** — "Anna approved 2 AP bills" with avatars  
3. **Keyboard shortcuts** — Cmd+K command palette: "Open all UK drafts"  
4. **Performance metrics** — Show <500ms API response in corner  
5. **Role-based views** — CFO vs. AP Operator vs. Accountant perspectives  

---

## 📚 References

This demo aligns with Light's public API documentation:
- [Company Entities](https://docs.light.inc/api-reference/entities/list-company-entities)  
- [Ledger Accounts](https://docs.light.inc/api-reference/ledger-accounts/list-ledger-accounts)  
- [Invoice Receivables (AR)](https://docs.light.inc/api-reference/v1--invoice-receivables/list-invoices)  
- [Invoice Payables (AP)](https://docs.light.inc/api-reference/v1--invoice-payables/list-invoice-payables)  
- [Card Transactions](https://docs.light.inc/api-reference/v1--card-transactions/list-card-transactions)  

---

## 🎯 Why This Demo Matters

Built as a **portfolio piece** for Light's Fullstack Engineer role. Demonstrates:

1. **Product engineering mindset** — not just code, but workflow design + user empathy + accounting literacy  
2. **AI-native thinking** — contextual assistant, intelligent defaults, proactive suggestions  
3. **Craft obsession** — smooth transitions, thoughtful microcopy, data-dense but beautiful  
4. **Understanding of Light's mission** — "software that feels alive" for multinational finance  
5. **Quick execution** — built in 2 days from spec → working demo  

**This isn't just a coding exercise.** It's a conversation starter:
- "Here's how I'd improve month-end close workflows"  
- "This is how AI assistants should work in finance software"  
- "Let me show you the posting explanation feature..."  

Ready to build this for real. 🚀

---

## 📈 Metrics

**Lines of Code:** ~2,000 (focused, no bloat)  
**Build Time:** 2 days from spec → working demo  
**TypeScript Coverage:** 100% (strict mode)  
**Simulated API Response:** <250ms  

---

## 🚧 Environment Variables

```env
LIGHT_USE_MOCK=1              # Use mock client (no API key needed)
# LIGHT_BASE_URL=https://api.light.inc
# LIGHT_API_KEY=Basic <key>   # For future real API integration
```

---

See [BUILD_LOG.md](./BUILD_LOG.md) for detailed design decisions and trade-offs.

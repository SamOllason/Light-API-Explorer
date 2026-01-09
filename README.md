---

## Assumptions for Invoice Payables Demo

To keep this artifact focused and realistic, the following assumptions are made about the Invoice Payables workflow and data model:

- **State Machine:**
  - INIT → SUBMITTED → APPROVED → PAID (with possible CANCELED/DECLINED)
  - Allowed transitions:
    - INIT → SUBMITTED (submit for approval)
    - SUBMITTED → APPROVED (approve)
    - SUBMITTED → DECLINED (decline/reject)
    - APPROVED → PAID (mark as paid)
    - INIT or SUBMITTED → CANCELED (cancel before approval/payment)
  - Terminal states: PAID, CANCELED, DECLINED

- **Actions:**
  - Approve, decline, or cancel are only available in certain states (e.g., can’t approve if already paid).
  - Only INIT/SUBMITTED can be canceled; only SUBMITTED can be approved/declined.

- **Fields Displayed:**
  - List view: payee, amount, status, due date, etc.
  - Detail view: all fields, including audit info (createdAt, updatedAt, approval/cancellation notes, line items).

- **Error Handling:**
  - Invalid transitions (e.g., approving a PAID invoice) return a 422-style error with a helpful message.

- **Filtering/Sorting:**
  - Support filtering by state, payee, vendor, due date, amount, etc.
  - Support sorting by due date, amount, createdAt.

- **Line Items:**
  - Each invoice payable can have multiple line items (amount, description, tax, account, etc.).

- **Microcopy:**
  - Calm, human explanations for each state and action, as in the rest of the demo.

If you have access to the real state machine or business rules, it’s easy to adjust! These assumptions are based on standard AP automation patterns and the available API documentation.

---

# Let their be Light! A Light Faux SDK

A small, opinionated product-engineering artifact demonstrating API ergonomics, workflow-first UX, and thoughtful design for finance software. I created this to understand the Light SDK by selecting part of the API functionality.


This could evolve into an onboarding tool for new Light team members or new customers.

---

## Why This Demo? (Narrative for Reviewers)

This artifact is intentionally focused and opinionated. Here’s what to notice:

- **Depth over breadth:** Focuses on the hardest, most consequential parts—state transitions, cursor pagination, and error handling—where product and API design matter most.
- **Real-world finance needs:** Forward-only state machines, cursor-based pagination, and explicit error feedback are about audit trails, reliability, and honest UX.
- **"Alive" feel:** Simulated latency, deterministic data, and error states make the demo feel real, supporting both developer experience and user empathy.
- **Teaching by interaction:** The UI and SDK are designed to teach by doing, not just by reading docs.
- **Tasteful constraints:** Features like totals, offset pagination, and backward transitions are intentionally omitted, with clear explanations—showing product judgment.

> "I built this to show how I think about API and product design, not to cover every feature. Every constraint is intentional—a trade-off for clarity, auditability, or UX. This demo is a conversation starter: it’s small, but designed to teach and provoke discussion about what 'alive' finance software should feel like."

---

See the live demo [here](https://samollason.github.io/Light-API-Explorer/).

## Quick Start

```bash
pnpm install
pnpm dev:demo
```

Open http://localhost:3000


## Key Concepts

| Concept | What | Why |
|---------|------|-----|
| **Cursor Pagination** | Navigate with `nextCursor`/`prevCursor` instead of `?page=2` | Offset breaks when records are inserted/deleted - you skip items or see duplicates. Cursor anchors to a specific record. |
| **Filter Syntax** | `field:operator:value` (e.g., `status:eq:DRAFT`) | Explicit, composable, type-safe. Supports complex queries without ambiguity. |
| **Forward-Only States** | DRAFT > SUBMITTED > APPROVED > POSTED > PAID | Finance requires audit trails. No skipping, no going backward. Invalid transitions return helpful errors. |
| **No Total Count** | "More results available" instead of "Page 1 of 47" | `COUNT(*)` is expensive at scale and misleading (changes as you paginate). Honest UX over false precision. |
| **Simulated Latency** | Configurable `latencyMs` and `failRate` | Feels like a real API. Test loading states and error handling without a backend. |
| **Deterministic Data** | Seeded PRNG generates consistent mock data | Same seed = same data. Reproducible demos and tests. |


## Project Structure

```
packages/sdk/          # Fake SDK (TypeScript, ESM)
  src/
    client.ts              # LightClient entry point
    modules/
      accountingDocuments.ts  # List/filter/sort/paginate
      invoicePayables.ts      # State machine transitions
    filters.ts             # Filter parsing
    pagination.ts          # Cursor encode/decode
    db.ts                  # Seeded data generation

apps/demo/             # Next.js demo app
  app/
    page.tsx              # Interactive demo UI

ARCHITECTURE.md        # Technical architecture details
.github/
  copilot-instructions.md   # AI assistant context
```


## Design Philosophy

> "Software that feels alive" - Light

This artifact demonstrates how **UX is downstream of API ergonomics**:

1. **Finance as state machine** - Transitions have guardrails; UI prevents invalid moves
2. **Cursor over offset** - Stability at scale; "continue where I left off"
3. **Taste over features** - Small, cohesive, intentional


## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev:demo` | Start the demo app |
| `pnpm build` | Build the SDK |
| `pnpm typecheck` | Type check all packages |


## Demo UI Features

The demo is designed to **teach by interaction**:

| Feature | What it does |
|---------|--------------|
| **Filter presets** | Clickable chips ("Drafts", "High value", "Acme") populate the filter input - see the syntax, learn the pattern |
| **"Intentional" badges** | Amber badges explain design decisions - click to see why we made specific trade-offs |
| **Workflow panel** | Select a document > see state machine > advance through states with one click |
| **Live feedback** | Simulated latency + occasional errors make it feel like a real API |


## Filter Examples

Format: `field:operator:value` (comma-separated for multiple)

**The demo includes clickable filter presets** - click "Drafts", "High value", or "Acme" to populate the filter input and see the syntax in action. Learn by doing, not reading.

```bash
# By status
status:eq:DRAFT
status:in:DRAFT|SUBMITTED

# By business partner
businessPartnerName:contains:Acme
businessPartnerName:starts_with:Global

# By amount
totalTransactionAmountInMajors:gt:5000
totalTransactionAmountInMajors:lte:10000

# By document type
documentType:eq:AP
documentType:in:AP|AR

# Combined
status:eq:DRAFT,documentType:eq:AP
status:in:DRAFT|SUBMITTED,totalTransactionAmountInMajors:gt:1000
```


## Sort Examples

Format: `field:direction`

```bash
createdAt:desc                        # Newest first
documentDate:asc                      # Oldest date first
totalTransactionAmountInMajors:desc   # Highest amount first
businessPartnerName:asc               # Alphabetical
```


## Workflow States

Select a document to view its workflow. Click "Advance State" to move through the lifecycle:

```
DRAFT > SUBMITTED > APPROVED > POSTED > PAID
```

Each state has accounting consequences:
- **DRAFT** - Document is being prepared; not yet visible to approvers
- **SUBMITTED** - Ready for review; locked from edits
- **APPROVED** - Approved for posting; financial commitment confirmed
- **POSTED** - Recorded in the ledger; affects financial statements
- **PAID** - Payment completed; cash flow updated


## SDK Configuration

```typescript
const client = new LightClient({
  seed: 123,        // Deterministic data
  latencyMs: 250,   // Simulated 250ms latency
  failRate: 0.02,   // 2% random failure rate
});
```

You may occasionally see errors due to the simulated failure rate - this is intentional for testing error handling.


## Sharp Edges (Intentional)

- **No offset pagination** - Use cursors or filters
- **No total count** - Use `hasMore` boolean
- **No backward transitions** - State machine is forward-only
- **422 on invalid moves** - With helpful error messages

These aren't missing features, they're design decisions with reasons.
---
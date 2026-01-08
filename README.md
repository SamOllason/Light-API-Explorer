# Light Faux SDK

A small, opinionated product-engineering artifact demonstrating API ergonomics, workflow-first UX, and thoughtful design for finance software.

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

These aren't missing features - they're design decisions with reasons.

## Loom Recording Guide (90 seconds or less)

1. Show filter/sort controls > apply a filter
2. Paginate with cursor > note "More results available"
3. Select document > advance through workflow states
4. Click "Intentional" badges > explain trade-offs
5. Mention: "This is how I think about API design"

---

Built as a portfolio piece for [Light](https://lightfi.com) to demonstrate product-engineer thinking.

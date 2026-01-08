# Architecture

## Overview

This is a **fake SDK** that simulates a REST API entirely client-side. No network calls, no backend, no secrets.

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (Client-Side)                                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Next.js App (apps/demo)                                   │ │
│  │                                                            │ │
│  │  const client = new LightClient({ latencyMs: 250 });       │ │
│  │  await client.accountingDocuments.list({ ... });           │ │
│  └──────────────────────┬─────────────────────────────────────┘ │
│                         │                                       │
│                         ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  @light-faux/sdk (packages/sdk)                            │ │
│  │                                                            │ │
│  │  ┌─────────────────┐  ┌─────────────────┐                  │ │
│  │  │ Simulated delay │  │ In-memory DB    │                  │ │
│  │  │ (configurable)  │  │ (seeded data)   │                  │ │
│  │  └─────────────────┘  └─────────────────┘                  │ │
│  │                                                            │ │
│  │  NO NETWORK CALLS - everything runs in-browser             │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## What the SDK Simulates

| Real API would...              | This SDK does...                          |
|--------------------------------|-------------------------------------------|
| `GET /accounting-documents`    | `client.accountingDocuments.list()`       |
| Network latency                | `await simulateLatency(ms)`               |
| Database query                 | Filter/sort in-memory array               |
| Occasional 500 errors          | `failRate` config (random failures)       |
| Cursor-based pagination        | Base64-encoded index position             |

## Key Files

```
packages/sdk/src/
├── client.ts          # LightClient entry point
├── types.ts           # TypeScript interfaces
├── db.ts              # Deterministic data generation (seeded)
├── filters.ts         # Filter parsing: "status:eq:DRAFT"
├── pagination.ts      # Cursor encode/decode (base64)
├── utils/
│   └── latency.ts     # Simulated network delay + failures
└── modules/
    ├── accountingDocuments.ts   # List/get documents
    └── invoicePayables.ts       # Create/advance with state machine
```

## Data Flow

```
1. UI calls:        client.accountingDocuments.list({ filter, sort, limit, cursor })
                                    │
2. Simulate delay:  await sleep(latencyMs)  // feels like network
                                    │
3. Parse filter:    "status:eq:DRAFT" → { field: 'status', op: 'eq', value: 'DRAFT' }
                                    │
4. Query in-memory: documents.filter(...).sort(...)
                                    │
5. Paginate:        slice by cursor position, return { data, nextCursor, prevCursor }
                                    │
6. Return:          { data: [...], hasMore: true, nextCursor: "MjA=" }
```

## Why This Architecture?

**Goal**: Demonstrate API ergonomics and UX thinking without infrastructure overhead.

- **Deterministic**: Same seed = same data. Reproducible demos.
- **Zero dependencies**: Clone → `pnpm i` → `pnpm dev:demo`. Done.
- **Honest simulation**: Latency and failures make it feel real.
- **Portable**: Share a Loom, reviewer can run it themselves in 30 seconds.

## State Machine (Invoice Payables)

```
DRAFT → SUBMITTED → APPROVED → POSTED → PAID
```

Transitions are **forward-only** and guarded. Invalid moves return helpful errors:

```typescript
// ❌ Can't skip states
await client.invoicePayables.setStatus(id, 'PAID');
// Error: Cannot transition from DRAFT to PAID. Next valid state: SUBMITTED

// ✅ Must advance sequentially
await client.invoicePayables.advance(id); // DRAFT → SUBMITTED
await client.invoicePayables.advance(id); // SUBMITTED → APPROVED
```

## Cursor vs Offset

We use **cursor pagination** intentionally. See copilot-instructions.md for rationale.

```
Cursor: "Give me records after this anchor point"
Offset: "Skip N records" (breaks when data changes)
```

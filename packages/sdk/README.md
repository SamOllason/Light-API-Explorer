# @light-faux/sdk

A tiny TypeScript fake SDK mirroring parts of the Light API. Designed for rapid prototyping, testing, and demos without any external network dependencies.

## Features

- 🎲 **Deterministic mock data** - Seeded PRNG ensures consistent data across runs
- 🔍 **Filter/sort parsing** - Familiar query syntax for filtering and sorting
- 📄 **Cursor-based pagination** - Modern pagination with `prevCursor`/`nextCursor`
- ⏱️ **Simulated latency** - Realistic API response times
- 💥 **Configurable failure rate** - Test error handling paths
- 🏭 **Zero network calls** - Everything runs locally

## Installation

```bash
pnpm add @light-faux/sdk
```

## Quick Start

```typescript
import { LightClient } from '@light-faux/sdk';

const client = new LightClient({
  seed: 123,        // Deterministic data generation
  latencyMs: 200,   // Simulated network latency (ms)
  failRate: 0.01,   // 1% random failure rate
});

// List documents
const { data, nextCursor, hasMore } = await client.accountingDocuments.list({
  filter: 'status:eq:DRAFT',
  sort: 'createdAt:desc',
  limit: 10,
});

// Paginate
if (nextCursor) {
  const nextPage = await client.accountingDocuments.list({
    cursor: nextCursor,
    limit: 10,
  });
}
```

## Filter Syntax

Format: `field:operator:value` (comma-separated for multiple)

### Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equals | `status:eq:DRAFT` |
| `neq` | Not equals | `status:neq:PAID` |
| `gt` | Greater than | `totalTransactionAmountInMajors:gt:1000` |
| `gte` | Greater than or equal | `totalTransactionAmountInMajors:gte:1000` |
| `lt` | Less than | `totalTransactionAmountInMajors:lt:5000` |
| `lte` | Less than or equal | `totalTransactionAmountInMajors:lte:5000` |
| `in` | In list (pipe-separated) | `status:in:DRAFT\|SUBMITTED` |
| `not_in` | Not in list | `documentType:not_in:JE\|CT` |
| `contains` | Contains substring | `businessPartnerName:contains:Acme` |
| `starts_with` | Starts with | `businessPartnerName:starts_with:Global` |

### Filterable Fields

- `status` - DRAFT, SUBMITTED, APPROVED, POSTED, PAID
- `documentType` - AP, AR, CT, JE
- `createdAt` - ISO datetime
- `documentDate` - ISO date
- `businessPartnerName` - String
- `totalTransactionAmountInMajors` - Number
- `currency` - USD, EUR, GBP, etc.

## Sort Syntax

Format: `field:direction` (comma-separated for multiple)

```typescript
// Single sort
{ sort: 'createdAt:desc' }

// Multiple sorts
{ sort: 'status:asc,createdAt:desc' }
```

## Cursor-Based Pagination

We use cursor-based pagination exclusively. The cursor is a base64-encoded start index.

```typescript
// First page
const page1 = await client.accountingDocuments.list({ limit: 10 });

// Next page
const page2 = await client.accountingDocuments.list({ 
  cursor: page1.nextCursor,
  limit: 10,
});

// Previous page
const prevPage = await client.accountingDocuments.list({
  cursor: page2.prevCursor,
  limit: 10,
});
```

### Why Cursor-Only? (No Offset)

Offset-based pagination has fundamental issues at scale:

1. **Performance** - `OFFSET 10000` still scans 10000 rows
2. **Inconsistency** - Items shift when data changes between requests
3. **No total counts** - We intentionally don't return `total` as it requires scanning all rows

Cursor-based pagination provides:
- O(1) performance regardless of page depth
- Stable results even when data changes
- Natural fit for infinite scroll UIs

## Invoice Payables Workflow

```typescript
// Create a new invoice
const invoice = await client.invoicePayables.create({
  businessPartnerName: 'Acme Corp',
  totalTransactionAmount: { amountInMajors: 5000, currency: 'USD' },
});
// invoice.status === 'DRAFT'

// Advance through workflow
await client.invoicePayables.advance(invoice.id); // → SUBMITTED
await client.invoicePayables.advance(invoice.id); // → APPROVED
await client.invoicePayables.advance(invoice.id); // → POSTED
await client.invoicePayables.advance(invoice.id); // → PAID

// Or set specific status (with validation)
await client.invoicePayables.setStatus(invoice.id, 'APPROVED');
```

### Status Transitions

```
DRAFT → SUBMITTED → APPROVED → POSTED → PAID
          ↓           ↓
        DRAFT    SUBMITTED (rejection paths)
```

## Error Handling

```typescript
try {
  await client.accountingDocuments.list({ filter: 'invalid:filter' });
} catch (error) {
  if (error.status === 422) {
    // Validation error - invalid filter/sort syntax
  }
  if (error.status === 404) {
    // Document not found
  }
  if (error.status === 400) {
    // Workflow error - invalid state transition
  }
}
```

## Sharp Edges (Intentional)

- **No offset pagination** - Use cursors
- **Filter validation returns 422** - Invalid field names or operators throw
- **No total counts** - Deprecated for performance; use `hasMore` instead
- **Strict workflow transitions** - Invalid state changes throw 400

## Development

```bash
# Build
pnpm build

# Watch mode
pnpm dev

# Type check
pnpm typecheck
```

## License

MIT

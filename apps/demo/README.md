# @light-faux/demo

A Next.js demo application showcasing the `@light-faux/sdk` capabilities.

See the live demo [here](https://samollason.github.io/Light-API-Explorer/).

## Features

- 🔍 **Filter documents** - Use the filter syntax to narrow down results
- 📊 **Sort documents** - Sort by various fields in ascending/descending order
- 📄 **Cursor pagination** - Navigate through pages with prev/next cursors
- 🔄 **Workflow visualization** - View and advance document status in real-time

## Running the Demo

```bash
# From the monorepo root
pnpm i
pnpm -r build
pnpm --filter @light-faux/demo dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Filter Examples

The filter input accepts the format: `field:operator:value`

### By Status
```
status:eq:DRAFT
status:in:DRAFT|SUBMITTED
status:not_in:PAID|POSTED
```

### By Business Partner
```
businessPartnerName:contains:Acme
businessPartnerName:starts_with:Global
```

### By Amount
```
totalTransactionAmountInMajors:gt:5000
totalTransactionAmountInMajors:lte:10000
```

### By Document Type
```
documentType:eq:AP
documentType:in:AP|AR
```

### Combined Filters
```
status:eq:DRAFT,documentType:eq:AP
status:in:DRAFT|SUBMITTED,totalTransactionAmountInMajors:gt:1000
```

## Sort Examples

The sort dropdown provides common options. The API accepts: `field:direction`

```
createdAt:desc          # Newest first
documentDate:asc        # Oldest date first
totalTransactionAmountInMajors:desc  # Highest amount first
businessPartnerName:asc  # Alphabetical
```

## Pagination

The demo uses cursor-based pagination:

- **Next**: Fetches the next page using `nextCursor`
- **Previous**: Fetches the previous page using `prevCursor`
- No offset support (intentional limitation)

## Workflow

Select a document to view its workflow status. Click "Advance State" to move the document through the lifecycle:

```
DRAFT → SUBMITTED → APPROVED → POSTED → PAID
```

Note: Changes are stored locally in the demo and don't persist across page reloads.

## SDK Configuration

The demo initializes the SDK with:

```typescript
const client = new LightClient({
  seed: 123,        // Deterministic data
  latencyMs: 250,   // Simulated 250ms latency
  failRate: 0.02,   // 2% random failure rate
});
```

You may occasionally see error messages due to the simulated failure rate - this is intentional for testing error handling.

# @light-demo/mock-sdk

Mock implementation of the Light API for Close Readiness Radar demo.

## Purpose

Provides a complete mock of Light's REST API including:
- Company entities & ledger accounts
- Invoice Receivables (AR) with `open` action
- Invoice Payables (AP) with approval workflow
- Card transactions with line-item categorization
- Products with default tax/ledger account settings

## Usage

```typescript
import { MockLightClient } from '@light-demo/mock-sdk';

const client = new MockLightClient();

// Fetch data
const entities = await client.listCompanyEntities();
const arInvoices = await client.listInvoiceReceivables();

// Perform actions
const opened = await client.openInvoiceReceivable('ar-uuid-123');
const updated = await client.updateCardTransactionLine('card-uuid-456', 'line-1', {
  accountId: 'acc-6000',
  taxCodeId: 'vat-20'
});
```

## Switching to Real API

See the `HttpLightClient` in `apps/web/lib/clientFactory.ts` for production usage with real Light API endpoints.

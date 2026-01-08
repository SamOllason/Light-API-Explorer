import type { ClientConfig } from './types.js';
import { createAccountingDocumentsModule, type AccountingDocumentsModule } from './modules/accountingDocuments.js';
import { createInvoicePayablesModule, type InvoicePayablesModule } from './modules/invoicePayables.js';

/**
 * Light Faux SDK Client
 * 
 * A fake SDK mirroring parts of the Light API for development and testing.
 * All data is generated deterministically based on the seed parameter.
 * 
 * @example
 * ```ts
 * const client = new LightClient({
 *   seed: 123,        // Deterministic data generation
 *   latencyMs: 200,   // Simulated network latency
 *   failRate: 0.01,   // 1% random failure rate
 * });
 * 
 * // List documents with filtering and pagination
 * const { data, nextCursor } = await client.accountingDocuments.list({
 *   filter: 'status:in:DRAFT|SUBMITTED',
 *   sort: 'createdAt:desc',
 *   limit: 10,
 * });
 * 
 * // Create and advance invoice payables
 * const invoice = await client.invoicePayables.create({
 *   businessPartnerName: 'Acme Corp',
 *   totalTransactionAmount: { amountInMajors: 5000, currency: 'USD' },
 * });
 * await client.invoicePayables.advance(invoice.id); // DRAFT → SUBMITTED
 * ```
 */
export class LightClient {
  /** Client configuration */
  readonly config: ClientConfig;

  /** Accounting documents module - list and query documents */
  readonly accountingDocuments: AccountingDocumentsModule;

  /** Invoice payables module - create and manage AP documents */
  readonly invoicePayables: InvoicePayablesModule;

  constructor(config: ClientConfig = {}) {
    this.config = {
      seed: config.seed ?? 42,
      latencyMs: config.latencyMs ?? 0,
      failRate: config.failRate ?? 0,
      apiKey: config.apiKey,
    };

    // Initialize modules
    this.accountingDocuments = createAccountingDocumentsModule(this.config);
    this.invoicePayables = createInvoicePayablesModule(this.config);
  }
}

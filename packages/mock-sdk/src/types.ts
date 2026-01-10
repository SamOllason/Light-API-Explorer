/**
 * Type definitions aligned with Light API documentation
 * Sources:
 * - https://docs.light.inc/api-reference/
 * - https://light.inc/
 */

/** Company entity (multi-entity support) */
export interface CompanyEntity {
  id: string;
  code: string; // e.g., "UK-01", "US-01"
  name: string; // e.g., "United Kingdom - HQ"
  localCurrency: 'GBP' | 'USD' | 'EUR';
  groupCurrency: 'USD';
}

/** Ledger account (chart of accounts) */
export interface LedgerAccount {
  id: string;
  companyEntityId: string;
  code: number; // e.g., 1000, 4000, 6000
  label: string; // e.g., "Cash", "Revenue", "Expenses"
  type: 'BANK' | 'REVENUE' | 'EXPENSE' | 'AR' | 'AP';
  fxFlag?: boolean; // true if needs FX revaluation
}

/** Ledger transaction line (immutable double-entry records) */
export interface LedgerTransactionLine {
  id: string;
  companyEntityId: string;
  documentType: 'AR' | 'AP' | 'CARD' | 'JOURNAL';
  documentNumber?: string; // e.g., "INV-00123"
  postingDate: string; // YYYY-MM-DD
  amounts: {
    localCurrency: string;
    localAmount: number;
    groupCurrency: string;
    groupAmount: number;
  };
  linkedInvoiceId?: string; // FK to AR/AP invoice
  description?: string;
}

/** Invoice Receivable (AR) - source: https://docs.light.inc/api-reference/v1--invoice-receivables */
export interface InvoiceReceivable {
  id: string;
  companyEntityId: string;
  state: 'DRAFT' | 'OPEN' | 'PAID';
  invoiceNumber?: string; // assigned when opened
  currency: string;
  amount: number;
  lines: InvoiceReceivableLine[];
}

export interface InvoiceReceivableLine {
  id: string;
  productId?: string;
  taxCodeId?: string;
  accountId?: string;
  quantity: number;
  netAmount: number;
}

/** Invoice Payable (AP) - source: https://docs.light.inc/api-reference/v1--invoice-payables */
export interface InvoicePayable {
  id: string;
  companyEntityId: string;
  state: 'INIT' | 'APPROVED' | 'PAID';
  vendorName: string;
  currency: string;
  amount: number;
}

/** Card transaction - source: https://docs.light.inc/api-reference/v1--card-transactions */
export interface CardTransaction {
  id: string;
  companyEntityId: string;
  merchant: {
    name: string;
    country?: string;
    mcc?: string;
  };
  currency: string;
  amount: number;
  lines: CardTransactionLine[];
}

export interface CardTransactionLine {
  id: string;
  accountId?: string; // null = unclassified
  taxCodeId?: string;
  costCenterId?: string;
  description?: string;
  netAmount: number;
}

/** Product (master data with defaults) - source: https://docs.light.inc/api-reference/products */
export interface Product {
  id: string;
  name: string;
  defaultTaxId?: string | null;
  defaultLedgerAccountId?: string | null;
}

/** Client interface (adapter for mock or real HTTP) */
export interface ILightClient {
  // Entities & ledger
  listCompanyEntities(): Promise<CompanyEntity[]>;
  listLedgerAccounts(): Promise<LedgerAccount[]>;
  listLedgerTransactionLines(): Promise<LedgerTransactionLine[]>;

  // AR
  listInvoiceReceivables(): Promise<InvoiceReceivable[]>;
  openInvoiceReceivable(id: string, opts?: { shouldSendEmail?: boolean }): Promise<InvoiceReceivable>;
  getInvoiceReceivable(id: string): Promise<InvoiceReceivable>;

  // AP
  listInvoicePayables(): Promise<InvoicePayable[]>;
  getInvoicePayable(id: string): Promise<InvoicePayable>;

  // Cards
  listCardTransactions(): Promise<CardTransaction[]>;
  getCardTransaction(id: string): Promise<CardTransaction>;
  updateCardTransactionLine(
    txId: string,
    lineId: string,
    patch: Partial<CardTransactionLine>
  ): Promise<CardTransactionLine>;

  // Products
  getProduct(id: string): Promise<Product>;
}

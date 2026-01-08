/** Sort direction */
export type Direction = 'asc' | 'desc';

/** Filter operators */
export type Operator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'not_in'
  | 'contains'
  | 'starts_with';

/** Document status lifecycle */
export type DocumentStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'POSTED'
  | 'PAID';

/** Document types */
export type DocumentType =
  | 'AP' // Accounts Payable
  | 'AR' // Accounts Receivable
  | 'CT' // Credit Transfer
  | 'JE'; // Journal Entry

/** Money representation */
export interface Money {
  amountInMajors: number;
  currency: string;
}

/** Accounting document entity */
export interface AccountingDocument {
  id: string;
  documentType: DocumentType;
  status: DocumentStatus;
  documentNumber: string;
  documentDate: string; // ISO date
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
  businessPartnerId: string;
  businessPartnerName: string;
  description: string;
  totalTransactionAmount: Money;
  lineItems: LineItem[];
}

/** Line item within a document */
export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: Money;
  totalAmount: Money;
  accountCode: string;
}

/** Sort specification */
export interface SortSpec {
  field: string;
  direction: Direction;
}

/** Filter specification */
export interface FilterSpec {
  field: string;
  operator: Operator;
  value: string | string[];
}

/** List request parameters */
export interface ListParams {
  filter?: string;
  sort?: string;
  limit?: number;
  cursor?: string;
}

/** Paginated list response */
export interface ListResponse<T> {
  data: T[];
  prevCursor: string | null;
  nextCursor: string | null;
  hasMore: boolean;
}

/** Client configuration */
export interface ClientConfig {
  seed?: number;
  latencyMs?: number;
  failRate?: number;
  apiKey?: string;
}

/** Input for creating an accounting document */
export interface CreateAccountingDocumentInput {
  documentType?: DocumentType;
  status?: DocumentStatus;
  documentNumber?: string;
  documentDate?: string;
  businessPartnerId?: string;
  businessPartnerName?: string;
  description?: string;
  totalTransactionAmount?: Money;
  lineItems?: Omit<LineItem, 'id'>[];
}

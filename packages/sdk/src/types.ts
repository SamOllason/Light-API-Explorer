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

/** Document status lifecycle (matches Light API) */
export type DocumentStatus =
  | 'INIT'       // Document created, being prepared
  | 'SUBMITTED'  // Sent for approval
  | 'APPROVED'   // Approved, ready for payment
  | 'PAID'       // Payment completed (terminal)
  | 'CANCELED'   // Canceled before approval (terminal)
  | 'DECLINED';  // Rejected by approver (terminal)

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

// ============================================
// Invoice Payables (matches Light API)
// ============================================

/** Invoice payable type */
export type InvoicePayableType = 'VENDOR_INVOICE' | 'REIMBURSEMENT' | 'CREDIT_NOTE';

/** Invoice payable metadata type */
export type InvoiceMetadataType = 'VENDOR_INVOICE_METADATA' | 'REIMBURSEMENT_METADATA';

/** Failure reason codes (Light API) */
export type FailureReason =
  | 'EMAIL_NOT_ALLOWED'
  | 'INVALID_DOCUMENT'
  | 'DUPLICATE_INVOICE'
  | 'VENDOR_NOT_FOUND'
  | 'AMOUNT_MISMATCH';

/** Error detail within failure/warning context */
export interface ContextError {
  type: string;
  message: string;
  path: string[];
  context: Record<string, unknown>;
}

/** Failure context (Light API structure) */
export interface FailureContext {
  name: string;
  type: 'BAD_REQUEST' | 'VALIDATION_ERROR' | 'BUSINESS_RULE_VIOLATION';
  errors: ContextError[];
}

/** Vendor details (Light API nested object) */
export interface Vendor {
  vendorId: string;
  vendorName: string;
  vendorEmail?: string;
  vendorWebsite?: string;
  vendorCountry?: string;
  vendorCity?: string;
  vendorAddress?: string;
  vendorZipcode?: string;
  vendorCurrency?: string;
  vatId?: string;
  vendorAvatarUrl?: string;
}

/** User who created/submitted the invoice */
export interface InvoiceUser {
  userId: string;
  userFirstName: string;
  userLastName: string;
  userAvatarUrl?: string;
}

/** Next approver in the workflow */
export interface NextApprover {
  userId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  notificationChannel?: 'EMAIL' | 'MS_TEAMS' | 'SLACK';
  approvalSentAt?: string;
}

/** Reimbursement details (when type is REIMBURSEMENT) */
export interface ReimbursementDetails {
  id: string;
  companyId: string;
  userId: string;
  expenseIds: string[];
  status: 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  createdAt: string;
}

/** Invoice payable entity (matches Light API structure) */
export interface InvoicePayable {
  id: string;
  type: InvoicePayableType;
  state: DocumentStatus;
  version: number;

  // Document info
  documentKey?: string;
  documentName: string;
  invoiceNumber?: string;

  // Vendor (nested object like Light API)
  vendor: Vendor;
  senderEmail?: string;
  companyId: string;
  companyEntityName: string;

  // Financial data
  amount: number;
  currency: string;
  dueDate?: string;
  issuedDate: string;
  paymentAt?: string;

  // Workflow
  user?: InvoiceUser;
  nextApprover?: NextApprover;
  approvalNote?: string;
  canceledAt?: string;
  cancellationReason?: string;
  declineReason?: string;

  // Failure handling (optional for demo)
  failureReason?: FailureReason;
  failureContext?: FailureContext;

  // Metadata
  metadata: {
    type: InvoiceMetadataType;
  };
  description: string;

  // Line items
  lineItems: LineItem[];

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/** Input for creating an invoice payable */
export interface CreateInvoicePayableInput {
  type?: InvoicePayableType;
  vendorName: string;
  vendorId?: string;
  amount: number;
  currency?: string;
  description?: string;
  dueDate?: string;
  issuedDate?: string;
  lineItems?: Omit<LineItem, 'id'>[];
  companyEntityName?: string;
}

/** Input for updating an invoice payable */
export interface UpdateInvoicePayableInput {
  vendorName?: string;
  amount?: number;
  currency?: string;
  description?: string;
  dueDate?: string;
  lineItems?: Omit<LineItem, 'id'>[];
}

/** Approval input */
export interface ApproveInvoiceInput {
  approvalNote?: string;
}

/** Decline input */
export interface DeclineInvoiceInput {
  declineReason: string;
}

/** Cancel input */
export interface CancelInvoiceInput {
  cancellationReason: string;
}

/** Document upload URL response */
export interface DocumentUploadUrl {
  uploadUrl: string;
  documentKey: string;
  expiresAt: string;
}

/** Linked credit note */
export interface LinkedCreditNote {
  id: string;
  creditNoteNumber: string;
  amount: Money;
  linkedAt: string;
  reason: string;
}

import type {
  InvoicePayable,
  DocumentStatus,
  CreateInvoicePayableInput,
  UpdateInvoicePayableInput,
  ApproveInvoiceInput,
  DeclineInvoiceInput,
  CancelInvoiceInput,
  DocumentUploadUrl,
  LinkedCreditNote,
  LineItem,
  ListParams,
  ListResponse,
  ClientConfig,
} from '../types.js';
import { simulateLatency } from '../utils/latency.js';
import { generateInvoicePayables } from '../db.js';

/**
 * State machine for Invoice Payables (matches Light API)
 *
 * INIT → SUBMITTED → APPROVED → PAID
 *   ↓        ↓
 * CANCELED  DECLINED
 *
 * Terminal states: PAID, CANCELED, DECLINED
 */
const STATE_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  INIT: ['SUBMITTED', 'CANCELED'],
  SUBMITTED: ['APPROVED', 'DECLINED', 'CANCELED'],
  APPROVED: ['PAID', 'CANCELED'],
  PAID: [],        // Terminal
  CANCELED: [],    // Terminal
  DECLINED: [],    // Terminal
};

/** States that can be advanced to the next step */
const ADVANCE_MAP: Partial<Record<DocumentStatus, DocumentStatus>> = {
  INIT: 'SUBMITTED',
  SUBMITTED: 'APPROVED',
  APPROVED: 'PAID',
};

/** Terminal states */
const TERMINAL_STATES: DocumentStatus[] = ['PAID', 'CANCELED', 'DECLINED'];

/** Pet shop company names for demo */
const PET_SHOP_COMPANIES = [
  'Paws & Claws Pet Emporium',
  'Happy Tails Pet Shop',
  'The Furry Friend Co.',
];

/**
 * Invoice Payables module
 * Full CRUD with workflow state management matching Light API
 */
export function createInvoicePayablesModule(config: ClientConfig) {
  // In-memory store for invoice payables
  const store = new Map<string, InvoicePayable>();
  // Credit notes linked to invoices
  const creditNotes = new Map<string, LinkedCreditNote[]>();
  let idCounter = 1;

  // Seed with deterministic data
  const seedData = generateInvoicePayables(100, config.seed ?? 42);
  for (const invoice of seedData) {
    store.set(invoice.id, invoice);
    // Update idCounter to avoid conflicts
    const numericId = parseInt(invoice.id.replace('inv-', ''), 10);
    if (numericId >= idCounter) {
      idCounter = numericId + 1;
    }
  }

  function generateId(): string {
    return `inv-${String(idCounter++).padStart(6, '0')}`;
  }

  function now(): string {
    return new Date().toISOString();
  }

  function generateDocumentKey(): string {
    return `doc-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
  }

  return {
    // ============================================
    // Core CRUD Operations
    // ============================================

    /**
     * Create a new invoice payable
     * POST /v1/bff/invoice-payables
     */
    async create(input: CreateInvoicePayableInput): Promise<InvoicePayable> {
      await simulateLatency(config.latencyMs, config.failRate);

      const id = generateId();
      const timestamp = now();
      const vendorId = input.vendorId ?? `vendor-${Math.random().toString(36).slice(2, 8)}`;

      const invoice: InvoicePayable = {
        id,
        type: input.type ?? 'VENDOR_INVOICE',
        state: 'INIT',
        version: 1,

        documentName: `INV-${Date.now()}`,
        documentKey: generateDocumentKey(),
        invoiceNumber: `INV-${Math.floor(Math.random() * 90000) + 10000}`,

        vendor: {
          vendorId,
          vendorName: input.vendorName,
        },
        companyId: `company-${config.seed ?? 1}`,
        companyEntityName: input.companyEntityName ?? PET_SHOP_COMPANIES[0],

        amount: input.amount,
        currency: input.currency ?? 'USD',
        dueDate: input.dueDate,
        issuedDate: input.issuedDate ?? timestamp.split('T')[0],

        metadata: {
          type: input.type === 'REIMBURSEMENT' ? 'REIMBURSEMENT_METADATA' : 'VENDOR_INVOICE_METADATA',
        },
        description: input.description ?? '',

        lineItems: (input.lineItems ?? []).map((item, i) => ({
          ...item,
          id: `${id}-li-${i}`,
        })),

        createdAt: timestamp,
        updatedAt: timestamp,
      };

      store.set(id, invoice);
      return invoice;
    },

    /**
     * Get an invoice payable by ID
     * GET /v1/bff/invoice-payables/{id}
     */
    async get(id: string): Promise<InvoicePayable> {
      await simulateLatency(config.latencyMs, config.failRate);

      const invoice = store.get(id);
      if (!invoice) {
        throw createNotFoundError(id);
      }
      return invoice;
    },

    /**
     * List invoice payables with filtering, sorting, and pagination
     * GET /v1/bff/invoice-payables
     */
    async list(params: ListParams = {}): Promise<ListResponse<InvoicePayable>> {
      await simulateLatency(config.latencyMs, config.failRate);

      let records = Array.from(store.values());

      // Simple state-based filtering
      if (params.filter) {
        const filterStr = params.filter.toLowerCase();
        if (filterStr.includes('state:eq:')) {
          const targetState = filterStr.split('state:eq:')[1]?.split(',')[0]?.toUpperCase();
          if (targetState) {
            records = records.filter(r => r.state === targetState);
          }
        } else if (filterStr.includes('state:in:')) {
          const statesStr = filterStr.split('state:in:')[1]?.split(',')[0];
          if (statesStr) {
            const states = statesStr.split('|').map(s => s.trim().toUpperCase());
            records = records.filter(r => states.includes(r.state));
          }
        }
      }

      // Simple sorting by field
      if (params.sort) {
        const [field, direction] = params.sort.split(':');
        records.sort((a, b) => {
          type SortableRecord = { [key: string]: unknown };
          const aVal = (a as unknown as SortableRecord)[field] ?? '';
          const bVal = (b as unknown as SortableRecord)[field] ?? '';
          const compare = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return direction === 'desc' ? -compare : compare;
        });
      }

      // Apply pagination
      const limit = params.limit ?? 20;
      const startIndex = params.cursor ? Number.parseInt(atob(params.cursor), 10) : 0;
      const endIndex = startIndex + limit;
      const paginatedRecords = records.slice(startIndex, endIndex);

      const hasMore = endIndex < records.length;
      const nextCursor = hasMore ? btoa(String(endIndex)) : null;
      const prevCursor = startIndex > 0 ? btoa(String(Math.max(0, startIndex - limit))) : null;

      return {
        data: paginatedRecords,
        hasMore,
        nextCursor,
        prevCursor,
      };
    },

    /**
     * Update an invoice payable (only in INIT state)
     * PATCH /v1/bff/invoice-payables/{id}
     */
    async update(id: string, input: UpdateInvoicePayableInput): Promise<InvoicePayable> {
      await simulateLatency(config.latencyMs, config.failRate);

      const invoice = store.get(id);
      if (!invoice) {
        throw createNotFoundError(id);
      }

      if (invoice.state !== 'INIT') {
        throw createWorkflowError(
          `Cannot update invoice ${id}: only INIT invoices can be updated. Current state: ${invoice.state}`,
          422
        );
      }

      // Apply updates
      if (input.vendorName !== undefined) invoice.vendor.vendorName = input.vendorName;
      if (input.amount !== undefined) invoice.amount = input.amount;
      if (input.currency !== undefined) invoice.currency = input.currency;
      if (input.description !== undefined) invoice.description = input.description;
      if (input.dueDate !== undefined) invoice.dueDate = input.dueDate;
      if (input.lineItems !== undefined) {
        invoice.lineItems = input.lineItems.map((item, i) => ({
          ...item,
          id: `${id}-li-${i}`,
        }));
      }

      invoice.version += 1;
      invoice.updatedAt = now();

      return invoice;
    },

    // ============================================
    // Workflow Actions
    // ============================================

    /**
     * Advance invoice to the next state in the happy path
     * INIT → SUBMITTED → APPROVED → PAID
     */
    async advance(id: string): Promise<InvoicePayable> {
      await simulateLatency(config.latencyMs, config.failRate);

      const invoice = store.get(id);
      if (!invoice) {
        throw createNotFoundError(id);
      }

      const nextState = ADVANCE_MAP[invoice.state];
      if (!nextState) {
        throw createWorkflowError(
          `Cannot advance invoice ${id}: already at terminal state '${invoice.state}'`,
          422
        );
      }

      invoice.state = nextState;
      invoice.version += 1;
      invoice.updatedAt = now();

      if (nextState === 'PAID') {
        invoice.paymentAt = now();
      }

      return invoice;
    },

    /**
     * Submit invoice for approval
     * Transitions: INIT → SUBMITTED
     */
    async submit(id: string): Promise<InvoicePayable> {
      await simulateLatency(config.latencyMs, config.failRate);

      const invoice = store.get(id);
      if (!invoice) {
        throw createNotFoundError(id);
      }

      if (invoice.state !== 'INIT') {
        throw createWorkflowError(
          `Cannot submit invoice ${id}: must be in INIT state. Current state: ${invoice.state}`,
          422
        );
      }

      invoice.state = 'SUBMITTED';
      invoice.version += 1;
      invoice.updatedAt = now();
      invoice.nextApprover = {
        userId: 'user-finance-01',
        firstName: 'Finance',
        lastName: 'Team',
        fullName: 'Finance Team',
        approvalSentAt: now(),
      };

      return invoice;
    },

    /**
     * Approve an invoice payable
     * POST /v1/bff/invoice-payables/{id}/approve
     * Transitions: SUBMITTED → APPROVED
     */
    async approve(id: string, input: ApproveInvoiceInput = {}): Promise<InvoicePayable> {
      await simulateLatency(config.latencyMs, config.failRate);

      const invoice = store.get(id);
      if (!invoice) {
        throw createNotFoundError(id);
      }

      if (invoice.state !== 'SUBMITTED') {
        throw createWorkflowError(
          `Cannot approve invoice ${id}: must be in SUBMITTED state. Current state: ${invoice.state}`,
          422
        );
      }

      invoice.state = 'APPROVED';
      invoice.version += 1;
      invoice.updatedAt = now();
      invoice.approvalNote = input.approvalNote;
      invoice.nextApprover = undefined;

      return invoice;
    },

    /**
     * Decline an invoice payable
     * POST /v1/bff/invoice-payables/{id}/decline
     * Transitions: SUBMITTED → DECLINED (terminal)
     */
    async decline(id: string, input: DeclineInvoiceInput): Promise<InvoicePayable> {
      await simulateLatency(config.latencyMs, config.failRate);

      const invoice = store.get(id);
      if (!invoice) {
        throw createNotFoundError(id);
      }

      if (invoice.state !== 'SUBMITTED') {
        throw createWorkflowError(
          `Cannot decline invoice ${id}: must be in SUBMITTED state. Current state: ${invoice.state}`,
          422
        );
      }

      invoice.state = 'DECLINED';
      invoice.version += 1;
      invoice.updatedAt = now();
      invoice.declineReason = input.declineReason;
      invoice.nextApprover = undefined;

      return invoice;
    },

    /**
     * Cancel an invoice payable
     * POST /v1/bff/invoice-payables/{id}/cancel
     * Transitions: INIT|SUBMITTED|APPROVED → CANCELED (terminal)
     */
    async cancel(id: string, input: CancelInvoiceInput): Promise<InvoicePayable> {
      await simulateLatency(config.latencyMs, config.failRate);

      const invoice = store.get(id);
      if (!invoice) {
        throw createNotFoundError(id);
      }

      if (TERMINAL_STATES.includes(invoice.state)) {
        throw createWorkflowError(
          `Cannot cancel invoice ${id}: already at terminal state '${invoice.state}'`,
          422
        );
      }

      invoice.state = 'CANCELED';
      invoice.version += 1;
      invoice.updatedAt = now();
      invoice.canceledAt = now();
      invoice.cancellationReason = input.cancellationReason;

      return invoice;
    },

    /**
     * Mark invoice as paid
     * Transitions: APPROVED → PAID (terminal)
     */
    async markPaid(id: string): Promise<InvoicePayable> {
      await simulateLatency(config.latencyMs, config.failRate);

      const invoice = store.get(id);
      if (!invoice) {
        throw createNotFoundError(id);
      }

      if (invoice.state !== 'APPROVED') {
        throw createWorkflowError(
          `Cannot mark invoice ${id} as paid: must be in APPROVED state. Current state: ${invoice.state}`,
          422
        );
      }

      invoice.state = 'PAID';
      invoice.version += 1;
      invoice.updatedAt = now();
      invoice.paymentAt = now();

      return invoice;
    },

    // ============================================
    // Line Items
    // ============================================

    /**
     * Create a line item for an invoice
     * POST /v1/bff/invoice-payables/{id}/line-items
     */
    async createLineItem(
      invoiceId: string,
      item: Omit<LineItem, 'id'>
    ): Promise<LineItem> {
      await simulateLatency(config.latencyMs, config.failRate);

      const invoice = store.get(invoiceId);
      if (!invoice) {
        throw createNotFoundError(invoiceId);
      }

      if (invoice.state !== 'INIT') {
        throw createWorkflowError(
          `Cannot add line item: invoice must be in INIT state. Current state: ${invoice.state}`,
          422
        );
      }

      const lineItem: LineItem = {
        ...item,
        id: `${invoiceId}-li-${invoice.lineItems.length}`,
      };

      invoice.lineItems.push(lineItem);
      invoice.version += 1;
      invoice.updatedAt = now();

      // Recalculate total
      invoice.amount = invoice.lineItems.reduce(
        (sum, li) => sum + li.totalAmount.amountInMajors,
        0
      );

      return lineItem;
    },

    /**
     * Get a line item by ID
     * GET /v1/bff/invoice-payables/{invoiceId}/line-items/{lineItemId}
     */
    async getLineItem(invoiceId: string, lineItemId: string): Promise<LineItem> {
      await simulateLatency(config.latencyMs, config.failRate);

      const invoice = store.get(invoiceId);
      if (!invoice) {
        throw createNotFoundError(invoiceId);
      }

      const lineItem = invoice.lineItems.find((li) => li.id === lineItemId);
      if (!lineItem) {
        throw createNotFoundError(lineItemId, 'Line item');
      }

      return lineItem;
    },

    /**
     * Update a line item
     * PUT /v1/bff/invoice-payables/{invoiceId}/line-items/{lineItemId}
     */
    async updateLineItem(
      invoiceId: string,
      lineItemId: string,
      updates: Partial<Omit<LineItem, 'id'>>
    ): Promise<LineItem> {
      await simulateLatency(config.latencyMs, config.failRate);

      const invoice = store.get(invoiceId);
      if (!invoice) {
        throw createNotFoundError(invoiceId);
      }

      if (invoice.state !== 'INIT') {
        throw createWorkflowError(
          `Cannot update line item: invoice must be in INIT state. Current state: ${invoice.state}`,
          422
        );
      }

      const index = invoice.lineItems.findIndex((li) => li.id === lineItemId);
      if (index === -1) {
        throw createNotFoundError(lineItemId, 'Line item');
      }

      invoice.lineItems[index] = { ...invoice.lineItems[index], ...updates };
      invoice.version += 1;
      invoice.updatedAt = now();

      // Recalculate total
      invoice.amount = invoice.lineItems.reduce(
        (sum, li) => sum + li.totalAmount.amountInMajors,
        0
      );

      return invoice.lineItems[index];
    },

    /**
     * Delete a line item
     * DELETE /v1/bff/invoice-payables/{invoiceId}/line-items/{lineItemId}
     */
    async deleteLineItem(invoiceId: string, lineItemId: string): Promise<void> {
      await simulateLatency(config.latencyMs, config.failRate);

      const invoice = store.get(invoiceId);
      if (!invoice) {
        throw createNotFoundError(invoiceId);
      }

      if (invoice.state !== 'INIT') {
        throw createWorkflowError(
          `Cannot delete line item: invoice must be in INIT state. Current state: ${invoice.state}`,
          422
        );
      }

      const index = invoice.lineItems.findIndex((li) => li.id === lineItemId);
      if (index === -1) {
        throw createNotFoundError(lineItemId, 'Line item');
      }

      invoice.lineItems.splice(index, 1);
      invoice.version += 1;
      invoice.updatedAt = now();

      // Recalculate total
      invoice.amount = invoice.lineItems.reduce(
        (sum, li) => sum + li.totalAmount.amountInMajors,
        0
      );
    },

    // ============================================
    // Document Management
    // ============================================

    /**
     * Generate a document upload URL
     * POST /v1/bff/invoice-payables/{id}/upload-url
     */
    async generateUploadUrl(id: string): Promise<DocumentUploadUrl> {
      await simulateLatency(config.latencyMs, config.failRate);

      const invoice = store.get(id);
      if (!invoice) {
        throw createNotFoundError(id);
      }

      const documentKey = generateDocumentKey();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

      return {
        uploadUrl: `https://storage.example.com/upload/${documentKey}?expires=${expiresAt}`,
        documentKey,
        expiresAt,
      };
    },

    /**
     * Get the invoice document URL
     * GET /v1/bff/invoice-payables/{id}/document
     */
    async getDocument(id: string): Promise<{ documentUrl: string; documentKey: string }> {
      await simulateLatency(config.latencyMs, config.failRate);

      const invoice = store.get(id);
      if (!invoice) {
        throw createNotFoundError(id);
      }

      return {
        documentUrl: `https://storage.example.com/documents/${invoice.documentKey}`,
        documentKey: invoice.documentKey ?? generateDocumentKey(),
      };
    },

    /**
     * Get linked credit notes for an invoice
     * GET /v1/bff/invoice-payables/{id}/credit-notes
     */
    async getLinkedCreditNotes(id: string): Promise<LinkedCreditNote[]> {
      await simulateLatency(config.latencyMs, config.failRate);

      const invoice = store.get(id);
      if (!invoice) {
        throw createNotFoundError(id);
      }

      return creditNotes.get(id) ?? [];
    },

    // ============================================
    // Helpers for testing/demo
    // ============================================

    /** Clear all invoices (for testing) */
    _clear(): void {
      store.clear();
      creditNotes.clear();
      idCounter = 1;
    },

    /** Get store size (for testing) */
    _size(): number {
      return store.size;
    },

    /** Seed with demo data */
    _seed(invoices: InvoicePayable[]): void {
      for (const inv of invoices) {
        store.set(inv.id, inv);
      }
    },
  };
}

// ============================================
// Error Helpers
// ============================================

function createNotFoundError(id: string, entity = 'Invoice'): Error & { status: number } {
  const error = new Error(`${entity} not found: ${id}`) as Error & { status: number };
  error.status = 404;
  return error;
}

function createWorkflowError(message: string, status = 422): Error & { status: number } {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
}

export type InvoicePayablesModule = ReturnType<typeof createInvoicePayablesModule>;

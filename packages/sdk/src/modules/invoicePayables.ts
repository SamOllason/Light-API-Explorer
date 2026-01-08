import type {
  AccountingDocument,
  DocumentStatus,
  CreateAccountingDocumentInput,
  ClientConfig,
} from '../types.js';
import { simulateLatency } from '../utils/latency.js';

/** Valid status transitions (forward only) */
const STATUS_ORDER: DocumentStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'PAID'];

/** Valid transitions map for strict validation */
const VALID_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['APPROVED', 'DRAFT'], // Can reject back to DRAFT
  APPROVED: ['POSTED', 'SUBMITTED'], // Can reject back to SUBMITTED
  POSTED: ['PAID'],
  PAID: [], // Terminal state
};

/**
 * Invoice Payables module
 * Provides CRUD operations with workflow state management
 */
export function createInvoicePayablesModule(config: ClientConfig) {
  // In-memory store for created/modified documents
  const store = new Map<string, AccountingDocument>();
  let idCounter = 1;

  /**
   * Generate a unique document ID
   */
  function generateId(): string {
    return `inv-${String(idCounter++).padStart(6, '0')}`;
  }

  /**
   * Get current ISO timestamp
   */
  function now(): string {
    return new Date().toISOString();
  }

  return {
    /**
     * Create a new invoice payable document
     * Defaults to documentType: 'AP' and status: 'DRAFT'
     */
    async create(input: CreateAccountingDocumentInput = {}): Promise<AccountingDocument> {
      await simulateLatency(config.latencyMs, config.failRate);

      const id = generateId();
      const timestamp = now();

      const doc: AccountingDocument = {
        id,
        documentType: input.documentType ?? 'AP',
        status: input.status ?? 'DRAFT',
        documentNumber: input.documentNumber ?? `AP-${Date.now()}`,
        documentDate: input.documentDate ?? timestamp.split('T')[0],
        createdAt: timestamp,
        updatedAt: timestamp,
        businessPartnerId: input.businessPartnerId ?? 'bp-0000',
        businessPartnerName: input.businessPartnerName ?? 'Unknown Vendor',
        description: input.description ?? '',
        totalTransactionAmount: input.totalTransactionAmount ?? {
          amountInMajors: 0,
          currency: 'USD',
        },
        lineItems: (input.lineItems ?? []).map((item, i) => ({
          ...item,
          id: `${id}-li-${i}`,
        })),
      };

      store.set(id, doc);
      return doc;
    },

    /**
     * Get a document from the store by ID
     */
    async get(id: string): Promise<AccountingDocument | null> {
      await simulateLatency(config.latencyMs, config.failRate);
      return store.get(id) ?? null;
    },

    /**
     * List all documents in the store
     */
    async list(): Promise<AccountingDocument[]> {
      await simulateLatency(config.latencyMs, config.failRate);
      return Array.from(store.values());
    },

    /**
     * Advance document to the next status in the workflow
     * Follows strict forward transitions: DRAFT → SUBMITTED → APPROVED → POSTED → PAID
     * 
     * @throws Error if document not found or already at terminal state
     */
    async advance(id: string): Promise<AccountingDocument> {
      await simulateLatency(config.latencyMs, config.failRate);

      const doc = store.get(id);
      if (!doc) {
        throw createNotFoundError(id);
      }

      const currentIndex = STATUS_ORDER.indexOf(doc.status);
      if (currentIndex === -1 || currentIndex === STATUS_ORDER.length - 1) {
        throw createWorkflowError(
          `Cannot advance document ${id}: already at terminal status '${doc.status}'`
        );
      }

      const nextStatus = STATUS_ORDER[currentIndex + 1];
      doc.status = nextStatus;
      doc.updatedAt = now();

      return doc;
    },

    /**
     * Set document status with validation
     * Only allows valid transitions based on current status
     * 
     * @throws Error if transition is invalid
     */
    async setStatus(id: string, newStatus: DocumentStatus): Promise<AccountingDocument> {
      await simulateLatency(config.latencyMs, config.failRate);

      const doc = store.get(id);
      if (!doc) {
        throw createNotFoundError(id);
      }

      const allowedTransitions = VALID_TRANSITIONS[doc.status];
      if (!allowedTransitions.includes(newStatus)) {
        throw createWorkflowError(
          `Invalid status transition: '${doc.status}' → '${newStatus}'. ` +
            `Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`
        );
      }

      doc.status = newStatus;
      doc.updatedAt = now();

      return doc;
    },

    /**
     * Delete a document from the store
     * Only DRAFT documents can be deleted
     */
    async delete(id: string): Promise<void> {
      await simulateLatency(config.latencyMs, config.failRate);

      const doc = store.get(id);
      if (!doc) {
        throw createNotFoundError(id);
      }

      if (doc.status !== 'DRAFT') {
        throw createWorkflowError(
          `Cannot delete document ${id}: only DRAFT documents can be deleted`
        );
      }

      store.delete(id);
    },

    /** Clear all documents from the store (for testing) */
    _clear(): void {
      store.clear();
      idCounter = 1;
    },
  };
}

function createNotFoundError(id: string): Error {
  const error = new Error(`Document not found: ${id}`) as Error & { status: number };
  error.status = 404;
  return error;
}

function createWorkflowError(message: string): Error {
  const error = new Error(message) as Error & { status: number };
  error.status = 400;
  return error;
}

export type InvoicePayablesModule = ReturnType<typeof createInvoicePayablesModule>;

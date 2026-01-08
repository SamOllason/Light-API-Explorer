import type { AccountingDocument, ListParams, ListResponse, ClientConfig } from '../types.js';
import { generateDocuments } from '../db.js';
import { parseFilter, parseSort, applyFilters, applySort } from '../filters.js';
import { cursorPaginate } from '../pagination.js';
import { simulateLatency } from '../utils/latency.js';

/**
 * Accounting Documents module
 * Provides list functionality with filtering, sorting, and cursor-based pagination
 */
export function createAccountingDocumentsModule(config: ClientConfig) {
  // Generate deterministic dataset on module creation
  const documents = generateDocuments(500, config.seed ?? 42);

  return {
    /**
     * List accounting documents with filtering, sorting, and pagination
     * 
     * @param params.filter - Filter string: "field:operator:value,..."
     * @param params.sort - Sort string: "field:direction,..."
     * @param params.limit - Number of items per page (default: 25, max: 100)
     * @param params.cursor - Base64-encoded cursor for pagination
     * 
     * @example
     * // Filter by status
     * await client.accountingDocuments.list({ filter: 'status:eq:DRAFT' })
     * 
     * // Filter with multiple values
     * await client.accountingDocuments.list({ filter: 'status:in:DRAFT|SUBMITTED' })
     * 
     * // Sort by date descending
     * await client.accountingDocuments.list({ sort: 'createdAt:desc' })
     * 
     * // Combine filter, sort, and pagination
     * await client.accountingDocuments.list({
     *   filter: 'status:eq:APPROVED',
     *   sort: 'documentDate:desc',
     *   limit: 10,
     *   cursor: 'MTAw' // base64 of "100"
     * })
     */
    async list(params: ListParams = {}): Promise<ListResponse<AccountingDocument>> {
      await simulateLatency(config.latencyMs, config.failRate);

      const { filter, sort, limit = 25, cursor } = params;

      // Parse and validate filter/sort
      const filterSpecs = parseFilter(filter);
      const sortSpecs = parseSort(sort);

      // Apply filters
      let result = applyFilters(documents, filterSpecs);

      // Apply sorting
      result = applySort(result, sortSpecs);

      // Clamp limit to reasonable bounds
      const clampedLimit = Math.min(Math.max(1, limit), 100);

      // Apply cursor-based pagination
      return cursorPaginate(result, clampedLimit, cursor);
    },

    /**
     * Get a single accounting document by ID
     */
    async get(id: string): Promise<AccountingDocument | null> {
      await simulateLatency(config.latencyMs, config.failRate);
      return documents.find((doc) => doc.id === id) ?? null;
    },
  };
}

export type AccountingDocumentsModule = ReturnType<typeof createAccountingDocumentsModule>;

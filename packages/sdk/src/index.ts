// Main client export
export { LightClient } from './client.js';

// Type exports
export type {
  // Core types
  Direction,
  Operator,
  DocumentStatus,
  DocumentType,
  Money,
  AccountingDocument,
  LineItem,
  
  // Request/Response types
  SortSpec,
  FilterSpec,
  ListParams,
  ListResponse,
  
  // Configuration
  ClientConfig,
  CreateAccountingDocumentInput,
} from './types.js';

// Utility exports (for advanced usage)
export { encodeCursor, decodeCursor, cursorPaginate } from './pagination.js';
export { parseFilter, parseSort, applyFilters, applySort } from './filters.js';
export { generateDocuments } from './db.js';
export { simulateLatency } from './utils/latency.js';

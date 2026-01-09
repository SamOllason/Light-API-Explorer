'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  LightClient,
  type AccountingDocument,
  type ListResponse,
  type DocumentStatus,
} from '@light-faux/sdk';

/** Design decision explanations */
const DESIGN_NOTES = {
  cursorPagination: {
    title: 'Cursor Pagination',
    description: 'We use cursor-based pagination instead of offset. Offset breaks when records are inserted or deleted—you skip items or see duplicates. Cursor guarantees stable navigation by anchoring to a specific record.',
    tradeoff: 'Trade-off: You can\'t jump to "page 47." That\'s intentional—if you need that, use filters instead.',
  },
  filterSyntax: {
    title: 'Filter Syntax',
    description: 'Filters use field:operator:value syntax (e.g., status:eq:DRAFT). This mirrors how modern APIs like Stripe handle filtering—explicit, composable, and type-safe.',
    tradeoff: 'Trade-off: Slightly more verbose than ?status=DRAFT, but supports complex queries without ambiguity.',
  },
  stateMachine: {
    title: 'Forward-Only Transitions',
    description: 'Documents follow a strict state machine: DRAFT → SUBMITTED → APPROVED → POSTED → PAID. You cannot skip states or go backward. This reflects real accounting controls.',
    tradeoff: 'Trade-off: Less flexible, but prevents invalid states that would break audit trails.',
  },
  noTotal: {
    title: 'No Total Count',
    description: 'We deliberately don\'t return a total count. COUNT(*) is expensive at scale and often misleading (the count changes as you paginate). "More results available" is more honest.',
    tradeoff: 'Trade-off: No "Page 1 of 47" UI. Use filters to narrow results instead.',
  },
} as const;

/** Design decision badge with tooltip */
function DesignBadge({ noteKey, className = '' }: { noteKey: keyof typeof DESIGN_NOTES; className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const note = DESIGN_NOTES[noteKey];
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isOpen]);

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors cursor-pointer whitespace-nowrap"
        aria-label={`Design note: ${note.title}`}
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        Intentional
      </button>
      {isOpen && (
        <div
          ref={tooltipRef}
          className="absolute z-50 bottom-full left-0 mb-2 w-72 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-xl"
        >
          <div className="font-semibold text-amber-400 mb-1">{note.title}</div>
          <p className="text-gray-200 mb-2">{note.description}</p>
          <p className="text-gray-400 text-xs italic">{note.tradeoff}</p>
          <div className="absolute bottom-0 left-4 translate-y-full">
            <div className="border-8 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}
    </span>
  );
}

// Initialize client once
const client = new LightClient({
  seed: 123,
  latencyMs: 250,
  failRate: 0.02,
});

/** Status color mapping */
const STATUS_COLORS: Record<DocumentStatus, string> = {
  DRAFT: 'chip-gray',
  SUBMITTED: 'chip-blue',
  APPROVED: 'chip-yellow',
  POSTED: 'chip-purple',
  PAID: 'chip-green',
};

/** Document type labels */
const DOC_TYPE_LABELS: Record<string, string> = {
  AP: 'Accounts Payable',
  AR: 'Accounts Receivable',
  CT: 'Credit Transfer',
  JE: 'Journal Entry',
};

/** Format currency amount */
function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/** Format date for display */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Status chip component */
function StatusChip({ status }: { status: DocumentStatus }) {
  return <span className={STATUS_COLORS[status]}>{status}</span>;
}

/** Workflow panel for selected document */
function WorkflowPanel({
  doc,
  onAdvance,
  isAdvancing,
}: {
  doc: AccountingDocument | null;
  onAdvance: () => void;
  isAdvancing: boolean;
}) {
  if (!doc) {
    return (
      <div className="card p-6 h-full flex items-center justify-center text-gray-500">
        Select a document to view workflow
      </div>
    );
  }

  const statuses: DocumentStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'PAID'];
  const currentIndex = statuses.indexOf(doc.status);
  const isTerminal = doc.status === 'PAID';

  return (
    <div className="card p-6 h-full">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Workflow</h2>
      
      {/* Document Details */}
      <div className="space-y-3 mb-6">
        <div>
          <span className="text-sm text-gray-500">Document Number</span>
          <p className="font-medium">{doc.documentNumber}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Type</span>
          <p className="font-medium">{DOC_TYPE_LABELS[doc.documentType]}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Business Partner</span>
          <p className="font-medium">{doc.businessPartnerName}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Amount</span>
          <p className="font-medium">
            {formatMoney(
              doc.totalTransactionAmount.amountInMajors,
              doc.totalTransactionAmount.currency
            )}
          </p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Current Status</span>
          <p className="mt-1">
            <StatusChip status={doc.status} />
          </p>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Status Timeline
          <DesignBadge noteKey="stateMachine" className="ml-2" />
        </h3>
        <div className="flex items-center space-x-2">
          {statuses.map((status, index) => (
            <div key={status} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  index <= currentIndex
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {index + 1}
              </div>
              {index < statuses.length - 1 && (
                <div
                  className={`w-6 h-0.5 ${
                    index < currentIndex ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          {statuses.map((status) => (
            <span key={status} className="w-8 text-center">
              {status.slice(0, 3)}
            </span>
          ))}
        </div>
      </div>

      {/* Advance Button */}
      <button
        onClick={onAdvance}
        disabled={isTerminal || isAdvancing}
        className="btn-primary w-full"
      >
        {isAdvancing
          ? 'Advancing...'
          : isTerminal
          ? 'Workflow Complete'
          : `Advance to ${statuses[currentIndex + 1]}`}
      </button>
    </div>
  );
}

/** Main page component */
export default function HomePage() {
  // Filter/sort/pagination state
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState('createdAt:desc');
  const [limit, setLimit] = useState(10);
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  // Response and UI state
  const [response, setResponse] = useState<ListResponse<AccountingDocument> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<AccountingDocument | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);

  // In-memory store for advanced documents (to track state changes)
  const [advancedDocs, setAdvancedDocs] = useState<Map<string, AccountingDocument>>(new Map());

  // Fetch documents
  const fetchDocuments = useCallback(async (newCursor?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await client.accountingDocuments.list({
        filter: filter || undefined,
        sort: sort || undefined,
        limit,
        cursor: newCursor,
      });
      setResponse(result);
      setCursor(newCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }, [filter, sort, limit]);

  // Initial fetch
  useEffect(() => {
    fetchDocuments();
  }, []);

  // Handle search with current filters
  const handleSearch = () => {
    setCursor(undefined);
    fetchDocuments(undefined);
  };

  // Get document with potential local overrides
  const getDisplayDoc = useCallback(
    (doc: AccountingDocument): AccountingDocument => {
      return advancedDocs.get(doc.id) ?? doc;
    },
    [advancedDocs]
  );

  // Handle advancing document state
  const handleAdvance = async () => {
    if (!selectedDoc) return;

    setIsAdvancing(true);
    try {
      // Create in invoicePayables if not exists, then advance
      const currentDoc = getDisplayDoc(selectedDoc);
      
      // For demo: create a copy and advance locally
      const statuses: DocumentStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'PAID'];
      const currentIndex = statuses.indexOf(currentDoc.status);
      
      if (currentIndex < statuses.length - 1) {
        const advancedDoc: AccountingDocument = {
          ...currentDoc,
          status: statuses[currentIndex + 1],
          updatedAt: new Date().toISOString(),
        };
        
        setAdvancedDocs((prev) => new Map(prev).set(advancedDoc.id, advancedDoc));
        setSelectedDoc(advancedDoc);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to advance document');
    } finally {
      setIsAdvancing(false);
    }
  };

  // Documents with local overrides applied
  const displayDocs = useMemo(() => {
    return response?.data.map(getDisplayDoc) ?? [];
  }, [response?.data, getDisplayDoc]);

  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-primary-100 text-primary-700">
              Learning Tool
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Light API Explorer
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            An interactive demo to understand the{' '}
            <a
              href="https://docs.light.inc/getting-started/introduction"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 underline underline-offset-2"
            >
              Light API
            </a>
            {' '}— filters, cursor pagination, and workflow state machines.
            <span className="hidden sm:inline text-gray-400 ml-1">(No real API calls—runs entirely in-browser)</span>
          </p>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            See the GitHub repo{' '}
            <a href="https://github.com/SamOllason/Light-API-Explorer" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 underline underline-offset-2">
              here
            </a>
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Controls + List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Controls */}
            <div className="card p-3 sm:p-4">
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                <div>
                  <label className="label">Filter</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="status:eq:DRAFT"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Sort</label>
                  <select
                    className="select"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="createdAt:desc">Created (Newest)</option>
                    <option value="createdAt:asc">Created (Oldest)</option>
                    <option value="documentDate:desc">Doc Date (Newest)</option>
                    <option value="documentDate:asc">Doc Date (Oldest)</option>
                    <option value="totalTransactionAmountInMajors:desc">Amount (High-Low)</option>
                    <option value="totalTransactionAmountInMajors:asc">Amount (Low-High)</option>
                    <option value="businessPartnerName:asc">Partner (A-Z)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Limit</label>
                  <select
                    className="select"
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={handleSearch} className="btn-primary w-full">
                    Search
                  </button>
                </div>
              </div>
              
              {/* Filter Presets - clickable to learn syntax */}
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs text-gray-500 self-center">Try:</span>
                {[
                  { label: 'Drafts', value: 'status:eq:DRAFT' },
                  { label: 'Pending', value: 'status:in:DRAFT|SUBMITTED' },
                  { label: 'High value', value: 'totalTransactionAmountInMajors:gt:5000' },
                  { label: 'Acme', value: 'businessPartnerName:contains:Acme' },
                  { label: 'Payables', value: 'documentType:eq:AP' },
                  { label: 'Clear', value: '' },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setFilter(preset.value)}
                    className={`px-2 py-1 text-xs rounded-full transition-colors ${
                      filter === preset.value
                        ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
                <DesignBadge noteKey="filterSyntax" />
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="badge-error p-4 rounded-lg">
                <strong>Error:</strong> {error}
              </div>
            )}

            {/* Document List */}
            <div className="card">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">
                  Accounting Documents
                  {loading && <span className="ml-2 text-gray-500">(Loading...)</span>}
                </h2>
              </div>

              {displayDocs.length === 0 && !loading ? (
                <div className="p-8 text-center text-gray-500">
                  No documents found. Try adjusting your filters.
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {displayDocs.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedDoc?.id === doc.id ? 'bg-primary-50 border-l-4 border-primary-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">{doc.documentNumber}</span>
                            <span className="chip-gray text-xs">{doc.documentType}</span>
                            <StatusChip status={doc.status} />
                          </div>
                          <p className="text-sm text-gray-600 truncate">{doc.businessPartnerName}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(doc.documentDate)} · {doc.description}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-medium text-gray-900">
                            {formatMoney(
                              doc.totalTransactionAmount.amountInMajors,
                              doc.totalTransactionAmount.currency
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {response && (
                <div className="p-4 border-t border-gray-200">
                  {/* Mobile: stacked layout */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center justify-between sm:justify-start gap-2 order-2 sm:order-1">
                      <button
                        onClick={() => fetchDocuments(response.prevCursor ?? undefined)}
                        disabled={!response.prevCursor || loading}
                        className="btn-secondary btn-sm"
                      >
                        ← Prev
                      </button>
                      <button
                        onClick={() => fetchDocuments(response.nextCursor ?? undefined)}
                        disabled={!response.nextCursor || loading}
                        className="btn-secondary btn-sm"
                      >
                        Next →
                      </button>
                    </div>
                    <div className="text-sm text-gray-600 order-1 sm:order-2 text-center sm:text-left">
                      {response.hasMore ? 'More results available' : 'End of results'}
                    </div>
                    <div className="flex items-center justify-center sm:justify-end gap-1 order-3">
                      <DesignBadge noteKey="cursorPagination" />
                      <DesignBadge noteKey="noTotal" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Workflow */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <WorkflowPanel
                doc={selectedDoc ? getDisplayDoc(selectedDoc) : null}
                onAdvance={handleAdvance}
                isAdvancing={isAdvancing}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

/**
 * Ledger Lens - Shows ledger transaction lines with "Explain Posting" feature
 * 
 * Click any line to see the full trail: invoice line → product defaults → GL posting
 */

import { useEffect, useState } from 'react';
import type { LedgerTransactionLine, InvoiceReceivable, Product } from '@light-demo/mock-sdk';

export default function LedgerPage() {
  const [ledgerLines, setLedgerLines] = useState<LedgerTransactionLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLine, setSelectedLine] = useState<LedgerTransactionLine | null>(null);

  useEffect(() => {
    const fetchLedger = async () => {
      setLoading(true);
      try {
        const { createLightClient } = await import('../../lib/clientFactory');
        const client = createLightClient();
        const lines = await client.listLedgerTransactionLines();
        setLedgerLines(lines);
      } catch (error) {
        console.error('Failed to fetch ledger:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLedger();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8 border-b border-gray-200 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Ledger Lens</h1>
              <p className="text-sm text-gray-600 mt-1">
                General ledger transaction lines — click any row to explain the posting
              </p>
            </div>
            <a
              href="/"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              ← Back to Readiness
            </a>
          </div>
        </header>

        {/* Ledger Table */}
        <div className="flex gap-6">
          <div className={`${selectedLine ? 'w-2/3' : 'w-full'} transition-all duration-300`}>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Document
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Description
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Local Amount
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Group Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                          Loading ledger lines...
                        </td>
                      </tr>
                    ) : ledgerLines.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                          No ledger lines found
                        </td>
                      </tr>
                    ) : (
                      ledgerLines.map((line) => (
                        <tr
                          key={line.id}
                          onClick={() => setSelectedLine(line)}
                          className={`cursor-pointer hover:bg-primary-50 transition-colors ${
                            selectedLine?.id === line.id ? 'bg-primary-50' : ''
                          }`}
                        >
                          <td className="px-4 py-3 text-gray-900 font-mono text-xs">
                            {line.postingDate}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-gray-900 font-medium">{line.documentNumber || '—'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="chip chip-blue">{line.documentType}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                            {line.description || '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-gray-900">
                            {line.amounts.localCurrency} {line.amounts.localAmount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-gray-900">
                            {line.amounts.groupCurrency} {line.amounts.groupAmount.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Explain Panel */}
          {selectedLine && (
            <div className="w-1/3">
              <ExplainPanel line={selectedLine} onClose={() => setSelectedLine(null)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Explain Posting Panel - shows the trail from invoice → product → GL */
function ExplainPanel({
  line,
  onClose,
}: {
  line: LedgerTransactionLine;
  onClose: () => void;
}) {
  const [invoice, setInvoice] = useState<InvoiceReceivable | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const { createLightClient } = await import('../../lib/clientFactory');
        const client = createLightClient();

        // If linked to invoice, fetch it
        if (line.linkedInvoiceId) {
          const inv = await client.getInvoiceReceivable(line.linkedInvoiceId);
          setInvoice(inv);

          // Get product from first line
          if (inv.lines[0]?.productId) {
            const prod = await client.getProduct(inv.lines[0].productId);
            setProduct(prod);
          }
        }
      } catch (error) {
        console.error('Failed to fetch details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [line.linkedInvoiceId]);

  return (
    <div className="card p-6 sticky top-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-semibold text-gray-900">Explain Posting</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading details...</div>
      ) : (
        <div className="space-y-6">
          {/* Ledger Line */}
          <section>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              GL Transaction Line
            </div>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Document:</span>
                <span className="font-medium text-gray-900">{line.documentNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Type:</span>
                <span className="chip chip-blue text-xs">{line.documentType}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Posted:</span>
                <span className="font-mono text-gray-900">{line.postingDate}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Amount:</span>
                <span className="font-mono font-semibold text-gray-900">
                  {line.amounts.localCurrency} {line.amounts.localAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </section>

          {/* Trail Arrow */}
          <div className="flex items-center justify-center text-gray-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>

          {/* Invoice Line */}
          {invoice ? (
            <section>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Source: Invoice Line
              </div>
              <div className="bg-primary-50 rounded-lg p-4 space-y-2 border border-primary-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Invoice:</span>
                  <span className="font-medium text-gray-900">{invoice.invoiceNumber || invoice.id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">State:</span>
                  <span className="chip chip-green text-xs">{invoice.state}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Line Quantity:</span>
                  <span className="text-gray-900">{invoice.lines[0]?.quantity || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Net Amount:</span>
                  <span className="font-mono text-gray-900">
                    {invoice.currency} {invoice.lines[0]?.netAmount.toLocaleString() || 0}
                  </span>
                </div>
              </div>
            </section>
          ) : (
            <section>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Source: Invoice Line
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500 text-center">
                No linked invoice found
              </div>
            </section>
          )}

          {/* Trail Arrow */}
          {product && (
            <div className="flex items-center justify-center text-gray-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          )}

          {/* Product Defaults */}
          {product ? (
            <section>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Product Defaults Applied
              </div>
              <div className="bg-amber-50 rounded-lg p-4 space-y-2 border border-amber-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Product:</span>
                  <span className="font-medium text-gray-900">{product.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Default Account:</span>
                  <span className="font-mono text-gray-900 text-xs">
                    {product.defaultLedgerAccountId || '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Default Tax:</span>
                  <span className="font-mono text-gray-900 text-xs">
                    {product.defaultTaxId || '—'}
                  </span>
                </div>
              </div>
            </section>
          ) : invoice ? (
            <section>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Product Defaults Applied
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500 text-center">
                No product linked to this invoice line
              </div>
            </section>
          ) : null}

          {/* Explanation */}
          <section className="pt-4 border-t border-gray-200">
            <div className="text-xs font-semibold text-gray-700 mb-2">💡 What This Means</div>
            <p className="text-sm text-gray-600 leading-relaxed">
              {line.documentType === 'AR' && invoice ? (
                <>
                  Customer owes us <strong>{line.amounts.localCurrency} {line.amounts.localAmount.toLocaleString()}</strong>.
                  We recorded <strong>revenue</strong> when the invoice was opened{invoice.invoiceNumber && ` (${invoice.invoiceNumber})`}.
                  {product && (
                    <> The product defaults determined which GL account and tax code to use.</>
                  )}
                </>
              ) : line.documentType === 'AP' ? (
                <>
                  We owe a vendor <strong>{line.amounts.localCurrency} {line.amounts.localAmount.toLocaleString()}</strong>.
                  This was recorded as an <strong>expense or asset purchase</strong> when the invoice was approved.
                </>
              ) : line.documentType === 'CARD' ? (
                <>
                  Card spend of <strong>{line.amounts.localCurrency} {line.amounts.localAmount.toLocaleString()}</strong>.
                  Categorized as an expense when the transaction was classified.
                </>
              ) : (
                <>
                  This is a general ledger entry for <strong>{line.amounts.localCurrency} {line.amounts.localAmount.toLocaleString()}</strong>.
                </>
              )}
            </p>
          </section>
        </div>
      )}
    </div>
  );
}

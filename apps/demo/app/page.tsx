'use client';

/**
 * Close Readiness Radar - Main Page
 * 
 * Shows entity-level readiness scores with blockers and inline actions
 */

import { useEffect, useState } from 'react';
import type { CompanyEntity, InvoiceReceivable, InvoicePayable, CardTransaction, LedgerAccount } from '@light-demo/mock-sdk';

interface EntityReadiness {
  entity: CompanyEntity;
  score: number;
  status: 'Ready' | 'Almost' | 'Not Ready';
  blockers: {
    arDraftCount: number;
    apInitCount: number;
    cardUnclassCount: number;
    fxFlagCount: number;
  };
}

export default function CloseReadinessPage() {
  const [readinessData, setReadinessData] = useState<EntityReadiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchReadiness = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/readiness');
      const data = await res.json();
      setReadinessData(data.readiness);
    } catch (error) {
      console.error('Failed to fetch readiness:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadiness();
  }, []);

  const handleOpenDrawer = (entityId: string) => {
    setSelectedEntity(entityId);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedEntity(null);
  };

  const handleActionComplete = async () => {
    await fetchReadiness();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8 border-b border-gray-200/60 pb-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Close Readiness Radar</h1>
              <p className="text-sm text-gray-600 mt-1.5 font-medium">
                January 2026 — Track blockers and take action across all entities
              </p>
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse"></span>
                � Prototype — Turns "Are we ready to close?" from a 30-minute hunt into a 10-second answer. Demo uses mocked data.{' '}
                <a
                  href="https://github.com/samollason/light-faux-sdk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 underline font-medium"
                >
                  View README
                </a>
              </p>
            </div>
            <a
              href="/ledger"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg border border-primary-200 transition-all duration-200 hover:shadow-sm"
            >
              View Ledger
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </header>

        {/* Entity List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading readiness data...</div>
        ) : (
          <div className="space-y-4">
            {readinessData.map((item) => (
              <EntityRow
                key={item.entity.id}
                readiness={item}
                onOpenDrawer={() => handleOpenDrawer(item.entity.id)}
              />
            ))}
          </div>
        )}

        {/* Blockers Drawer */}
        {drawerOpen && selectedEntity && (
          <BlockersDrawer
            entityId={selectedEntity}
            readinessData={readinessData}
            onClose={handleCloseDrawer}
            onActionComplete={handleActionComplete}
          />
        )}
      </div>
    </div>
  );
}

/** AI Assistant component - mocked, rule-based suggestions */
function AIAssistant({
  arInvoices,
  apPayables,
  cardTransactions,
  ledgerAccounts,
  onOpenAllDrafts,
  onApproveAllPayables,
  onConfirmFx,
  acting,
}: {
  arInvoices: InvoiceReceivable[];
  apPayables: InvoicePayable[];
  cardTransactions: CardTransaction[];
  ledgerAccounts: LedgerAccount[];
  onOpenAllDrafts: () => void;
  onApproveAllPayables: () => void;
  onConfirmFx: () => void;
  acting: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  // Rule-based suggestions
  const suggestions = [];

  if (arInvoices.length > 0) {
    suggestions.push({
      id: 'ar-drafts',
      icon: '📋',
      message: `I noticed ${arInvoices.length} AR draft${arInvoices.length > 1 ? 's' : ''}. Want me to open ${arInvoices.length > 1 ? 'them all' : 'it'}?`,
      action: 'Open all',
      onAction: onOpenAllDrafts,
      priority: 'high',
    });
  }

  if (apPayables.length > 0) {
    const totalAmount = apPayables.reduce((sum, p) => sum + p.amount, 0);
    suggestions.push({
      id: 'ap-init',
      icon: '💰',
      message: `${apPayables.length} AP bill${apPayables.length > 1 ? 's' : ''} awaiting approval (${apPayables[0]?.currency} ${totalAmount.toFixed(2)} total).`,
      action: 'Review & approve',
      onAction: onApproveAllPayables,
      priority: 'medium',
    });
  }

  if (ledgerAccounts.length > 0) {
    suggestions.push({
      id: 'fx-flag',
      icon: '💱',
      message: `${ledgerAccounts.length} account${ledgerAccounts.length > 1 ? 's have' : ' has'} FX revaluation flags. Last revaluation: 3 days ago.`,
      action: 'Revalue now',
      onAction: onConfirmFx,
      priority: 'high',
    });
  }

  if (cardTransactions.length > 0) {
    suggestions.push({
      id: 'cards-unclass',
      icon: '💳',
      message: `${cardTransactions.length} card transaction${cardTransactions.length > 1 ? 's need' : ' needs'} categorization. Quick classify?`,
      action: 'View cards',
      priority: 'low',
    });
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 bg-gradient-to-br from-primary-50 via-blue-50 to-indigo-50 rounded-xl border-2 border-primary-200/60 overflow-hidden shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/40 transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center text-white text-sm font-bold shadow-md">
            AI
          </div>
          <div className="text-left">
            <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
              Light Assistant
              <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full border border-amber-300">FAKE AI - DEMO</span>
            </div>
            <div className="text-xs text-gray-600 font-medium">{suggestions.length} suggestion{suggestions.length > 1 ? 's' : ''} available</div>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-3">
          <div className="bg-amber-50/80 border-l-4 border-amber-400 rounded-r-lg p-3 backdrop-blur-sm">
            <p className="text-xs text-amber-900 font-medium leading-relaxed">
              <strong className="font-bold">⚠️ NOT REAL AI:</strong> This "AI assistant" is 100% fake — just simple if/then rules for demo purposes. No machine learning, no API calls, no intelligence. Built to show what AI-native workflows <em>could</em> look like in finance software.
            </p>
          </div>
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="bg-white rounded-lg p-3 shadow-sm border border-gray-200"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">{suggestion.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 leading-relaxed">{suggestion.message}</p>
                  {suggestion.onAction && (
                    <button
                      onClick={suggestion.onAction}
                      disabled={acting}
                      className="mt-2 text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
                    >
                      {acting ? 'Working...' : suggestion.action}
                    </button>
                  )}
                </div>
                {suggestion.priority === 'high' && (
                  <span className="flex-shrink-0 w-2 h-2 rounded-full bg-red-500 mt-1.5" />
                )}
              </div>
            </div>
          ))}
          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-500 italic">
              💡 Tip: I learn from your workflow patterns. The more you use Light, the smarter I get.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Entity row component */
function EntityRow({
  readiness,
  onOpenDrawer,
}: {
  readiness: EntityReadiness;
  onOpenDrawer: () => void;
}) {
  const { entity, score, status, blockers } = readiness;

  const statusColors = {
    Ready: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    Almost: 'bg-amber-100 text-amber-700 border border-amber-200',
    'Not Ready': 'bg-rose-100 text-rose-700 border border-rose-200',
  };

  const barColors = {
    Ready: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
    Almost: 'bg-gradient-to-r from-amber-500 to-amber-600',
    'Not Ready': 'bg-gradient-to-r from-rose-500 to-rose-600',
  };

  const totalBlockers =
    blockers.arDraftCount + blockers.apInitCount + blockers.cardUnclassCount + blockers.fxFlagCount;

  return (
    <div className="card p-6 hover:shadow-lg hover:border-primary-100 transition-all duration-200 cursor-pointer group" onClick={onOpenDrawer}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">{entity.name}</h3>
            <span className={`chip ${statusColors[status]}`}>{status}</span>
            <span className="text-xs font-medium text-gray-400 tracking-wider">({entity.code})</span>
          </div>
          <p className="text-sm text-gray-500 font-medium">
            {entity.localCurrency} · {totalBlockers} blocker{totalBlockers !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold bg-gradient-to-br from-primary-600 to-primary-800 bg-clip-text text-transparent">{score}</div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Readiness</div>
        </div>
      </div>

      {/* Readiness Bar */}
      <div className="mb-5">
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
          <div
            className={`h-full ${barColors[status]} transition-all duration-500 shadow-sm`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Blocker Counts */}
      <div className="grid grid-cols-4 gap-4 text-center">
        <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-primary-50/50 transition-colors">
          <div className="text-2xl font-bold text-gray-900">{blockers.arDraftCount}</div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">AR drafts</div>
        </div>
        <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-primary-50/50 transition-colors">
          <div className="text-2xl font-bold text-gray-900">{blockers.apInitCount}</div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">AP INIT</div>
        </div>
        <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-primary-50/50 transition-colors">
          <div className="text-2xl font-bold text-gray-900">{blockers.cardUnclassCount}</div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cards</div>
        </div>
        <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-primary-50/50 transition-colors">
          <div className="text-2xl font-bold text-gray-900">{blockers.fxFlagCount}</div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">FX flags</div>
        </div>
      </div>
    </div>
  );
}

/** Blockers drawer component */
function BlockersDrawer({
  entityId,
  readinessData,
  onClose,
  onActionComplete,
}: {
  entityId: string;
  readinessData: EntityReadiness[];
  onClose: () => void;
  onActionComplete: () => void;
}) {
  const [arInvoices, setArInvoices] = useState<InvoiceReceivable[]>([]);
  const [apPayables, setApPayables] = useState<InvoicePayable[]>([]);
  const [cardTransactions, setCardTransactions] = useState<CardTransaction[]>([]);
  const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const entity = readinessData.find((r) => r.entity.id === entityId)?.entity;

  useEffect(() => {
    const fetchBlockerDetails = async () => {
      setLoading(true);
      try {
        const { createLightClient } = await import('../lib/clientFactory');
        const client = createLightClient();
        const [ar, ap, cards, accounts] = await Promise.all([
          client.listInvoiceReceivables(),
          client.listInvoicePayables(),
          client.listCardTransactions(),
          client.listLedgerAccounts(),
        ]);

        console.log('Fetched data for entity:', entityId);
        console.log('All AR:', ar);
        console.log('All AP:', ap);
        
        const filteredAr = ar.filter((inv) => inv.companyEntityId === entityId && inv.state === 'DRAFT');
        const filteredAp = ap.filter((p) => p.companyEntityId === entityId && p.state === 'INIT');
        const filteredCards = cards.filter(
          (tx) => tx.companyEntityId === entityId && tx.lines.some((l) => !l.accountId || !l.taxCodeId)
        );
        const filteredAccounts = accounts.filter((acc) => acc.companyEntityId === entityId && acc.fxFlag);
        
        console.log('Filtered AR drafts:', filteredAr);
        console.log('Filtered AP init:', filteredAp);
        
        setArInvoices(filteredAr);
        setApPayables(filteredAp);
        setCardTransactions(filteredCards);
        setLedgerAccounts(filteredAccounts);
      } catch (error) {
        console.error('Failed to fetch blocker details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlockerDetails();
  }, [entityId]);

  const handleOpenInvoice = async (invoiceId: string) => {
    setActing(invoiceId);
    try {
      await fetch('/api/ar-open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId }),
      });
      await onActionComplete();
      setArInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
    } catch (error) {
      console.error('Failed to open invoice:', error);
    } finally {
      setActing(null);
    }
  };

  const handleApprovePayable = async (payableId: string) => {
    setActing(payableId);
    try {
      await fetch('/api/ap-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payableId }),
      });
      await onActionComplete();
      setApPayables((prev) => prev.filter((p) => p.id !== payableId));
    } catch (error) {
      console.error('Failed to approve payable:', error);
    } finally {
      setActing(null);
    }
  };

  const handleClassifyCard = async (txId: string, lineId: string) => {
    const accountId = 'acc-uk-6000'; // Mock selection
    const taxCodeId = 'tax-uk-vat20';
    setActing(txId);
    try {
      await fetch('/api/card-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txId, lineId, accountId, taxCodeId }),
      });
      await onActionComplete();
      setCardTransactions((prev) => prev.filter((tx) => tx.id !== txId));
    } catch (error) {
      console.error('Failed to classify card:', error);
    } finally {
      setActing(null);
    }
  };

  const handleConfirmFx = async () => {
    setActing('fx');
    try {
      await fetch('/api/fx-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityId }),
      });
      await onActionComplete();
      setLedgerAccounts([]);
    } catch (error) {
      console.error('Failed to confirm FX:', error);
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-gray-900 bg-opacity-50" />
      <div
        className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Blockers</h2>
              <p className="text-sm text-gray-600 mt-1">{entity?.name}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* AI Assistant Panel */}
          {!loading && (
            <AIAssistant
              arInvoices={arInvoices}
              apPayables={apPayables}
              cardTransactions={cardTransactions}
              ledgerAccounts={ledgerAccounts}
              onOpenAllDrafts={() => arInvoices.forEach((inv) => handleOpenInvoice(inv.id))}
              onApproveAllPayables={() => apPayables.forEach((p) => handleApprovePayable(p.id))}
              onConfirmFx={handleConfirmFx}
              acting={acting !== null}
            />
          )}

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading blockers...</div>
          ) : (
            <div className="space-y-6">
              {/* AR Drafts */}
              {arInvoices.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">AR Draft Invoices ({arInvoices.length})</h3>
                  <div className="space-y-2">
                    {arInvoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{inv.id}</div>
                          <div className="text-xs text-gray-500">
                            {inv.currency} {inv.amount.toFixed(2)}
                          </div>
                        </div>
                        <button
                          onClick={() => handleOpenInvoice(inv.id)}
                          disabled={acting === inv.id}
                          className="btn-primary btn-sm"
                        >
                          {acting === inv.id ? 'Opening...' : 'Open'}
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* AP INIT */}
              {apPayables.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">AP Bills Awaiting Approval ({apPayables.length})</h3>
                  <div className="space-y-2">
                    {apPayables.map((payable) => (
                      <div key={payable.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{payable.vendorName}</div>
                          <div className="text-xs text-gray-500">
                            {payable.currency} {payable.amount.toFixed(2)}
                          </div>
                        </div>
                        <button
                          onClick={() => handleApprovePayable(payable.id)}
                          disabled={acting === payable.id}
                          className="btn-primary btn-sm"
                        >
                          {acting === payable.id ? 'Approving...' : 'Approve'}
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Cards Unclassified */}
              {cardTransactions.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Card Transactions Unclassified ({cardTransactions.length})</h3>
                  <div className="space-y-2">
                    {cardTransactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{tx.merchant.name}</div>
                          <div className="text-xs text-gray-500">
                            {tx.currency} {tx.amount.toFixed(2)}
                          </div>
                        </div>
                        <button
                          onClick={() => handleClassifyCard(tx.id, tx.lines[0]?.id)}
                          disabled={acting === tx.id}
                          className="btn-primary btn-sm"
                        >
                          {acting === tx.id ? 'Saving...' : 'Classify'}
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* FX Flags */}
              {ledgerAccounts.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">FX Revaluation Needed ({ledgerAccounts.length})</h3>
                  <div className="space-y-2">
                    {ledgerAccounts.map((acc) => (
                      <div key={acc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{acc.label}</div>
                          <div className="text-xs text-gray-500">Account {acc.code}</div>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={handleConfirmFx}
                      disabled={acting === 'fx'}
                      className="btn-primary w-full mt-3"
                    >
                      {acting === 'fx' ? 'Confirming...' : 'Confirm FX Revaluation'}
                    </button>
                  </div>
                </section>
              )}

              {arInvoices.length === 0 &&
                apPayables.length === 0 &&
                cardTransactions.length === 0 &&
                ledgerAccounts.length === 0 && (
                  <div className="text-center py-12 text-gray-500">No blockers found. This entity is ready!</div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * GET /api/readiness
 * 
 * Aggregates blocker counts per entity and returns readiness scores
 */

import { NextResponse } from 'next/server';
import { createLightClient } from '../../../lib/clientFactory';
import { computeReadinessScore } from '../../../lib/readinessScore';

export async function GET() {
  try {
    const client = createLightClient();

    // Fetch all data in parallel
    const [entities, arInvoices, apPayables, cardTransactions, ledgerAccounts] = await Promise.all([
      client.listCompanyEntities(),
      client.listInvoiceReceivables(),
      client.listInvoicePayables(),
      client.listCardTransactions(),
      client.listLedgerAccounts(),
    ]);

    // Compute readiness per entity
    const readiness = entities.map((entity) => {
      // Count blockers for this entity
      const arDraftCount = arInvoices.filter(
        (inv) => inv.companyEntityId === entity.id && inv.state === 'DRAFT'
      ).length;

      const apInitCount = apPayables.filter(
        (payable) => payable.companyEntityId === entity.id && payable.state === 'INIT'
      ).length;

      const cardUnclassCount = cardTransactions.filter(
        (tx) =>
          tx.companyEntityId === entity.id &&
          tx.lines.some((line) => !line.accountId || !line.taxCodeId)
      ).length;

      const fxFlagCount = ledgerAccounts.filter(
        (acc) => acc.companyEntityId === entity.id && acc.fxFlag === true
      ).length;

      const score = computeReadinessScore({ arDraftCount, apInitCount, cardUnclassCount, fxFlagCount });

      return {
        entity,
        ...score,
      };
    });

    return NextResponse.json({ readiness });
  } catch (error) {
    console.error('Readiness aggregation error:', error);
    return NextResponse.json({ error: 'Failed to compute readiness' }, { status: 500 });
  }
}

/**
 * POST /api/card-patch
 * 
 * Updates a card transaction line (categorize spend)
 * Body: { txId, lineId, accountId?, taxCodeId?, costCenterId?, description? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLightClient } from '../../../lib/clientFactory';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { txId, lineId, ...patch } = body;

    if (!txId || !lineId) {
      return NextResponse.json({ error: 'txId and lineId required' }, { status: 400 });
    }

    const client = createLightClient();
    const updatedLine = await client.updateCardTransactionLine(txId, lineId, patch);

    return NextResponse.json({ line: updatedLine });
  } catch (error: any) {
    console.error('Card patch error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update card line' }, { status: 500 });
  }
}

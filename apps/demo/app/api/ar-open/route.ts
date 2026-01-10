/**
 * POST /api/ar-open
 * 
 * Opens an AR invoice (assigns number, sets state OPEN)
 * Body: { invoiceId: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLightClient } from '../../../lib/clientFactory';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { invoiceId } = body;

    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId required' }, { status: 400 });
    }

    const client = createLightClient();
    const opened = await client.openInvoiceReceivable(invoiceId);

    return NextResponse.json({ invoice: opened });
  } catch (error: any) {
    console.error('AR open error:', error);
    return NextResponse.json({ error: error.message || 'Failed to open invoice' }, { status: 500 });
  }
}

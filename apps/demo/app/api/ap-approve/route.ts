/**
 * POST /api/ap-approve
 * 
 * Approves an AP invoice payable (mock state advance)
 * Body: { payableId: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLightClient } from '../../../lib/clientFactory';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { payableId } = body;

    if (!payableId) {
      return NextResponse.json({ error: 'payableId required' }, { status: 400 });
    }

    const client = createLightClient();
    
    // Mock approve (not in official Light API list, but in our MockClient)
    if ('approveInvoicePayable' in client && typeof client.approveInvoicePayable === 'function') {
      const approved = await (client as any).approveInvoicePayable(payableId);
      return NextResponse.json({ payable: approved });
    }

    return NextResponse.json({ error: 'Approve not supported by this client' }, { status: 501 });
  } catch (error: any) {
    console.error('AP approve error:', error);
    return NextResponse.json({ error: error.message || 'Failed to approve payable' }, { status: 500 });
  }
}

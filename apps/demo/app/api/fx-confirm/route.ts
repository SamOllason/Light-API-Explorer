/**
 * POST /api/fx-confirm
 * 
 * Confirms FX revaluation for an entity (mock action)
 * Body: { entityId: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLightClient } from '../../../lib/clientFactory';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { entityId } = body;

    if (!entityId) {
      return NextResponse.json({ error: 'entityId required' }, { status: 400 });
    }

    const client = createLightClient();

    // Mock FX confirm (custom method in MockClient)
    if ('confirmFxForEntity' in client && typeof client.confirmFxForEntity === 'function') {
      await (client as any).confirmFxForEntity(entityId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'FX confirm not supported by this client' }, { status: 501 });
  } catch (error: any) {
    console.error('FX confirm error:', error);
    return NextResponse.json({ error: error.message || 'Failed to confirm FX' }, { status: 500 });
  }
}

/**
 * Client factory - switches between mock and real HTTP client
 * based on LIGHT_USE_MOCK environment variable
 */

import type { ILightClient } from '@light-demo/mock-sdk';
import { MockLightClient } from '@light-demo/mock-sdk';

// Singleton instance to maintain state across requests
let mockClientInstance: MockLightClient | null = null;

export function createLightClient(): ILightClient {
  const useMock = process.env.LIGHT_USE_MOCK === '1' || process.env.NEXT_PUBLIC_LIGHT_USE_MOCK === '1';

  if (useMock) {
    // Return singleton instance to maintain state
    if (!mockClientInstance) {
      mockClientInstance = new MockLightClient();
    }
    return mockClientInstance;
  }

  // Real HTTP client (not implemented in MVP)
  // return new HttpLightClient({
  //   baseUrl: process.env.LIGHT_BASE_URL || 'https://api.light.inc',
  //   apiKey: process.env.LIGHT_API_KEY || '',
  // });

  throw new Error('HttpLightClient not implemented. Set LIGHT_USE_MOCK=1 to use mock client.');
}

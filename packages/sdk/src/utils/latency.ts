/**
 * Simulates network latency and random failures.
 * @param latencyMs - Base latency in milliseconds (adds ±20% jitter)
 * @param failRate - Probability of failure (0-1)
 */
export async function simulateLatency(
  latencyMs: number = 0,
  failRate: number = 0
): Promise<void> {
  // Random failure simulation
  if (failRate > 0 && Math.random() < failRate) {
    const errors = [
      { status: 500, message: 'Internal Server Error' },
      { status: 502, message: 'Bad Gateway' },
      { status: 503, message: 'Service Unavailable' },
      { status: 429, message: 'Too Many Requests' },
    ];
    const error = errors[Math.floor(Math.random() * errors.length)];
    throw new Error(`[${error.status}] ${error.message}`);
  }

  // Latency simulation with jitter
  if (latencyMs > 0) {
    const jitter = latencyMs * 0.2 * (Math.random() * 2 - 1);
    const delay = Math.max(0, latencyMs + jitter);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

/**
 * Readiness scoring logic
 * 
 * Start at 100, subtract penalties:
 * - AR draft: -30 each
 * - AP INIT: -25 each
 * - Card unclassified: -15 each
 * - FX flag: -20 per account
 * 
 * Thresholds:
 * - ≥90: Ready (green)
 * - 70-89: Almost (yellow)
 * - <70: Not Ready (red)
 */

export interface ReadinessScore {
  score: number;
  status: 'Ready' | 'Almost' | 'Not Ready';
  blockers: {
    arDraftCount: number;
    apInitCount: number;
    cardUnclassCount: number;
    fxFlagCount: number;
  };
}

export function computeReadinessScore(blockers: {
  arDraftCount: number;
  apInitCount: number;
  cardUnclassCount: number;
  fxFlagCount: number;
}): ReadinessScore {
  let score = 100;
  score -= blockers.arDraftCount * 30;
  score -= blockers.apInitCount * 25;
  score -= blockers.cardUnclassCount * 15;
  score -= blockers.fxFlagCount * 20;

  // Floor at 0
  score = Math.max(0, score);

  let status: 'Ready' | 'Almost' | 'Not Ready';
  if (score >= 90) {
    status = 'Ready';
  } else if (score >= 70) {
    status = 'Almost';
  } else {
    status = 'Not Ready';
  }

  return { score, status, blockers };
}

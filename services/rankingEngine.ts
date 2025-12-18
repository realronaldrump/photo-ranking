import { MatchResult, RankedPhoto, Photo } from '../types';

// Constants for the rating system
const INITIAL_RATING = 1000;
const K_FACTOR_BASE = 32;

/**
 * Calculates the expected score for player A against player B using logistic curve.
 * This is the core probability function in Bradley-Terry / Elo.
 * P(A wins) = 1 / (1 + 10^((Rb - Ra) / 400))
 */
const getExpectedScore = (ratingA: number, ratingB: number): number => {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
};

/**
 * Calculates Uncertainty (Confidence Interval proxy).
 * In a true Bayesian system or the JAX Hessian approach, this is derived from the covariance matrix.
 * Here, we approximate it based on the number of matches.
 * Uncertainty starts high and decays as 1/sqrt(n).
 */
const calculateUncertainty = (matches: number): number => {
  const baseUncertainty = 300; // +/- 300 points initially
  if (matches === 0) return baseUncertainty;
  // Decay function. Never goes below 30.
  return Math.max(30, baseUncertainty / Math.sqrt(matches + 1));
};

/**
 * Updates ratings based on a list of matches.
 * Note: While the Python code uses a full Batch optimization (L-BFGS), 
 * for a responsive web app with incremental updates, an iterative approach 
 * is more performant and provides immediate feedback.
 * 
 * We re-calculate the entire state from the history of matches to ensure consistency
 * and to allow the "strength" of opponents to update historically.
 */
export const calculateRankings = (photos: Photo[], matches: MatchResult[]): RankedPhoto[] => {
  // Initialize map
  const photoMap = new Map<string, RankedPhoto>();
  
  photos.forEach(p => {
    photoMap.set(p.id, {
      ...p,
      rating: INITIAL_RATING,
      matches: 0,
      wins: 0,
      losses: 0,
      uncertainty: calculateUncertainty(0)
    });
  });

  // Iterative Solver (Simulating a batch process by re-running history)
  // We run through the history multiple times to let ratings converge
  // or we can just run through once (Elo style). 
  // For 'Skill Rating', Elo is standard. For 'True Skill' inference, we'd loop.
  // Let's stick to a robust sequential update which is standard for Elo.
  
  // Sort matches by timestamp to ensure chronological updates
  const sortedMatches = [...matches].sort((a, b) => a.timestamp - b.timestamp);

  sortedMatches.forEach(match => {
    const winner = photoMap.get(match.winnerId);
    const loser = photoMap.get(match.loserId);

    if (!winner || !loser) return;

    // Current Ratings
    const Rw = winner.rating;
    const Rl = loser.rating;

    // Expected Scores
    const Ew = getExpectedScore(Rw, Rl);
    const El = getExpectedScore(Rl, Rw);

    // Dynamic K-Factor: Higher uncertainty = higher volatility allowed
    // This mimics the "Search" phase vs "Converge" phase
    const Kw = K_FACTOR_BASE * (800 / (winner.matches + 20)); 
    const Kl = K_FACTOR_BASE * (800 / (loser.matches + 20));

    // Update Ratings
    // Winner gets 1 point, Loser gets 0
    winner.rating = Rw + Kw * (1 - Ew);
    loser.rating = Rl + Kl * (0 - El);

    // Update Stats
    winner.wins += 1;
    winner.matches += 1;
    loser.losses += 1;
    loser.matches += 1;
  });

  // Final Pass to set Uncertainty based on final match counts
  Array.from(photoMap.values()).forEach(p => {
    p.uncertainty = calculateUncertainty(p.matches);
  });

  return Array.from(photoMap.values()).sort((a, b) => b.rating - a.rating);
};

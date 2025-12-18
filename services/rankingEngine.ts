import { MatchResult, RankedPhoto, Photo } from '../types';

// Rating Constants
const INITIAL_RATING = 1000;
const INITIAL_UNCERTAINTY = 350; // High sigma for new items
const MIN_UNCERTAINTY = 40;      // Floor for uncertainty (never fully certain)
const VOLATILITY_INFLATION = 50; // How much uncertainty increases on an "upset"
const UNCERTAINTY_DECAY = 0.92;  // How fast uncertainty collapses on a standard match

/**
 * Calculates the expected score for player A against player B.
 * P(A wins) = 1 / (1 + 10^((Rb - Ra) / 400))
 */
const getExpectedScore = (ratingA: number, ratingB: number): number => {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
};

/**
 * Re-calculates the entire state from the history of matches.
 * Uses a Glicko-inspired logic where Uncertainty (Sigma) is dynamic.
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
      uncertainty: INITIAL_UNCERTAINTY
    });
  });

  // Sort matches chronologically to simulate learning over time
  const sortedMatches = [...matches].sort((a, b) => a.timestamp - b.timestamp);

  sortedMatches.forEach(match => {
    const winner = photoMap.get(match.winnerId);
    const loser = photoMap.get(match.loserId);

    if (!winner || !loser) return;

    const Rw = winner.rating;
    const Rl = loser.rating;

    // Expected Scores
    const Ew = getExpectedScore(Rw, Rl);
    // Note: El = 1 - Ew

    // 1. Detect "Surprise" (Volatility)
    // If the winner had a very low chance of winning (< 25%), this is an upset.
    // The system thought it knew the truth, but it was wrong. 
    // Therefore, uncertainty should INCREASE, not decrease.
    const isUpset = Ew < 0.25;

    // 2. Calculate Dynamic K-Factor
    // We learn MORE from photos we are uncertain about.
    // K factor is essentially "How much does this match matter?"
    const Kw = (winner.uncertainty / 400) * 80; 
    const Kl = (loser.uncertainty / 400) * 80;

    // 3. Update Ratings
    winner.rating = Rw + Kw * (1 - Ew);
    loser.rating = Rl + Kl * (0 - (1 - Ew));

    // 4. Update Uncertainty (Active Learning Logic)
    if (isUpset) {
        // We were wrong. Inflate uncertainty so these get tested more.
        winner.uncertainty = Math.min(INITIAL_UNCERTAINTY, winner.uncertainty + VOLATILITY_INFLATION);
        loser.uncertainty = Math.min(INITIAL_UNCERTAINTY, loser.uncertainty + VOLATILITY_INFLATION);
    } else {
        // Result was expected (or close enough). Confidence grows.
        winner.uncertainty = Math.max(MIN_UNCERTAINTY, winner.uncertainty * UNCERTAINTY_DECAY);
        loser.uncertainty = Math.max(MIN_UNCERTAINTY, loser.uncertainty * UNCERTAINTY_DECAY);
    }

    // Update Stats
    winner.wins += 1;
    winner.matches += 1;
    loser.losses += 1;
    loser.matches += 1;
  });

  return Array.from(photoMap.values()).sort((a, b) => b.rating - a.rating);
};
export interface Photo {
  id: string;
  url: string;
  title: string;
  width?: number;
  height?: number;
}

export interface Album {
  id: string;
  title: string;
  count: number;
}

export interface RankedPhoto extends Photo {
  rating: number;
  matches: number;
  wins: number;
  losses: number;
  uncertainty: number; // Represents the confidence interval width
  rank?: number;
}

export interface MatchResult {
  winnerId: string;
  loserId: string;
  timestamp: number;
}

export enum AppState {
  SETUP = 'SETUP',
  BATTLE = 'BATTLE',
  LEADERBOARD = 'LEADERBOARD',
}

export interface FlickrConfig {
  apiKey: string;
  userId: string;
}
import React, { useState, useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import Layout from './components/Layout';
import Setup from './components/Setup';
import BattleArena from './components/BattleArena';
import Leaderboard from './components/Leaderboard';
import { AppState, FlickrConfig, RankedPhoto, MatchResult, Photo } from './types';
import { fetchPhotos, getDemoPhotos } from './services/flickrService';
import { calculateRankings } from './services/rankingEngine';

function App() {
  const [appState, setAppState] = useState<AppState>(AppState.SETUP);
  
  // ARCHITECTURE UPDATE: Separated Source of Truth (rawPhotos) from Derived View (rankedPhotos)
  const [rawPhotos, setRawPhotos] = useState<Photo[]>([]);
  const [rankedPhotos, setRankedPhotos] = useState<RankedPhoto[]>([]);
  
  const [matchHistory, setMatchHistory] = useState<MatchResult[]>(() => {
    // Load history from local storage on initialization
    const saved = localStorage.getItem('portfolio_ranker_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Loading & Error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persistence: Save history whenever it changes
  useEffect(() => {
    localStorage.setItem('portfolio_ranker_history', JSON.stringify(matchHistory));
  }, [matchHistory]);

  // REACTIVE RANKING ENGINE
  // Whenever history changes or we get new raw photos, re-calculate the rankings.
  // This replaces the old circular logic and ensures one-way data flow.
  useEffect(() => {
    if (rawPhotos.length > 0) {
      const newRankings = calculateRankings(rawPhotos, matchHistory);
      setRankedPhotos(newRankings);
    }
  }, [matchHistory, rawPhotos]);

  const handleStart = async (config: FlickrConfig | null, albumId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      let fetchedPhotos: Photo[];
      if (config) {
        // Fetch ALL photos (paginated) from the selected source
        fetchedPhotos = await fetchPhotos(config.apiKey, config.userId, albumId);
        
        if (fetchedPhotos.length < 2) {
           throw new Error("Found fewer than 2 photos in this source. Ranking requires at least 2 images.");
        }
      } else {
        // Demo mode
        await new Promise(r => setTimeout(r, 1000));
        fetchedPhotos = getDemoPhotos();
      }

      setRawPhotos(fetchedPhotos);
      // Note: The useEffect above will handle the initial ranking calculation
      setAppState(AppState.BATTLE);
    } catch (err) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError("An unexpected error occurred.");
        }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = (winnerId: string, loserId: string) => {
    const newMatch: MatchResult = {
      winnerId,
      loserId,
      timestamp: Date.now()
    };
    
    // Update history - this triggers the ranking useEffect
    setMatchHistory(prev => [...prev, newMatch]);
  };

  // UNDO FUNCTIONALITY
  // Removes the last vote from the history stack
  const handleUndo = () => {
    if (matchHistory.length > 0) {
      setMatchHistory(prev => prev.slice(0, -1));
    }
  };

  const renderContent = () => {
    switch (appState) {
      case AppState.SETUP:
        return <Setup onStart={handleStart} isLoading={isLoading} error={error} />;
      case AppState.BATTLE:
        return (
          <BattleArena 
            photos={rankedPhotos} 
            onVote={handleVote} 
            onUndo={handleUndo}
            matchesCount={matchHistory.length} 
          />
        );
      case AppState.LEADERBOARD:
        return <Leaderboard photos={rankedPhotos} />;
      default:
        return null;
    }
  };

  return (
    <HashRouter>
      <Layout 
        currentState={appState} 
        onChangeState={setAppState} 
        canNavigate={appState !== AppState.SETUP}
      >
        {renderContent()}
      </Layout>
    </HashRouter>
  );
}

export default App;
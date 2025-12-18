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
  const [photos, setPhotos] = useState<RankedPhoto[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchResult[]>([]);
  
  // Loading & Error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize ranked photos whenever match history or base photo list changes
  useEffect(() => {
    if (photos.length > 0) {
      // Create a base list of photos (strip ranking info to avoid double counting if we re-run)
      // We map the base info then re-calculate.
      const basePhotos: Photo[] = photos.map(p => ({
        id: p.id,
        url: p.url,
        title: p.title,
        width: p.width,
        height: p.height
      }));
      
      const newRankings = calculateRankings(basePhotos, matchHistory);
      
      // Only update if there is a meaningful change to avoid loops.
      // Since calculateRankings is deterministic, this is safe in this context.
    }
  }, [matchHistory.length]);

  const handleStart = async (config: FlickrConfig | null, albumId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      let rawPhotos: Photo[];
      if (config) {
        // Fetch ALL photos (paginated) from the selected source
        rawPhotos = await fetchPhotos(config.apiKey, config.userId, albumId);
        
        if (rawPhotos.length < 2) {
           throw new Error("Found fewer than 2 photos in this source. Ranking requires at least 2 images.");
        }
      } else {
        // Demo mode
        await new Promise(r => setTimeout(r, 1000));
        rawPhotos = getDemoPhotos();
      }

      // Initial Ranking Setup (0 matches)
      const initialRanked = calculateRankings(rawPhotos, []);
      setPhotos(initialRanked);
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
    
    // Update history
    const newHistory = [...matchHistory, newMatch];
    setMatchHistory(newHistory);
    
    // Recalculate rankings immediately for smooth UI
    const basePhotos = photos.map(p => ({ id: p.id, url: p.url, title: p.title, width: p.width, height: p.height }));
    const updatedRankings = calculateRankings(basePhotos, newHistory);
    setPhotos(updatedRankings);
  };

  const renderContent = () => {
    switch (appState) {
      case AppState.SETUP:
        return <Setup onStart={handleStart} isLoading={isLoading} error={error} />;
      case AppState.BATTLE:
        return <BattleArena photos={photos} onVote={handleVote} matchesCount={matchHistory.length} />;
      case AppState.LEADERBOARD:
        return <Leaderboard photos={photos} />;
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
import React, { useState, useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import Layout from './components/Layout';
import Setup from './components/Setup';
import BattleArena from './components/BattleArena';
import Leaderboard from './components/Leaderboard';
import { AppState, FlickrConfig, RankedPhoto, MatchResult, Photo } from './types';
import { fetchPhotos, getDemoPhotos } from './services/flickrService';
import { calculateRankings } from './services/rankingEngine';
import { storageService } from './services/storageService';

function App() {
  const [appState, setAppState] = useState<AppState>(AppState.SETUP);
  
  // SESSION STATE
  // We now track WHICH album we are ranking so we save to the correct bucket.
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(undefined);
  const [sessionTitle, setSessionTitle] = useState<string>('');

  // DATA STATE
  const [rawPhotos, setRawPhotos] = useState<Photo[]>([]);
  const [rankedPhotos, setRankedPhotos] = useState<RankedPhoto[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchResult[]>([]);
  
  // Loading & Error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PERSISTENCE: Save to the SPECIFIC bucket for the active session
  useEffect(() => {
    // Only save if we are actually in a session (Battle or Leaderboard)
    if (appState !== AppState.SETUP) {
      storageService.saveSession(activeSessionId, matchHistory);
    }
  }, [matchHistory, activeSessionId, appState]);

  // REACTIVE RANKING ENGINE
  useEffect(() => {
    if (rawPhotos.length > 0) {
      const newRankings = calculateRankings(rawPhotos, matchHistory);
      setRankedPhotos(newRankings);
    }
  }, [matchHistory, rawPhotos]);

  const handleStart = async (config: FlickrConfig | null, albumId?: string, title?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Set Session Context
      setActiveSessionId(albumId);
      setSessionTitle(title || (albumId ? 'Album' : 'Full Portfolio'));

      // 2. Load History for THIS specific context
      // This switches the "Brain" to the correct memory bank
      const sessionHistory = storageService.loadSession(albumId);
      setMatchHistory(sessionHistory);

      // 3. Fetch Photos
      let fetchedPhotos: Photo[];
      if (config) {
        fetchedPhotos = await fetchPhotos(config.apiKey, config.userId, albumId);
        
        if (fetchedPhotos.length < 2) {
           throw new Error("Found fewer than 2 photos in this source. Ranking requires at least 2 images.");
        }
      } else {
        await new Promise(r => setTimeout(r, 1000));
        fetchedPhotos = getDemoPhotos();
      }

      setRawPhotos(fetchedPhotos);
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
    setMatchHistory(prev => [...prev, newMatch]);
  };

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
        sessionTitle={sessionTitle}
      >
        {renderContent()}
      </Layout>
    </HashRouter>
  );
}

export default App;
import React, { useState, useEffect, useCallback } from 'react';
import { RankedPhoto } from '../types';

interface BattleArenaProps {
  photos: RankedPhoto[];
  onVote: (winnerId: string, loserId: string) => void;
  matchesCount: number;
}

interface BattleContext {
  label: string;
  description: string;
  color: string;
}

const BattleArena: React.FC<BattleArenaProps> = ({ photos, onVote, matchesCount }) => {
  const [currentPair, setCurrentPair] = useState<[RankedPhoto, RankedPhoto] | null>(null);
  const [battleContext, setBattleContext] = useState<BattleContext | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Keyboard Support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentPair || isTransitioning) return;
      
      if (e.key === 'ArrowLeft') {
        handleChoice(currentPair[0], currentPair[1]);
      } else if (e.key === 'ArrowRight') {
        handleChoice(currentPair[1], currentPair[0]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPair, isTransitioning]); // handleChoice is stable via wrapper below if needed, but here we call internal logic

  const selectNextPair = useCallback(() => {
    if (photos.length < 2) return;
    const validPhotos = photos.filter(p => !!p);

    let photoA: RankedPhoto;
    let photoB: RankedPhoto;
    let context: BattleContext;

    const r = Math.random();

    // 1. PLACEMENT PHASE (Gatekeeper Strategy)
    // Find a photo with 0 matches. Pair it against an "Anchor".
    // Updated: Anchor must be STABLE (Matches >= 10, not just 3).
    const unratedPhotos = validPhotos.filter(p => p.matches === 0);
    
    // 10% chance to skip placement to keep the rest of the pool churning
    if (unratedPhotos.length > 0 && r > 0.1) {
        const candidate = unratedPhotos[Math.floor(Math.random() * unratedPhotos.length)];
        
        // Find an Anchor: Rating ~1000, Matches >= 10
        const anchors = validPhotos.filter(p => p.matches >= 10 && Math.abs(p.rating - 1000) < 150);
        
        // If we have anchors, pick one. If not, pick a random established photo (fallback for early game).
        let opponent = anchors.length > 0 
            ? anchors[Math.floor(Math.random() * anchors.length)] 
            : validPhotos.filter(p => p.id !== candidate.id && p.matches > 0)[Math.floor(Math.random() * (validPhotos.length - 1))];

        // Absolute fallback if no matches exist yet
        if (!opponent) opponent = validPhotos.find(p => p.id !== candidate.id)!;
        
        photoA = candidate;
        photoB = opponent;
        context = {
          label: 'CLASSIFYING NEW ASSET',
          description: 'Determining initial baseline against established anchors.',
          color: 'text-blue-400'
        };
    } 
    // 2. EXPLORATION PHASE (10% Chance)
    // Pure random to prevent local optimization bubbles.
    else if (r < 0.1) {
        const idxA = Math.floor(Math.random() * validPhotos.length);
        let idxB = Math.floor(Math.random() * validPhotos.length);
        while (idxA === idxB) idxB = Math.floor(Math.random() * validPhotos.length);
        
        photoA = validPhotos[idxA];
        photoB = validPhotos[idxB];
        context = {
          label: 'EXPLORATION MODE',
          description: 'Randomized pairing to ensure global optimization.',
          color: 'text-purple-400'
        };
    }
    // 3. REFINEMENT PHASE (Quality Matchmaking) - The "Smart" Default
    else {
        // Sort by uncertainty descending (High sigma first)
        const uncertainPhotos = [...validPhotos].sort((a, b) => b.uncertainty - a.uncertainty);
        
        // Pick one of the most uncertain photos
        const topCandidates = uncertainPhotos.slice(0, 5);
        photoA = topCandidates[Math.floor(Math.random() * topCandidates.length)];

        // Find the closest rating match
        let bestMatch: RankedPhoto | null = null;
        let minDiff = Infinity;

        // Scan for closest rating
        for (const p of validPhotos) {
            if (p.id === photoA.id) continue;
            const diff = Math.abs(p.rating - photoA.rating);
            if (diff < minDiff) {
                minDiff = diff;
                bestMatch = p;
            }
        }

        photoB = bestMatch || validPhotos.find(p => p.id !== photoA.id)!;
        
        // Context Labeling
        if (photoA.uncertainty > 150 || photoB.uncertainty > 150) {
           // High uncertainty often implies volatility/upsets
           context = {
             label: 'VERIFYING VOLATILITY',
             description: 'One or both assets have inconsistent voting records.',
             color: 'text-orange-400'
           };
        } else if (Math.abs(photoA.rating - photoB.rating) < 20) {
           context = {
             label: 'QUALITY TIE-BREAKER',
             description: 'Assets are statistically equivalent. Choose carefully.',
             color: 'text-green-400'
           };
        } else {
           context = {
             label: 'REFINEMENT',
             description: 'Fine-tuning placement on the leaderboard.',
             color: 'text-zinc-400'
           };
        }
    }

    // Randomize A/B positions
    if (Math.random() > 0.5) {
        setCurrentPair([photoA, photoB]);
    } else {
        setCurrentPair([photoB, photoA]);
    }
    setBattleContext(context);

  }, [photos]);

  useEffect(() => {
    if (!currentPair) {
      selectNextPair();
    }
  }, [currentPair, selectNextPair]);

  const handleChoice = (winner: RankedPhoto, loser: RankedPhoto) => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    onVote(winner.id, loser.id);

    setTimeout(() => {
      selectNextPair();
      setIsTransitioning(false);
    }, 400);
  };

  if (!currentPair) return (
    <div className="flex items-center justify-center h-full text-zinc-500 font-mono text-xs">
        CALCULATING OPTIMAL MATCHUP...
    </div>
  );

  const [photoA, photoB] = currentPair;

  return (
    <div className="flex flex-col flex-1 h-full w-full max-w-[1920px] mx-auto overflow-hidden">
      {/* Top Info Bar */}
      <div className="border-b border-zinc-800 bg-[#09090b] px-6 py-4 flex justify-between items-center shrink-0">
        <div className="flex flex-col">
            <span className={`text-[10px] font-bold tracking-widest uppercase ${battleContext?.color || 'text-zinc-500'}`}>
               {battleContext?.label || 'BATTLE ARENA'}
            </span>
            <span className="text-zinc-600 text-[10px] hidden md:inline-block">
                {battleContext?.description}
            </span>
        </div>
        <div className="flex items-center space-x-6">
           <div className="hidden md:flex items-center space-x-2 text-[10px] text-zinc-600 font-mono border border-zinc-800 px-2 py-1 rounded">
              <span>USE ARROW KEYS</span>
              <span className="border border-zinc-700 px-1 rounded text-zinc-400">←</span>
              <span className="border border-zinc-700 px-1 rounded text-zinc-400">→</span>
           </div>
           <div className="flex items-center space-x-3">
               <span className="text-zinc-600 text-xs uppercase tracking-widest">Session Count</span>
               <span className="text-white font-mono text-sm">{matchesCount.toString().padStart(3, '0')}</span>
           </div>
        </div>
      </div>

      {/* Main Arena */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative">
        {/* Photo A */}
        <div 
            className="flex-1 relative group cursor-pointer border-b md:border-b-0 md:border-r border-zinc-900 bg-[#0c0c0e] hover:bg-[#121214] transition-colors" 
            onClick={() => handleChoice(photoA, photoB)}
        >
            <div className={`absolute inset-0 p-8 md:p-12 flex items-center justify-center transition-opacity duration-500 ${isTransitioning ? 'opacity-30 blur-sm' : 'opacity-100'}`}>
                <img 
                    src={photoA.url} 
                    alt="Candidate A" 
                    className="max-w-full max-h-full object-contain shadow-2xl transition-transform duration-500 group-hover:scale-[1.01]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                />
            </div>
            
            {/* Hover Frame */}
            <div className="absolute inset-0 border-2 border-transparent group-hover:border-white/10 pointer-events-none transition-colors duration-300 m-4"></div>
            
            {/* Label */}
            <div className="absolute bottom-6 left-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center space-x-2">
                <span className="bg-white text-black text-[10px] font-bold px-2 py-1 uppercase tracking-widest">Select A</span>
                <span className="bg-zinc-800 text-zinc-400 text-[10px] font-mono px-1.5 py-1 rounded border border-zinc-700">←</span>
            </div>
        </div>

        {/* Photo B */}
        <div 
            className="flex-1 relative group cursor-pointer bg-[#0c0c0e] hover:bg-[#121214] transition-colors" 
            onClick={() => handleChoice(photoB, photoA)}
        >
            <div className={`absolute inset-0 p-8 md:p-12 flex items-center justify-center transition-opacity duration-500 ${isTransitioning ? 'opacity-30 blur-sm' : 'opacity-100'}`}>
                <img 
                    src={photoB.url} 
                    alt="Candidate B" 
                    className="max-w-full max-h-full object-contain shadow-2xl transition-transform duration-500 group-hover:scale-[1.01]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                />
            </div>

            {/* Hover Frame */}
            <div className="absolute inset-0 border-2 border-transparent group-hover:border-white/10 pointer-events-none transition-colors duration-300 m-4"></div>

            {/* Label */}
            <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center space-x-2">
                <span className="bg-zinc-800 text-zinc-400 text-[10px] font-mono px-1.5 py-1 rounded border border-zinc-700">→</span>
                <span className="bg-white text-black text-[10px] font-bold px-2 py-1 uppercase tracking-widest">Select B</span>
            </div>
        </div>
      </div>
      
      {/* Footer Meta */}
      <div className="border-t border-zinc-800 bg-[#09090b] px-6 py-2 flex justify-center space-x-8 text-[10px] text-zinc-600 font-mono uppercase shrink-0">
         <span title={`Uncertainty: ${Math.round(photoA.uncertainty)}`}>ID: {photoA.id} <span className="text-zinc-700 ml-1">({Math.round(photoA.rating)})</span></span>
         <span className="text-zinc-700">|</span>
         <span title={`Uncertainty: ${Math.round(photoB.uncertainty)}`}>ID: {photoB.id} <span className="text-zinc-700 ml-1">({Math.round(photoB.rating)})</span></span>
      </div>
    </div>
  );
};

export default BattleArena;
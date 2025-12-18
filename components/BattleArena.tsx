import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RankedPhoto } from '../types';

interface BattleArenaProps {
  photos: RankedPhoto[];
  onVote: (winnerId: string, loserId: string) => void;
  onUndo: () => void;
  matchesCount: number;
}

interface BattleContext {
  label: string;
  description: string;
  color: string;
}

const BattleArena: React.FC<BattleArenaProps> = ({ photos, onVote, onUndo, matchesCount }) => {
  const [currentPair, setCurrentPair] = useState<[RankedPhoto, RankedPhoto] | null>(null);
  const [battleContext, setBattleContext] = useState<BattleContext | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Track last pair to avoid immediate repeats
  const lastPairRef = useRef<Set<string>>(new Set());

  // Keyboard Support & Undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo Listener (Ctrl+Z or Cmd+Z)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        onUndo();
        // Optional: Provide visual feedback for undo? 
        // For now, the match count decreasing is sufficient.
        return;
      }

      if (!currentPair || isTransitioning) return;
      
      if (e.key === 'ArrowLeft') {
        handleChoice(currentPair[0], currentPair[1]);
      } else if (e.key === 'ArrowRight') {
        handleChoice(currentPair[1], currentPair[0]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPair, isTransitioning, onUndo]);

  const selectNextPair = useCallback(() => {
    if (photos.length < 2) return;
    const validPhotos = photos.filter(p => !!p);

    let photoA: RankedPhoto | null = null;
    let photoB: RankedPhoto | null = null;
    let context: BattleContext | null = null;

    let attempts = 0;
    const MAX_ATTEMPTS = 5;

    // Retry loop to avoid selecting the exact same pair as last time
    while (attempts < MAX_ATTEMPTS) {
      attempts++;
      
      const r = Math.random();
      let candidateA: RankedPhoto;
      let candidateB: RankedPhoto;
      let ctx: BattleContext;

      // 1. PLACEMENT PHASE (Gatekeeper Strategy)
      const unratedPhotos = validPhotos.filter(p => p.matches === 0);
      
      if (unratedPhotos.length > 0 && r > 0.1) {
          candidateA = unratedPhotos[Math.floor(Math.random() * unratedPhotos.length)];
          
          // Find an Anchor: Rating ~1000, Matches >= 3
          const anchors = validPhotos.filter(p => p.matches >= 3 && Math.abs(p.rating - 1000) < 150);
          
          // If we have anchors, pick one. If not, pick a random established photo.
          const opponentPool = anchors.length > 0 
             ? anchors 
             : validPhotos.filter(p => p.id !== candidateA.id && p.matches > 0);
             
          // Fallback if no matches yet at all
          const finalPool = opponentPool.length > 0 ? opponentPool : validPhotos.filter(p => p.id !== candidateA.id);

          candidateB = finalPool[Math.floor(Math.random() * finalPool.length)];

          ctx = {
            label: 'CLASSIFYING NEW ASSET',
            description: 'Determining initial baseline against established anchors.',
            color: 'text-blue-400'
          };
      } 
      // 2. EXPLORATION PHASE (20% Chance)
      else if (r < 0.2) {
          const idxA = Math.floor(Math.random() * validPhotos.length);
          let idxB = Math.floor(Math.random() * validPhotos.length);
          while (idxA === idxB) idxB = Math.floor(Math.random() * validPhotos.length);
          
          candidateA = validPhotos[idxA];
          candidateB = validPhotos[idxB];
          ctx = {
            label: 'EXPLORATION MODE',
            description: 'Randomized pairing to ensure global optimization.',
            color: 'text-purple-400'
          };
      }
      // 3. REFINEMENT PHASE (Quality Matchmaking)
      else {
          // Sort by uncertainty descending
          const uncertainPhotos = [...validPhotos].sort((a, b) => b.uncertainty - a.uncertainty);
          
          // Pick from top 10 uncertain photos
          const topCandidates = uncertainPhotos.slice(0, Math.min(10, uncertainPhotos.length));
          candidateA = topCandidates[Math.floor(Math.random() * topCandidates.length)];

          let bestMatch: RankedPhoto | null = null;
          let minDiff = Infinity;

          for (const p of validPhotos) {
              if (p.id === candidateA.id) continue;
              const diff = Math.abs(p.rating - candidateA.rating);
              if (diff < minDiff) {
                  minDiff = diff;
                  bestMatch = p;
              }
          }

          candidateB = bestMatch || validPhotos.find(p => p.id !== candidateA.id)!;
          
          if (candidateA.uncertainty > 150 || candidateB.uncertainty > 150) {
             ctx = {
               label: 'VERIFYING VOLATILITY',
               description: 'One or both assets have inconsistent voting records.',
               color: 'text-orange-400'
             };
          } else if (Math.abs(candidateA.rating - candidateB.rating) < 20) {
             ctx = {
               label: 'QUALITY TIE-BREAKER',
               description: 'Assets are statistically equivalent. Choose carefully.',
               color: 'text-green-400'
             };
          } else {
             ctx = {
               label: 'REFINEMENT',
               description: 'Fine-tuning placement on the leaderboard.',
               color: 'text-zinc-400'
             };
          }
      }

      // Check if this pair is the same as the last one
      const isRepeat = lastPairRef.current.has(candidateA.id) && lastPairRef.current.has(candidateB.id);

      if (!isRepeat || attempts === MAX_ATTEMPTS) {
          photoA = candidateA;
          photoB = candidateB;
          context = ctx;
          break;
      }
    }

    // Safety fallback
    if (!photoA || !photoB || !context) {
        const idxA = Math.floor(Math.random() * validPhotos.length);
        let idxB = Math.floor(Math.random() * validPhotos.length);
        while(idxA === idxB) idxB = Math.floor(Math.random() * validPhotos.length);
        photoA = validPhotos[idxA];
        photoB = validPhotos[idxB];
        context = { label: 'FALLBACK', description: 'System recovery pairing.', color: 'text-zinc-500' };
    }

    // Store this pair in ref
    lastPairRef.current = new Set([photoA.id, photoB.id]);

    if (Math.random() > 0.5) {
        setCurrentPair([photoA, photoB]);
    } else {
        setCurrentPair([photoB, photoA]);
    }
    setBattleContext(context);

  }, [photos]);

  // Trigger selection when currentPair becomes null
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
      // By setting to null, we trigger the useEffect above. 
      // This ensures we call selectNextPair with the FRESH 'photos' prop 
      // (which has updated ratings from the vote we just made).
      setCurrentPair(null);
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
        {/* Fixed min-height to prevent context thrashing/layout jumps */}
        <div className="flex flex-col justify-center min-h-[32px]">
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
              <span className="ml-2 text-zinc-700">|</span>
              <span className="ml-2">UNDO: CTRL+Z</span>
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
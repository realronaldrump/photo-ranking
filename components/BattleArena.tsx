import React, { useState, useEffect, useCallback } from 'react';
import { RankedPhoto } from '../types';

interface BattleArenaProps {
  photos: RankedPhoto[];
  onVote: (winnerId: string, loserId: string) => void;
  matchesCount: number;
}

const BattleArena: React.FC<BattleArenaProps> = ({ photos, onVote, matchesCount }) => {
  const [currentPair, setCurrentPair] = useState<[RankedPhoto, RankedPhoto] | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const selectNextPair = useCallback(() => {
    if (photos.length < 2) return;
    const validPhotos = photos.filter(p => !!p);
    const candidates = [...validPhotos].sort((a, b) => (a.matches + Math.random()) - (b.matches + Math.random()));

    let a = candidates[0];
    let b = candidates[1];

    if (a.id === b.id && candidates.length > 2) {
      b = candidates[2];
    }
    
    // Weighted random injection
    if (Math.random() > 0.7) {
        const r1 = Math.floor(Math.random() * validPhotos.length);
        let r2 = Math.floor(Math.random() * validPhotos.length);
        while(r1 === r2) r2 = Math.floor(Math.random() * validPhotos.length);
        a = validPhotos[r1];
        b = validPhotos[r2];
    }

    setCurrentPair([a, b]);
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
        PREPARING MATCHUPS...
    </div>
  );

  const [photoA, photoB] = currentPair;

  return (
    <div className="flex flex-col flex-1 h-full w-full max-w-[1920px] mx-auto overflow-hidden">
      {/* Top Info Bar */}
      <div className="border-b border-zinc-800 bg-[#09090b] px-6 py-4 flex justify-between items-center shrink-0">
        <span className="text-zinc-500 text-xs font-mono tracking-wide">
          SELECT PREFERRED IMAGE
        </span>
        <div className="flex items-center space-x-3">
           <span className="text-zinc-600 text-xs uppercase tracking-widest">Session Count</span>
           <span className="text-white font-mono text-sm">{matchesCount.toString().padStart(3, '0')}</span>
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
                      // Consider showing a fallback placeholder or text here if needed
                    }}
                />
            </div>
            
            {/* Hover Frame */}
            <div className="absolute inset-0 border-2 border-transparent group-hover:border-white/10 pointer-events-none transition-colors duration-300 m-4"></div>
            
            {/* Label */}
            <div className="absolute bottom-6 left-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="bg-white text-black text-[10px] font-bold px-2 py-1 uppercase tracking-widest">Select A</span>
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
            <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="bg-white text-black text-[10px] font-bold px-2 py-1 uppercase tracking-widest">Select B</span>
            </div>
        </div>
      </div>
      
      {/* Footer Meta */}
      <div className="border-t border-zinc-800 bg-[#09090b] px-6 py-2 flex justify-center space-x-8 text-[10px] text-zinc-600 font-mono uppercase shrink-0">
         <span>ID: {photoA.id}</span>
         <span className="text-zinc-700">|</span>
         <span>ID: {photoB.id}</span>
      </div>
    </div>
  );
};

export default BattleArena;
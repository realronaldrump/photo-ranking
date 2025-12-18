import React, { useEffect, useState } from 'react';
import { FlickrConfig, Album } from '../types';
import { getAlbums } from '../services/flickrService';

interface SetupProps {
  onStart: (config: FlickrConfig | null, albumId?: string) => void;
  isLoading: boolean;
  error: string | null;
}

const Setup: React.FC<SetupProps> = ({ onStart, isLoading, error }) => {
  const API_KEY = '55d9c6efa3924775a19d75c2eea979ae';
  const USERNAME = 'davisdeatonphotography';

  const [albums, setAlbums] = useState<Album[]>([]);
  const [loadingAlbums, setLoadingAlbums] = useState(true);
  const [albumError, setAlbumError] = useState<string | null>(null);

  useEffect(() => {
    const loadAlbums = async () => {
      try {
        const fetchedAlbums = await getAlbums(API_KEY, USERNAME);
        setAlbums(fetchedAlbums);
      } catch (err) {
        console.error(err);
        setAlbumError("Failed to load albums. Please check connection.");
      } finally {
        setLoadingAlbums(false);
      }
    };
    loadAlbums();
  }, []);

  const handleSelectSource = (albumId?: string) => {
    onStart({ apiKey: API_KEY, userId: USERNAME }, albumId);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="max-w-2xl w-full p-8">
        <div className="mb-10 text-center">
          <div className="w-16 h-16 border border-zinc-700 rounded-full mx-auto mb-6 flex items-center justify-center text-zinc-400">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
             </svg>
          </div>
          <h1 className="text-2xl font-light text-white tracking-tight mb-3">
            Portfolio Ranker
          </h1>
          <p className="text-zinc-500 text-sm">
            Connected to <span className="text-zinc-300 font-mono text-xs ml-1">@{USERNAME}</span>
          </p>
        </div>

        {error && (
            <div className="mb-6 p-4 bg-red-950/30 border border-red-900/50 text-red-400 text-xs font-mono text-center">
              ERROR: {error}
            </div>
        )}
        
        {albumError && (
             <div className="mb-6 p-4 bg-orange-950/30 border border-orange-900/50 text-orange-400 text-xs font-mono text-center">
              WARN: {albumError}
            </div>
        )}

        {isLoading ? (
            <div className="text-center py-12">
                 <div className="animate-spin h-8 w-8 border-2 border-zinc-600 border-t-white rounded-full mx-auto mb-4"></div>
                 <div className="text-zinc-400 text-xs tracking-widest uppercase">Importing comprehensive catalog...</div>
            </div>
        ) : loadingAlbums ? (
            <div className="text-center py-12">
                 <div className="animate-spin h-6 w-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full mx-auto mb-4"></div>
                 <div className="text-zinc-500 text-xs tracking-widest uppercase">Fetching Albums...</div>
            </div>
        ) : (
            <div className="space-y-4">
                <div className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest mb-4 border-b border-zinc-800 pb-2">
                    Select Source for Ranking
                </div>
                
                {/* Full Photostream Option */}
                <button
                    onClick={() => handleSelectSource(undefined)}
                    className="w-full flex items-center justify-between p-4 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 transition-all group text-left"
                >
                    <div>
                        <div className="text-zinc-200 text-sm font-medium group-hover:text-white">Full Photostream</div>
                        <div className="text-zinc-500 text-xs mt-1">All public photos</div>
                    </div>
                    <div className="text-zinc-600 group-hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                    </div>
                </button>

                {/* Albums Grid/List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    {albums.map((album) => (
                        <button
                            key={album.id}
                            onClick={() => handleSelectSource(album.id)}
                            className="flex flex-col p-4 bg-zinc-900/30 hover:bg-zinc-800 border border-zinc-800/50 hover:border-zinc-600 transition-all group text-left h-24 justify-between"
                        >
                            <div className="text-zinc-300 text-sm font-medium group-hover:text-white truncate w-full" title={album.title}>
                                {album.title}
                            </div>
                            <div className="flex justify-between items-end w-full">
                                <span className="text-zinc-600 text-xs font-mono">{album.count} photos</span>
                                <span className="text-zinc-700 group-hover:text-zinc-400">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                     </svg>
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Setup;
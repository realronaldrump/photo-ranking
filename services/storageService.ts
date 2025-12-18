import { MatchResult } from '../types';

const STORAGE_PREFIX = 'portfolio_ranker_v1_';

/**
 * Generates the storage key based on the context.
 * If albumId is present, it's a specific album ranking.
 * If not, it's the global photostream ranking.
 */
const getKey = (albumId?: string) => {
  return albumId 
    ? `${STORAGE_PREFIX}album_${albumId}` 
    : `${STORAGE_PREFIX}global_stream`;
};

export const storageService = {
  /**
   * Loads match history for a specific context.
   */
  loadSession: (albumId?: string): MatchResult[] => {
    try {
      const key = getKey(albumId);
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load session", e);
      return [];
    }
  },

  /**
   * Saves match history for a specific context.
   */
  saveSession: (albumId: string | undefined, history: MatchResult[]) => {
    try {
      const key = getKey(albumId);
      localStorage.setItem(key, JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save session", e);
    }
  },

  /**
   * Exports all data or specific session data to a JSON string
   * for cross-device transfer.
   */
  exportData: (albumId?: string) => {
    const key = getKey(albumId);
    const data = localStorage.getItem(key);
    
    const exportObject = {
      version: 1,
      type: 'portfolio_ranker_backup',
      context: albumId || 'global',
      timestamp: Date.now(),
      data: data ? JSON.parse(data) : []
    };

    return JSON.stringify(exportObject, null, 2);
  },

  /**
   * Imports data from a JSON string. 
   * returns the albumId context it belongs to (or undefined for global)
   */
  importData: (jsonString: string): string | undefined => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.type !== 'portfolio_ranker_backup') {
        throw new Error("Invalid backup file format");
      }

      const context = parsed.context === 'global' ? undefined : parsed.context;
      const history = parsed.data;

      if (!Array.isArray(history)) {
        throw new Error("Corrupted history data");
      }

      // Save to the correct slot
      storageService.saveSession(context, history);
      
      return context;
    } catch (e) {
      console.error(e);
      throw new Error("Failed to import data. Check file format.");
    }
  }
};
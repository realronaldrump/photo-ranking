import React from 'react';
import { AppState } from '../types';

interface LayoutProps {
  currentState: AppState;
  onChangeState: (state: AppState) => void;
  children: React.ReactNode;
  canNavigate: boolean;
  sessionTitle?: string;
}

const Layout: React.FC<LayoutProps> = ({ currentState, onChangeState, children, canNavigate, sessionTitle }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-300 font-sans selection:bg-white selection:text-black">
      <header className="border-b border-zinc-800 bg-[#09090b] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-6 w-px bg-zinc-700 hidden sm:block"></div>
            <div className="flex flex-col">
                <span className="font-medium tracking-widest text-sm uppercase text-white">Portfolio Ranker</span>
                {sessionTitle && canNavigate && (
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wide truncate max-w-[150px] sm:max-w-xs">{sessionTitle}</span>
                )}
            </div>
          </div>

          {canNavigate && (
            <nav className="flex space-x-6">
              <button
                onClick={() => onChangeState(AppState.BATTLE)}
                className={`text-sm tracking-wide transition-colors ${
                  currentState === AppState.BATTLE 
                    ? 'text-white font-medium border-b border-white pb-0.5' 
                    : 'text-zinc-500 hover:text-white'
                }`}
              >
                BATTLE
              </button>
              <button
                onClick={() => onChangeState(AppState.LEADERBOARD)}
                className={`text-sm tracking-wide transition-colors ${
                  currentState === AppState.LEADERBOARD 
                    ? 'text-white font-medium border-b border-white pb-0.5' 
                    : 'text-zinc-500 hover:text-white'
                }`}
              >
                LEADERBOARD
              </button>
              <button
                onClick={() => window.location.reload()}
                className="text-sm tracking-wide text-zinc-500 hover:text-red-400 transition-colors"
                title="Exit Session"
              >
                EXIT
              </button>
            </nav>
          )}
          
          {!canNavigate && <div className="w-8"></div>}
        </div>
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
};

export default Layout;
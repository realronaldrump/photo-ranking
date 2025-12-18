import React from 'react';
import { RankedPhoto } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface LeaderboardProps {
  photos: RankedPhoto[];
}

const Leaderboard: React.FC<LeaderboardProps> = ({ photos }) => {
  const sortedPhotos = [...photos].sort((a, b) => b.rating - a.rating);

  const chartData = sortedPhotos.slice(0, 20).map(p => ({
    name: p.id,
    rating: Math.round(p.rating),
  }));

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-zinc-800 pb-6">
        <div>
            <h2 className="text-2xl font-light text-white tracking-tight uppercase mb-2">Master Portfolio</h2>
            <p className="text-zinc-500 text-sm max-w-lg">
                Statistical analysis based on {photos.reduce((acc, p) => acc + p.matches, 0) / 2} pairwise comparisons.
            </p>
        </div>
        <div className="mt-6 md:mt-0 flex space-x-8">
            <div className="text-right">
                <span className="block text-zinc-600 text-[10px] uppercase tracking-wider mb-1">Max Rating</span>
                <span className="block text-white font-mono text-xl">{Math.round(sortedPhotos[0]?.rating || 0)}</span>
            </div>
            <div className="text-right">
                <span className="block text-zinc-600 text-[10px] uppercase tracking-wider mb-1">Total Assets</span>
                <span className="block text-white font-mono text-xl">{photos.length}</span>
            </div>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-16">
        <h3 className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-6">Distribution (Top 20)</h3>
        <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="20%">
                    <Tooltip 
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                        contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '0px', padding: '8px 12px' }}
                        itemStyle={{ color: '#fff', fontSize: '12px', fontFamily: 'monospace' }}
                        labelStyle={{ display: 'none' }}
                    />
                    <Bar dataKey="rating">
                        {chartData.map((entry, index) => (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={index === 0 ? '#ffffff' : '#3f3f46'} 
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Table List */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="border-b border-zinc-800 text-xs text-zinc-500 font-mono uppercase tracking-wider">
                    <th className="py-4 font-normal w-16 text-center">#</th>
                    <th className="py-4 font-normal w-24">Preview</th>
                    <th className="py-4 font-normal pl-4">Asset Details</th>
                    <th className="py-4 font-normal text-right w-32">Rating</th>
                    <th className="py-4 font-normal text-right w-32">Record</th>
                    <th className="py-4 font-normal text-right w-32 hidden sm:table-cell">Certainty</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
                {sortedPhotos.map((photo, index) => (
                    <tr key={photo.id} className="group hover:bg-zinc-900/50 transition-colors">
                        <td className="py-4 text-center font-mono text-sm text-zinc-400">
                            {index + 1}
                        </td>
                        <td className="py-4">
                            <div className="h-12 w-16 bg-zinc-900 overflow-hidden relative">
                                <img src={photo.url} alt="" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300" />
                            </div>
                        </td>
                        <td className="py-4 pl-4">
                            <div className="text-sm text-zinc-300 font-medium truncate max-w-md">{photo.title}</div>
                            <div className="text-[10px] text-zinc-600 font-mono mt-1 uppercase">ID: {photo.id}</div>
                        </td>
                        <td className="py-4 text-right font-mono text-white">
                            {Math.round(photo.rating)}
                        </td>
                        <td className="py-4 text-right text-xs font-mono text-zinc-500">
                            {photo.wins}W - {photo.losses}L
                        </td>
                        <td className="py-4 text-right hidden sm:table-cell">
                            <div className="flex justify-end items-center space-x-2">
                                <div className="w-16 h-px bg-zinc-800">
                                    <div 
                                        className="h-full bg-zinc-500" 
                                        style={{ width: `${Math.min(100, (1000 / (photo.uncertainty + 1)) * 10)}%` }} 
                                    />
                                </div>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default Leaderboard;
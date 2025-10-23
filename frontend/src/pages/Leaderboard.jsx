import { useState, useEffect } from 'react';
import { axiosInstance } from '@/App';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import { Trophy, Medal, Award } from 'lucide-react';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await axiosInstance.get('/leaderboard');
      setLeaderboard(response.data);
    } catch (error) {
      toast.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-slate-400 font-bold">#{rank}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen" data-testid="leaderboard-loading">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-pulse text-4xl mb-4">🏆</div>
            <p className="text-slate-400">Loading leaderboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" data-testid="leaderboard-page">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold gradient-text mb-2">Global Leaderboard</h1>
          <p className="text-slate-400">Top performers across all topics</p>
        </div>

        {leaderboard.length === 0 ? (
          <div className="card text-center py-12" data-testid="no-leaderboard">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400">No rankings yet. Be the first!</p>
          </div>
        ) : (
          <div className="space-y-4" data-testid="leaderboard-list">
            {leaderboard.map((entry, index) => {
              const isCurrentUser = entry.email === currentUser.email;
              return (
                <div
                  key={index}
                  className={`card flex items-center justify-between ${
                    isCurrentUser ? 'border-2 border-blue-500' : ''
                  }`}
                  data-testid={`leaderboard-entry-${index}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 flex justify-center">
                      {getRankIcon(entry.rank)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {entry.username}
                        {isCurrentUser && (
                          <span className="ml-2 text-sm text-blue-400">(You)</span>
                        )}
                      </h3>
                      <p className="text-sm text-slate-400">Level {entry.level}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold gradient-text">{entry.xp}</p>
                    <p className="text-sm text-slate-400">XP</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

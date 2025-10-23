import { useState, useEffect } from 'react';
import { axiosInstance } from '@/App';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import { Trophy, Zap, Clock, Target, Award } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, historyRes] = await Promise.all([
        axiosInstance.get('/user/stats'),
        axiosInstance.get('/user/history')
      ]);
      setStats(statsRes.data);
      setHistory(historyRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen" data-testid="dashboard-loading">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-pulse text-4xl mb-4">⏳</div>
            <p className="text-slate-400">Loading your stats...</p>
          </div>
        </div>
      </div>
    );
  }

  const xpToNextLevel = stats?.level * 1000;
  const xpProgress = ((stats?.xp % 1000) / 1000) * 100;

  return (
    <div className="min-h-screen" data-testid="dashboard-page">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold gradient-text mb-2">Welcome back, {user.username}!</h1>
          <p className="text-slate-400">Here's your learning progress</p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card" data-testid="stat-level">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-slate-400 text-sm">Level</p>
                <p className="text-3xl font-bold gradient-text">{stats?.level}</p>
              </div>
              <Trophy className="w-12 h-12 text-yellow-400" />
            </div>
            <Progress value={xpProgress} className="h-2" />
            <p className="text-xs text-slate-400 mt-2">
              {stats?.xp % 1000} / 1000 XP to next level
            </p>
          </div>

          <div className="card" data-testid="stat-xp">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total XP</p>
                <p className="text-3xl font-bold text-blue-400">{stats?.xp}</p>
              </div>
              <Zap className="w-12 h-12 text-blue-400" />
            </div>
          </div>

          <div className="card" data-testid="stat-quizzes">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Quizzes Completed</p>
                <p className="text-3xl font-bold text-green-400">{stats?.total_quizzes}</p>
              </div>
              <Target className="w-12 h-12 text-green-400" />
            </div>
          </div>

          <div className="card" data-testid="stat-average">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Average Score</p>
                <p className="text-3xl font-bold text-purple-400">{stats?.average_score}%</p>
              </div>
              <Award className="w-12 h-12 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Badges Section */}
        {stats?.badges && stats.badges.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Your Badges</h2>
            <div className="flex gap-3 flex-wrap" data-testid="badges-container">
              {stats.badges.map((badge, index) => (
                <div key={index} className="badge" data-testid={`badge-${index}`}>
                  <Award className="w-4 h-4" />
                  {badge}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
          {history.length === 0 ? (
            <div className="card text-center py-12" data-testid="no-activity">
              <p className="text-slate-400">No quiz attempts yet. Start learning now!</p>
            </div>
          ) : (
            <div className="space-y-4" data-testid="activity-list">
              {history.map((attempt, index) => (
                <div key={index} className="card flex items-center justify-between" data-testid={`activity-${index}`}>
                  <div>
                    <h3 className="font-semibold">{attempt.quiz_title || 'Quiz'}</h3>
                    <p className="text-sm text-slate-400">
                      {new Date(attempt.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-400">{attempt.score}%</p>
                    <p className="text-sm text-slate-400">+{attempt.xp_earned} XP</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

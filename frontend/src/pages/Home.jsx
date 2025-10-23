import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import { Zap, Trophy, Target, BookOpen } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Interactive Quizzes',
      description: 'Engage with various quiz types and test your knowledge'
    },
    {
      icon: <Trophy className="w-8 h-8" />,
      title: 'Earn Rewards',
      description: 'Collect XP, level up, and unlock badges as you progress'
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: 'Track Progress',
      description: 'Monitor your performance and see your improvement over time'
    },
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: 'Multiple Topics',
      description: 'Choose from various subjects and skill levels'
    }
  ];

  return (
    <div className="min-h-screen" data-testid="home-page">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold gradient-text mb-6">
            Level Up Your Learning
          </h1>
          <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
            Transform your study sessions into an engaging adventure. Take quizzes, earn XP, and compete on the leaderboard!
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              onClick={() => navigate('/topics')}
              className="btn-primary text-lg px-8 py-6"
              data-testid="start-quiz-button"
            >
              Start Quiz
            </Button>
            <Button
              onClick={() => navigate('/leaderboard')}
              variant="outline"
              className="text-lg px-8 py-6 border-slate-600 text-slate-300 hover:bg-slate-800"
              data-testid="view-leaderboard-button"
            >
              View Leaderboard
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature, index) => (
            <div
              key={index}
              className="card text-center"
              style={{ animationDelay: `${index * 0.1}s` }}
              data-testid={`feature-card-${index}`}
            >
              <div className="flex justify-center mb-4 text-blue-400">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="stat-card" data-testid="stat-quizzes">
            <div className="stat-value">50+</div>
            <div className="stat-label">Available Quizzes</div>
          </div>
          <div className="stat-card" data-testid="stat-topics">
            <div className="stat-value">10+</div>
            <div className="stat-label">Topics Covered</div>
          </div>
          <div className="stat-card" data-testid="stat-students">
            <div className="stat-value">1000+</div>
            <div className="stat-label">Active Students</div>
          </div>
        </div>
      </div>
    </div>
  );
}

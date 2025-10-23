import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosInstance } from '@/App';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Clock, Zap, Target } from 'lucide-react';

export default function Topics() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const response = await axiosInstance.get('/quizzes');
      setQuizzes(response.data);
    } catch (error) {
      toast.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy':
        return 'text-green-400 border-green-400';
      case 'Medium':
        return 'text-yellow-400 border-yellow-400';
      case 'Hard':
        return 'text-red-400 border-red-400';
      default:
        return 'text-slate-400 border-slate-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen" data-testid="topics-loading">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-pulse text-4xl mb-4">📚</div>
            <p className="text-slate-400">Loading quizzes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" data-testid="topics-page">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold gradient-text mb-2">Available Quizzes</h1>
          <p className="text-slate-400">Choose a topic and test your knowledge</p>
        </div>

        {quizzes.length === 0 ? (
          <div className="card text-center py-12" data-testid="no-quizzes">
            <p className="text-slate-400">No quizzes available at the moment</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="quizzes-grid">
            {quizzes.map((quiz, index) => (
              <div key={quiz.id} className="card" data-testid={`quiz-card-${index}`}>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold">{quiz.title}</h3>
                    <span className={`badge ${getDifficultyColor(quiz.difficulty)}`}>
                      {quiz.difficulty}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm">{quiz.description}</p>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Clock className="w-4 h-4" />
                    <span>{Math.floor(quiz.time_limit / 60)} minutes</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Zap className="w-4 h-4" />
                    <span>{quiz.xp_reward} XP reward</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Target className="w-4 h-4" />
                    <span>{quiz.quiz_type}</span>
                  </div>
                </div>

                <Button
                  onClick={() => navigate(`/quiz/${quiz.id}`)}
                  className="w-full btn-primary"
                  data-testid={`start-quiz-${index}`}
                >
                  Start Quiz
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

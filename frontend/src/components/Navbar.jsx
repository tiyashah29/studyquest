import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, LayoutDashboard, Trophy, BookOpen, LogOut } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Home', icon: <Home className="w-4 h-4" /> },
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { path: '/topics', label: 'Topics', icon: <BookOpen className="w-4 h-4" /> },
    { path: '/leaderboard', label: 'Leaderboard', icon: <Trophy className="w-4 h-4" /> },
  ];

  return (
    <nav className="glass sticky top-0 z-50 backdrop-blur-lg" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold gradient-text cursor-pointer" onClick={() => navigate('/')} data-testid="navbar-logo">
              StudyQuest
            </h1>
            <div className="hidden md:flex gap-2">
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  variant={location.pathname === item.path ? 'default' : 'ghost'}
                  className={`flex items-center gap-2 ${
                    location.pathname === item.path
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  {item.icon}
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-slate-300 hidden sm:inline" data-testid="navbar-username">{user.username}</span>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="text-slate-300 hover:text-white hover:bg-slate-800"
              data-testid="logout-button"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex gap-2 mt-4 overflow-x-auto pb-2">
          {navItems.map((item) => (
            <Button
              key={item.path}
              onClick={() => navigate(item.path)}
              variant={location.pathname === item.path ? 'default' : 'ghost'}
              size="sm"
              className={`flex items-center gap-2 whitespace-nowrap ${
                location.pathname === item.path
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              data-testid={`nav-mobile-${item.label.toLowerCase()}`}
            >
              {item.icon}
              {item.label}
            </Button>
          ))}
        </div>
      </div>
    </nav>
  );
}

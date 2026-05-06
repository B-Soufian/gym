import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Loader2, Lock, User } from 'lucide-react';
import useAuthStore from '../stores/authStore';
import api from '../services/api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { username, password });
      const { access_token, user } = response.data;
      
      login(user, access_token);
      navigate(user.role === 'STAFF' ? '/members' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-space p-4 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-lava/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-steel/10 rounded-full blur-[120px]" />
      
      <div className="w-full max-w-md relative">
        <div className="glass-dark p-8 rounded-2xl border border-white/10 shadow-2xl space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-red mb-4 shadow-lg shadow-brand-red/20 transform -rotate-6">
              <Dumbbell className="w-8 h-8 text-brand-papaya" />
            </div>
            <h1 className="text-3xl font-bold text-brand-papaya tracking-tight">Lakhlifi Gym</h1>
            <p className="text-brand-steel font-medium">Gestion Multi-Tenant de Salles de Sport</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-brand-lava/20 border border-brand-lava/30 rounded-xl text-brand-papaya text-sm text-center animate-shake">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-brand-papaya ml-1" htmlFor="username">
                  Nom d'utilisateur
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-steel group-focus-within:text-brand-papaya transition-colors">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    id="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-brand-space/50 border border-brand-steel/20 rounded-xl text-brand-papaya placeholder-brand-steel/50 focus:outline-none focus:ring-2 focus:ring-brand-red/50 focus:border-brand-red transition-all"
                    placeholder="Entrez votre nom d'utilisateur"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-brand-papaya ml-1" htmlFor="password">
                  Mot de passe
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-steel group-focus-within:text-brand-papaya transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-brand-space/50 border border-brand-steel/20 rounded-xl text-brand-papaya placeholder-brand-steel/50 focus:outline-none focus:ring-2 focus:ring-brand-red/50 focus:border-brand-red transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-10 h-5 rounded-full transition-colors ${rememberMe ? 'bg-brand-red' : 'bg-brand-steel/30'}`} />
                  <div className={`absolute left-0.5 top-0.5 w-4 h-4 bg-brand-papaya rounded-full shadow-sm transition-transform transform ${rememberMe ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <span className="text-sm font-medium text-brand-steel group-hover:text-brand-papaya transition-colors">Se souvenir de moi</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-brand-red hover:bg-brand-lava text-brand-papaya font-bold rounded-xl shadow-lg shadow-brand-red/20 active:transform active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span>Se connecter</span>
              )}
            </button>
          </form>

          <div className="pt-4 text-center">
            <p className="text-xs text-brand-steel">
              &copy; 2025  Lakhlifi Gym — Document Maître v9.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Settings,
  MessageSquare,
  LogOut,
  ShieldCheck,
  Dumbbell,
  ChevronRight,
  Menu,
  X,
  History,
  Activity,
  ChevronDown,
  Building2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import useAuthStore from '../../stores/authStore';
import api from '../../services/api';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [gymDropdownOpen, setGymDropdownOpen] = useState(false);
  const [gyms, setGyms] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, selectedGymId, setSelectedGymId } = useAuthStore();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.gym-selector-container')) {
        setGymDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (user) {
      api.get('/gyms')
        .then(res => {
          setGyms(res.data.gyms);
          // Default to 'Toutes les Salles' (empty selectedGymId) instead of the first gym
        })
        .catch(console.error);
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { name: 'Tableau de bord', path: '/dashboard', icon: LayoutDashboard, adminOnly: true },
    { name: 'Membres', path: '/members', icon: Users, adminOnly: false },
    { name: 'Paiements', path: '/payments', icon: CreditCard, adminOnly: false },
    { name: 'File WhatsApp', path: '/queue', icon: MessageSquare, adminOnly: true },
    { name: 'Gestion des Salles', path: '/admin/gyms', icon: ShieldCheck, adminOnly: true },
    { name: 'Personnel', path: '/admin/staff', icon: Users, adminOnly: true },
    { name: 'Abonnements', path: '/admin/subscriptions', icon: Activity, adminOnly: true },
    { name: 'Audit Logs', path: '/audit', icon: History, adminOnly: true },
  ];

  return (
    <div className="flex h-screen bg-brand-papaya overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-brand-space/50 backdrop-blur-sm z-[60] md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:relative z-[70] h-full bg-brand-space text-brand-papaya transition-all duration-300
        ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-20'}
        flex flex-col
      `}>
        {/* Brand */}
        <div className="h-20 flex items-center px-6 border-b border-white/10">
          <Dumbbell className="w-8 h-8 text-brand-red flex-shrink-0" />
          {sidebarOpen && <span className="ml-3 font-bold text-xl tracking-tight">Tamesna Gym</span>}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 space-y-2 scrollbar-hide">
          <div className="px-3 space-y-1">
            {menuItems
              .filter(item => !item.adminOnly || user?.role === 'SUPER_ADMIN')
              .map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center px-3 py-3 rounded-xl transition-all group
                    ${location.pathname === item.path
                      ? 'bg-brand-red text-brand-space shadow-lg shadow-brand-red/30'
                      : 'text-brand-steel hover:bg-white/5 hover:text-brand-papaya'}
                  `}
                >
                  <item.icon className={`w-6 h-6 flex-shrink-0 ${location.pathname === item.path ? '' : 'group-hover:scale-110 transition-transform'}`} />
                  {sidebarOpen && <span className="ml-3 font-medium">{item.name}</span>}
                  {sidebarOpen && location.pathname === item.path && <ChevronRight className="ml-auto w-4 h-4" />}
                </Link>
              ))}
          </div>
        </div>

        {/* User & Logout */}
        <div className="p-4 border-t border-white/10 space-y-4">
          <div className={`flex items-center ${sidebarOpen ? 'px-2' : 'justify-center'}`}>
            <div className="w-10 h-10 rounded-full bg-brand-steel/20 border border-brand-steel/30 flex items-center justify-center font-bold text-brand-steel">
              {user?.username?.[0].toUpperCase()}
            </div>
            {sidebarOpen && (
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-bold truncate">{user?.username}</p>
                <p className="text-xs text-brand-steel truncate">{user?.role}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center px-3 py-3 rounded-xl text-brand-lava hover:bg-brand-lava/10 transition-all
              ${sidebarOpen ? '' : 'justify-center'}
            `}
          >
            <LogOut className="w-6 h-6 flex-shrink-0" />
            {sidebarOpen && <span className="ml-3 font-medium">Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-brand-steel/10 flex items-center justify-between px-4 md:px-8 flex-shrink-0">
          <div className="flex items-center min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-brand-papaya text-brand-space transition-colors flex-shrink-0"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <h2 className="ml-3 md:ml-6 text-lg md:text-xl font-bold text-brand-space tracking-tight truncate hidden xs:block">
              {menuItems.find(i => i.path === location.pathname)?.name || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
            {/* Gym Selector available for ALL users */}
            <div className="relative group z-50 gym-selector-container">
              <div 
                className="flex items-center space-x-1 md:space-x-2 text-sm font-medium text-brand-steel cursor-pointer"
                onClick={() => setGymDropdownOpen(!gymDropdownOpen)}
              >
                <span className="hidden lg:inline text-[10px] uppercase tracking-wider">VOTRE SALLE</span>
                <div className="bg-brand-papaya px-2 md:px-3 py-1.5 rounded-xl text-brand-space font-bold border border-brand-steel/10 flex items-center hover:bg-brand-steel/10 transition-all text-xs md:text-sm shadow-sm">
                  <Building2 className="w-3.5 h-3.5 mr-1 md:mr-2 text-brand-red" />
                  <span className="max-w-[75px] xs:max-w-[100px] md:max-w-none truncate">
                    {gyms.find(g => g.id === selectedGymId)?.name || 'Toutes les Salles'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 ml-1 md:ml-2 opacity-50" />
                </div>
              </div>

              <div className={`absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-brand-steel/10 transition-all duration-200 transform origin-top-right z-50 overflow-hidden ${gymDropdownOpen ? 'opacity-100 visible' : 'opacity-0 invisible md:group-hover:opacity-100 md:group-hover:visible'}`}>
                <div className="p-2 border-b border-brand-steel/10 bg-brand-papaya/30">
                  <button
                    onClick={() => {
                      setSelectedGymId('');
                      setGymDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${!selectedGymId ? 'bg-brand-red text-white shadow-lg' : 'text-brand-space hover:bg-white'
                      }`}
                  >
                    Toutes les Salles
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                  {gyms.map(gym => (
                    <button
                      key={gym.id}
                      onClick={() => {
                        setSelectedGymId(gym.id);
                        setGymDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${selectedGymId === gym.id
                          ? 'bg-brand-papaya text-brand-space font-bold'
                          : 'text-brand-steel hover:bg-brand-papaya/50 hover:text-brand-space'
                        }`}
                    >
                      {gym.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="w-px h-8 bg-brand-steel/20 hidden sm:block" />
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-brand-space hidden xs:block">Système Live</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;

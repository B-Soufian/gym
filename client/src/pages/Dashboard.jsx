import { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  CreditCard, 
  UserPlus, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign
} from 'lucide-react';
import AddPaymentModal from '../components/ui/AddPaymentModal';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import api from '../services/api';
import useAuthStore from '../stores/authStore';

const Dashboard = () => {
  const [kpis, setKpis] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [expiringMembers, setExpiringMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revenuePeriod, setRevenuePeriod] = useState('6m');
  const [payingMember, setPayingMember] = useState(null);
  const { selectedGymId, user } = useAuthStore();
  const isAdmin = user?.role === 'SUPER_ADMIN';

  const fetchDashboardData = async () => {
    try {
      const [kpiRes, revRes, expiringRes] = await Promise.all([
        api.get(`/reports/kpis?gym_id=${selectedGymId || ''}`),
        api.get(`/reports/revenue?period=${revenuePeriod}&gym_id=${selectedGymId || ''}`),
        api.get(`/members/expiring?gym_id=${selectedGymId || ''}`)
      ]);
      setKpis(kpiRes.data.kpis);
      setRevenue(revRes.data.revenue);
      setExpiringMembers(expiringRes.data.members);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedGymId, revenuePeriod]);

  const maskPhone = (phone) => {
    if (!phone) return 'N/A';
    if (isAdmin) return phone;
    return phone.length > 4 
      ? `${phone.substring(0, 2)}****${phone.substring(phone.length - 2)}`
      : '****';
  };

  const getRelativeDateInfo = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(dateStr);
    expDate.setHours(0, 0, 0, 0);
    
    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { 
        label: `Expiré il y a ${Math.abs(diffDays)}j`, 
        color: 'text-red-600 bg-red-50 border-red-100',
        badge: 'bg-red-600',
        note: 'Arrêter à l\'entrée'
      };
    } else if (diffDays === 0) {
      return { 
        label: "Expire aujourd'hui", 
        color: 'text-red-600 bg-red-50 border-red-200 animate-pulse-subtle',
        badge: 'bg-red-600',
        note: 'Arrêter à l\'entrée'
      };
    } else if (diffDays === 1) {
      return { 
        label: "Expire demain", 
        color: 'text-orange-600 bg-orange-50 border-orange-100',
        badge: 'bg-orange-500',
        note: 'Rappel nécessaire'
      };
    } else {
      return { 
        label: `Dans ${diffDays} jours`, 
        color: 'text-brand-steel bg-brand-papaya/10 border-brand-steel/5',
        badge: 'bg-brand-steel',
        note: 'Rappel fortement conseillé'
      };
    }
  };

  if (loading) return (
    <div className="h-96 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const kpiCards = [
    { name: 'Membres Actifs', value: kpis?.active_members || 0, icon: Users, color: 'text-green-600', bg: 'bg-green-50', trend: `${kpis?.active_trend > 0 ? '+' : ''}${kpis?.active_trend || 0}%` },
    { name: 'Revenus (Mois)', value: `${kpis?.revenue_this_month || 0} DH`, icon: CreditCard, color: 'text-brand-red', bg: 'bg-red-50', trend: `${kpis?.revenue_trend > 0 ? '+' : ''}${kpis?.revenue_trend || 0}%` },
    { name: 'Nouveaux Membres', value: kpis?.new_members_this_month || 0, icon: UserPlus, color: 'text-brand-steel', bg: 'bg-blue-50', trend: `${kpis?.new_members_trend > 0 ? '+' : ''}${kpis?.new_members_trend || 0}%` },
    { name: 'Expirations (7j)', value: kpis?.expiring_soon || 0, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', trend: `${kpis?.expiring_trend > 0 ? '+' : ''}${kpis?.expiring_trend || 0}%` },
  ];

  return (
    <div className="space-y-8">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((card) => (
          <div key={card.name} className="bg-white p-6 rounded-2xl border border-brand-steel/10 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-xl ${card.bg}`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
              <span className={`flex items-center text-xs font-bold ${card.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                {card.trend}
                {card.trend.startsWith('+') ? <ArrowUpRight className="w-3 h-3 ml-1" /> : <ArrowDownRight className="w-3 h-3 ml-1" />}
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-medium text-brand-steel">{card.name}</h3>
              <p className="text-2xl font-bold text-brand-space mt-1">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-3 bg-white p-8 rounded-2xl border border-brand-steel/10 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-brand-space flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-brand-red" />
              Tendance des Revenus
            </h3>
            <select 
              value={revenuePeriod}
              onChange={(e) => setRevenuePeriod(e.target.value)}
              className="bg-brand-papaya/50 text-xs font-bold text-brand-space px-4 py-2 rounded-lg border-none focus:ring-2 focus:ring-brand-red">
              <option value="7d">7 derniers jours</option>
              <option value="1m">Dernier mois</option>
              <option value="6m">Derniers 6 mois</option>
              <option value="1y">Dernière année</option>
            </select>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenue}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c1121f" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#c1121f" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}} 
                  tickFormatter={(val) => new Date(val).toLocaleDateString('fr-FR', {month: 'short'})}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}}
                />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Area 
                  type="monotone" 
                  dataKey="total_revenue" 
                  stroke="#c1121f" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expiring Members List (Sidebar) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-brand-steel/10 shadow-sm flex flex-col h-[500px]">
          <h3 className="text-lg font-bold text-brand-space mb-6 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-orange-500" />
            Expirations Imminentes ({expiringMembers.length})
          </h3>
          {expiringMembers.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
               <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-3">
                 <Users className="w-6 h-6" />
               </div>
               <p className="text-brand-steel text-sm font-medium">Aucune expiration imminente.</p>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
              {expiringMembers.map(member => {
                const dateInfo = getRelativeDateInfo(member.subscription_end);
                return (
                  <div key={member.id} className={`flex items-center justify-between p-4 rounded-2xl border ${dateInfo.color} transition-all duration-200 group`}>
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-brand-space text-sm uppercase">{member.first_name} {member.last_name}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-brand-space/10 text-brand-space rounded-full font-bold">#{member.custom_id || member.id}</span>
                      </div>
                      <span className="text-xs font-medium opacity-70 mt-0.5">{maskPhone(member.phone)}</span>
                      <div className="flex items-center mt-2 space-x-2">
                         <span className={`px-2 py-0.5 ${dateInfo.badge} text-white font-black rounded-lg text-[9px] uppercase tracking-wider`}>
                           {dateInfo.label}
                         </span>
                         <span className="text-[9px] italic font-bold opacity-60">• {dateInfo.note}</span>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => setPayingMember(member)}
                      className="p-3 bg-brand-red text-white rounded-xl shadow-lg shadow-brand-red/20 hover:bg-brand-lava transition-all active:scale-95 flex items-center justify-center group-hover:scale-110"
                      title="Enregistrer un paiement"
                    >
                      <DollarSign className="w-5 h-5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Status Distribution (Full Width Bottom) */}
      <div className="bg-white p-8 rounded-2xl border border-brand-steel/10 shadow-sm">
        <h3 className="text-lg font-bold text-brand-space mb-8">Répartition Membres</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { 
              label: 'Actifs', 
              count: kpis?.active_members || 0, 
              color: 'bg-green-500', 
              percent: kpis?.active_members ? Math.round((kpis.active_members / (kpis.active_members + kpis.frozen_members + kpis.expired_members)) * 100) : 0 
            },
            { 
              label: 'Gelés', 
              count: kpis?.frozen_members || 0, 
              color: 'bg-brand-steel', 
              percent: kpis?.frozen_members ? Math.round((kpis.frozen_members / (kpis.active_members + kpis.frozen_members + kpis.expired_members)) * 100) : 0 
            },
            { 
              label: 'Expirés', 
              count: kpis?.expired_members || 0, 
              color: 'bg-orange-500', 
              percent: kpis?.expired_members ? Math.round((kpis.expired_members / (kpis.active_members + kpis.frozen_members + kpis.expired_members)) * 100) : 0 
            },
          ].map((status) => (
            <div key={status.label} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-brand-space">{status.label}</span>
                <span className="font-bold text-brand-space">{status.count}</span>
              </div>
              <div className="h-2 w-full bg-brand-papaya rounded-full overflow-hidden">
                <div 
                  className={`h-full ${status.color} transition-all duration-1000`} 
                  style={{ width: `${status.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-8 p-4 bg-brand-space rounded-xl inline-block w-full">
          <p className="text-xs text-brand-steel uppercase font-bold tracking-widest">Conseil du Jour</p>
          <p className="text-sm text-brand-papaya mt-2 italic">"Le taux de renouvellement est en hausse de 5% cette semaine. Continuez les rappels WhatsApp!"</p>
        </div>
      </div>
      <AddPaymentModal 
        isOpen={!!payingMember}
        onClose={() => setPayingMember(null)}
        onRefresh={fetchDashboardData}
        initialMember={payingMember}
      />
    </div>
  );
};

export default Dashboard;

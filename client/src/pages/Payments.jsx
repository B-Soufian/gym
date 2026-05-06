import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Download, 
  Filter, 
  Loader2, 
  TrendingUp, 
  CreditCard, 
  Banknote, 
  Wallet,
  ArrowUpRight,
  Trash2
} from 'lucide-react';
import api from '../services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import AddPaymentModal from '../components/ui/AddPaymentModal';
import useAuthStore from '../stores/authStore';
import { useToast } from '../components/ui/Toast';

const Payments = () => {
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [stats, setStats] = useState({ total: 0, count: 0 });
  const { selectedGymId, user } = useAuthStore();
  const isAdmin = user?.role === 'SUPER_ADMIN';

  const fetchPayments = async (isInstant = false) => {
    setLoading(true);
    try {
      const [payRes, kpiRes] = await Promise.all([
        api.get('/payments', { params: { search: searchTerm, payment_method: methodFilter } }),
        api.get('/reports/kpis')
      ]);
      setPayments(payRes.data.payments);
      
      const total = payRes.data.payments.reduce((acc, p) => acc + parseFloat(p.amount), 0);
      setStats({ 
        total, 
        count: payRes.data.payments.length,
        trend: kpiRes.data.kpis.revenue_trend
      });
    } catch (err) {
      console.error('Failed to fetch payments', err);
    } finally {
      setLoading(false);
    }
  };





  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce paiement ?')) return;
    try {
      await api.delete(`/payments/${id}`);
      fetchPayments(true);
      showToast('Paiement supprimé avec succès', 'success');
    } catch (err) {
      console.error('Failed to delete payment', err);
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const handleExport = () => {
    if (payments.length === 0) {
      showToast('Aucun paiement à exporter', 'warning');
      return;
    }
    const headers = ['Date', 'Membre', 'Abonnement', 'Montant', 'Methode'];
    const csvContent = [
      headers.join(','),
      ...payments.map(p => [
        format(new Date(p.created_at), 'yyyy-MM-dd HH:mm'),
        `"${p.member_name || 'Inconnu'}"`,
        `"${p.subscription_name}"`,
        p.amount,
        p.payment_method
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `paiements_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  useEffect(() => {
    if (searchTerm === '') {
      fetchPayments(true);
      return;
    }
    const timer = setTimeout(() => {
      fetchPayments();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchPayments(true);
  }, [methodFilter, selectedGymId]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-brand-space tracking-tight">Historique des Paiements</h1>
          <p className="text-brand-steel font-medium mt-1">Suivez vos revenus en temps réel</p>
        </div>
        <div className="flex items-center space-x-3">

          {isAdmin && (
            <button 
              onClick={handleExport}
              className="flex items-center space-x-2 bg-white border border-brand-steel/20 text-brand-space px-5 py-2.5 rounded-xl font-bold hover:bg-brand-papaya transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Exporter</span>
            </button>
          )}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-brand-red text-brand-papaya px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-brand-red/20 hover:bg-brand-lava transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Paiement</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-brand-space rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-brand-steel font-bold text-sm uppercase tracking-wider">Chiffre d'Affaires</p>
              <h3 className="text-3xl font-black mt-1">{stats.total.toLocaleString()} DH</h3>
              <div className={`mt-4 flex items-center text-sm font-bold ${stats.trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                <TrendingUp className="w-4 h-4 mr-1" />
                {stats.trend >= 0 ? '+' : ''}{stats.trend || 0}% vs mois dernier
              </div>
            </div>
            <ArrowUpRight className="absolute top-6 right-6 w-8 h-8 text-white/10" />
          </div>

          <div className="bg-white rounded-3xl p-6 border border-brand-steel/10 shadow-sm flex items-center space-x-4">
            <div className="p-4 bg-brand-papaya rounded-2xl">
              <Banknote className="w-6 h-6 text-brand-red" />
            </div>
            <div>
              <p className="text-brand-steel font-bold text-sm uppercase">Transactions</p>
              <h3 className="text-2xl font-black text-brand-space">{stats.count}</h3>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-brand-steel/10 shadow-sm flex items-center space-x-4">
            <div className="p-4 bg-blue-50 rounded-2xl">
              <CreditCard className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-brand-steel font-bold text-sm uppercase">Panier Moyen</p>
              <h3 className="text-2xl font-black text-brand-space">
                {stats.count > 0 ? Math.round(stats.total / stats.count) : 0} DH
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Filters & Table */}
      <div className="bg-white rounded-3xl border border-brand-steel/10 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-brand-papaya flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-steel" />
            <input 
              type="text"
              placeholder="Rechercher un membre ou une réf..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-brand-papaya/30 border-none rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none font-medium"
            />
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-4 py-2.5 bg-brand-papaya/30 border-none rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none font-bold text-sm"
            >
              <option value="">Tous les modes</option>
              <option value="CASH">Espèces (CASH)</option>
              <option value="CARD">Carte (CARD)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-brand-papaya/10 text-left">
                <th className="px-6 py-4 text-xs font-bold text-brand-steel uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-brand-steel uppercase tracking-wider">Membre</th>
                <th className="px-6 py-4 text-xs font-bold text-brand-steel uppercase tracking-wider">Abonnement</th>
                <th className="px-6 py-4 text-xs font-bold text-brand-steel uppercase tracking-wider">Montant</th>
                <th className="px-6 py-4 text-xs font-bold text-brand-steel uppercase tracking-wider">Méthode</th>
                <th className="px-6 py-4 text-xs font-bold text-brand-steel uppercase tracking-wider text-right pr-8">
                  {isAdmin ? 'Actions' : ''}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-papaya">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-brand-red animate-spin mx-auto" />
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-brand-steel font-medium">
                    Aucun paiement trouvé
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-brand-papaya/10 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-brand-space">
                        {format(new Date(p.created_at), 'dd MMM yyyy', { locale: fr })}
                      </div>
                      <div className="text-xs text-brand-steel">
                        {format(new Date(p.created_at), 'HH:mm')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-brand-space">{p.member_name || 'Inconnu'}</div>
                      <div className="text-xs text-brand-steel">ID: #{p.member_id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-brand-papaya text-brand-space text-xs font-bold rounded-full">
                        {p.subscription_name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-black text-brand-red">{p.amount} DH</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 text-brand-steel">
                        {p.payment_method === 'CASH' ? <Wallet className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                        <span className="text-xs font-bold uppercase">{p.payment_method}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right pr-8">
                      {isAdmin && (
                        <button 
                          onClick={() => handleDelete(p.id)}
                          className="p-2 text-brand-steel hover:text-brand-red hover:bg-brand-papaya rounded-lg transition-all"
                          title="Supprimer le paiement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddPaymentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onRefresh={fetchPayments}
      />
    </div>
  );
};

export default Payments;

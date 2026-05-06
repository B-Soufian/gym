import { useState, useEffect } from 'react';
import { 
  Plus, 
  Settings, 
  Trash2, 
  Edit3, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  Tag 
} from 'lucide-react';
import api from '../services/api';
import AddSubscriptionModal from '../components/ui/AddSubscriptionModal';
import EditSubscriptionModal from '../components/ui/EditSubscriptionModal';

const Subscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(null);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/subscriptions');
      setSubscriptions(response.data.subscriptions);
    } catch (err) {
      console.error('Failed to fetch subscriptions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Voulez-vous vraiment supprimer cette offre ?')) {
      try {
        await api.delete(`/subscriptions/${id}`);
        fetchSubscriptions();
      } catch (err) {
        alert('Erreur lors de la suppression');
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-brand-space tracking-tight">Gestion des Abonnements</h1>
          <p className="text-brand-steel font-medium mt-1">Définissez vos offres et tarifs</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center space-x-2 bg-brand-space text-brand-papaya px-6 py-3 rounded-2xl font-bold shadow-xl hover:bg-brand-lava transition-all transform active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Nouvelle Offre</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-brand-red animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="group bg-white rounded-3xl border border-brand-steel/10 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
              {/* Decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-papaya/30 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-brand-papaya rounded-2xl">
                    <Tag className="w-6 h-6 text-brand-red" />
                  </div>
                  <div className="flex items-center space-x-1">
                    <button 
                      onClick={() => setEditingSubscription(sub)}
                      className="p-2 hover:bg-brand-papaya rounded-lg text-brand-steel transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(sub.id)}
                      className="p-2 hover:bg-red-50 rounded-lg text-brand-red transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-brand-space mb-1">{sub.name}</h3>
                <p className="text-brand-steel text-sm mb-6 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {sub.duration_days} Jours
                </p>

                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-black text-brand-red">{sub.price}</span>
                  <span className="text-lg font-bold text-brand-space">DH</span>
                </div>


              </div>
            </div>
          ))}
        </div>
      )}

      <AddSubscriptionModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onRefresh={fetchSubscriptions}
      />

      <EditSubscriptionModal 
        isOpen={!!editingSubscription}
        subscription={editingSubscription}
        onClose={() => setEditingSubscription(null)}
        onRefresh={fetchSubscriptions}
      />
    </div>
  );
};

export default Subscriptions;

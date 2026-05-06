import { useState, useEffect } from 'react';
import { 
  Plus, 
  MapPin, 
  Phone, 
  Mail, 
  Users, 
  Building2, 
  Loader2, 
  Edit2,
  Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import api from '../services/api';
import AddGymModal from '../components/ui/AddGymModal';
import EditGymModal from '../components/ui/EditGymModal';
import { useToast } from '../components/ui/Toast';

const Gyms = () => {
  const { showToast } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingGym, setEditingGym] = useState(null);
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const setSelectedGymId = useAuthStore((state) => state.setSelectedGymId);

  const fetchGyms = async () => {
    setLoading(true);
    try {
      const response = await api.get('/gyms');
      setGyms(response.data.gyms);
    } catch (err) {
      console.error('Failed to fetch gyms', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Voulez-vous vraiment supprimer cette salle ?')) {
      try {
        await api.delete(`/gyms/${id}`);
        fetchGyms();
        showToast('Salle supprimée avec succès', 'success');
      } catch (err) {
        showToast('Erreur lors de la suppression', 'error');
      }
    }
  };

  useEffect(() => {
    fetchGyms();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-brand-space tracking-tight">Gestion des Salles</h1>
          <p className="text-brand-steel font-medium mt-1">Gérez votre réseau de franchises</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center space-x-2 bg-brand-red text-brand-papaya px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-brand-red/20 hover:bg-brand-lava transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Ajouter une Salle</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-brand-red animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {gyms.map((gym) => (
            <div key={gym.id} className="bg-white rounded-3xl border border-brand-steel/10 p-8 shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="flex justify-between items-start mb-6">
                <div className="p-4 bg-brand-papaya rounded-2xl">
                  <Building2 className="w-8 h-8 text-brand-red" />
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setEditingGym(gym)}
                    className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors"
                    title="Modifier"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDelete(gym.id)}
                    className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <h3 className="text-2xl font-black text-brand-space mb-4">{gym.name}</h3>

              <div className="space-y-3 mb-8">
                <div className="flex items-center text-brand-steel font-medium">
                  <MapPin className="w-4 h-4 mr-3 text-brand-red" />
                  {gym.address}
                </div>
                <div className="flex items-center text-brand-steel font-medium">
                  <Phone className="w-4 h-4 mr-3 text-brand-red" />
                  {gym.phone || 'N/A'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-brand-papaya">
                <button 
                  onClick={() => {
                    setSelectedGymId(gym.id);
                    navigate('/members');
                  }}
                  className="bg-brand-papaya/30 rounded-2xl p-4 text-left hover:bg-brand-red/10 transition-colors group/btn cursor-pointer"
                >
                  <p className="text-xs font-bold text-brand-steel uppercase tracking-wider group-hover/btn:text-brand-red transition-colors">Membres Actifs</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xl font-black text-brand-space">{gym.active_members_count || 0}</p>
                    <Users className="w-5 h-5 text-brand-steel group-hover/btn:text-brand-red transition-colors" />
                  </div>
                </button>
                <div className="bg-brand-papaya/30 rounded-2xl p-4 flex flex-col items-center justify-center">
                   <p className="text-xs font-bold text-brand-steel uppercase tracking-wider mb-1">Dernière Sync</p>
                   <p className="text-sm font-bold text-brand-space">Aujourd'hui</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddGymModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onRefresh={fetchGyms}
      />

      <EditGymModal 
        isOpen={!!editingGym}
        gym={editingGym}
        onClose={() => setEditingGym(null)}
        onRefresh={fetchGyms}
      />
    </div>
  );
};

export default Gyms;

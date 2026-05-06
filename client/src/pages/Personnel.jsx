import { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Shield, 
  Mail, 
  MapPin, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  UserCircle2,
  Building2,
  Edit2,
  Trash2
} from 'lucide-react';
import api from '../services/api';
import AddStaffModal from '../components/ui/AddStaffModal';
import EditStaffModal from '../components/ui/EditStaffModal';
import { useToast } from '../components/ui/Toast';

const Personnel = () => {
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/audit/users'); // Custom endpoint for staff listing
      setUsers(response.data.users);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (user) => {
    if (user.role === 'SUPER_ADMIN') {
      showToast("Action refusée : Un compte administrateur ne peut pas être supprimé afin de garantir la sécurité du système.", 'error');
      return;
    }

    if (window.confirm('Voulez-vous vraiment supprimer cet utilisateur ?')) {
      try {
        await api.delete(`/audit/users/${user.id}`);
        showToast('Utilisateur supprimé avec succès', 'success');
        fetchUsers();
      } catch (err) {
        showToast(err.response?.data?.message || 'Une erreur est survenue lors de la suppression.', 'error');
      }
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-brand-space tracking-tight">Gestion du Personnel</h1>
          <p className="text-brand-steel font-medium mt-1">Gérez les accès et les rôles de votre équipe</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-brand-space text-brand-papaya px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-brand-lava transition-all"
        >
          <UserPlus className="w-5 h-5" />
          <span>Ajouter un Employé</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-brand-red animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user) => (
            <div key={user.id} className="bg-white rounded-3xl border border-brand-steel/10 p-6 shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="relative">
                  <div className="w-16 h-16 bg-brand-papaya rounded-2xl flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                    <UserCircle2 className="w-10 h-10 text-brand-steel" />
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${user.is_active ? 'bg-green-500' : 'bg-brand-red'}`} />
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setEditingUser(user)}
                    className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors"
                    title="Modifier"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDelete(user)}
                    className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 mb-6">
                <h3 className="text-xl font-bold text-brand-space">{user.username}</h3>
                <div className="flex items-center space-x-2">
                   <Shield className={`w-3.5 h-3.5 ${user.role === 'SUPER_ADMIN' ? 'text-brand-red' : 'text-blue-500'}`} />
                   <span className="text-xs font-bold uppercase tracking-wider text-brand-steel">
                    {user.role === 'SUPER_ADMIN' ? 'ADMINISTRATEUR' : (user.role === 'MANAGER' ? 'GÉRANT' : 'EMPLOYÉ')}
                   </span>
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t border-brand-papaya">
                <div className="flex items-center text-sm font-medium text-brand-steel">
                  <Building2 className="w-4 h-4 mr-3 text-brand-red" />
                  {user.gym_name || 'Multi-Salles'}
                </div>
                <div className="flex items-center text-sm font-medium text-brand-steel">
                  {user.is_active ? (
                    <CheckCircle2 className="w-4 h-4 mr-3 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-3 text-brand-red" />
                  )}
                  {user.is_active ? 'Compte Actif' : 'Compte Suspendu'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddStaffModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onRefresh={fetchUsers}
      />

      <EditStaffModal 
        isOpen={!!editingUser}
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onRefresh={fetchUsers}
      />
    </div>
  );
};

export default Personnel;

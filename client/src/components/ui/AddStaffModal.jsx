import { useState, useEffect } from 'react';
import { X, Loader2, UserPlus, Shield } from 'lucide-react';
import api from '../../services/api';
import { useToast } from './Toast';
import { getErrorMessage, ERROR_MESSAGES } from '../../utils/errorMessages';

const AddStaffModal = ({ isOpen, onClose, onRefresh }) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'STAFF'
  });
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchGyms = async () => {
        try {
          const res = await api.get('/gyms');
          setGyms(res.data.gyms);
          if (res.data.gyms.length > 0) {
            setFormData(prev => ({ ...prev, gym_id: res.data.gyms[0].id }));
          }
        } catch (err) {
          console.error('Failed to fetch gyms', err);
        }
      };
      fetchGyms();
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Note: We need a backend route for user creation
      await api.post('/audit/users', formData); 
      showToast('Compte employé créé avec succès !', 'success');
      onRefresh();
      onClose();
      setFormData({ username: '', password: '', role: 'STAFF' });
    } catch (err) {
      const status = err?.response?.status;
      if (status === 409) {
        showToast(ERROR_MESSAGES.STAFF_DUPLICATE_USER, 'error');
      } else if (formData.password && formData.password.length < 6) {
        showToast(ERROR_MESSAGES.STAFF_PASSWORD_SHORT, 'error');
      } else {
        showToast(getErrorMessage(err, ERROR_MESSAGES.STAFF_CREATE_FAIL), 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-space/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-brand-steel/10 animate-in zoom-in duration-200">
        <div className="px-8 py-6 bg-brand-papaya/30 border-b border-brand-steel/10 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-brand-space">Nouvel Employé</h2>
          <button onClick={onClose} className="p-2 hover:bg-brand-papaya rounded-lg transition-colors">
            <X className="w-6 h-6 text-brand-steel" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-steel uppercase ml-1">Nom d'utilisateur</label>
            <input
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-4 py-3 bg-brand-papaya/20 border border-brand-steel/10 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none"
              placeholder="Ex: ahmed_manager"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-steel uppercase ml-1">Mot de passe</label>
            <input
              required
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 bg-brand-papaya/20 border border-brand-steel/10 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none"
              placeholder="••••••••"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-steel uppercase ml-1">Rôle</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-4 py-3 bg-brand-papaya/20 border border-brand-steel/10 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none appearance-none"
              >
                <option value="STAFF">Employé (Vendeur)</option>
                <option value="SUPER_ADMIN">Administrateur</option>
              </select>
            </div>

            {formData.role !== 'SUPER_ADMIN' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-brand-steel uppercase ml-1">Affectation à une salle</label>
                <select
                  required
                  value={formData.gym_id || ''}
                  onChange={(e) => setFormData({ ...formData, gym_id: e.target.value })}
                  className="w-full px-4 py-3 bg-brand-papaya/20 border border-brand-steel/10 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none appearance-none"
                >
                  <option value="" disabled>Choisir...</option>
                  {gyms.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="pt-6 flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 border border-brand-steel/20 text-brand-space font-bold rounded-2xl hover:bg-brand-papaya transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-4 bg-brand-red text-brand-papaya font-bold rounded-2xl shadow-xl shadow-brand-red/20 hover:bg-brand-lava transition-all flex items-center justify-center space-x-2"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                <>
                  <UserPlus className="w-5 h-5" />
                  <span>Créer le compte</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStaffModal;

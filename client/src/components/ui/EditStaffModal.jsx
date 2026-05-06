import { useState, useEffect } from 'react';
import { X, Loader2, Save, Shield } from 'lucide-react';
import api from '../../services/api';
import { useToast } from './Toast';
import { getErrorMessage, ERROR_MESSAGES } from '../../utils/errorMessages';

const EditStaffModal = ({ isOpen, user, onClose, onRefresh }) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'STAFF',
    is_active: true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        username: user.username || '',
        password: '',
        role: user.role || 'STAFF',
        is_active: user.is_active !== undefined ? user.is_active : true
      });
    }
  }, [isOpen, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/audit/users/${user.id}`, formData); 
      showToast('Employé modifié avec succès !', 'success');
      onRefresh();
      onClose();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 409) {
        showToast(ERROR_MESSAGES.STAFF_DUPLICATE_USER, 'error');
      } else {
        showToast(getErrorMessage(err, ERROR_MESSAGES.STAFF_UPDATE_FAIL), 'error');
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
          <h2 className="text-2xl font-bold text-brand-space">Modifier l'Employé</h2>
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
            <label className="text-xs font-bold text-brand-steel uppercase ml-1">Mot de passe (Laisser vide pour ne pas changer)</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 bg-brand-papaya/20 border border-brand-steel/10 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center space-x-3 p-1">
             <input 
               type="checkbox"
               id="is_active"
               checked={formData.is_active}
               onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
               className="w-5 h-5 rounded border-brand-steel/20 text-brand-red focus:ring-brand-red cursor-pointer"
             />
             <label htmlFor="is_active" className="text-sm font-bold text-brand-space cursor-pointer">Compte Actif</label>
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
                  <Save className="w-5 h-5" />
                  <span>Enregistrer</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditStaffModal;

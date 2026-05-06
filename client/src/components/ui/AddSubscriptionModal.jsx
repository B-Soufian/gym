import { useState, useEffect } from 'react';
import { X, Loader2, Tag, Plus } from 'lucide-react';
import api from '../../services/api';
import { useToast } from './Toast';
import { getErrorMessage, ERROR_MESSAGES } from '../../utils/errorMessages';

const AddSubscriptionModal = ({ isOpen, onClose, onRefresh }) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    duration_days: 30,
    gym_id: '',
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
      await api.post('/subscriptions', formData);
      showToast('Offre créée avec succès !', 'success');
      onRefresh();
      onClose();
      setFormData({ name: '', price: '', duration_days: 30, gym_id: gyms[0]?.id || '' });
    } catch (err) {
      const price = parseFloat(formData.price);
      const days = parseInt(formData.duration_days);
      if (isNaN(price) || price <= 0) {
        showToast(ERROR_MESSAGES.SUB_PRICE_INVALID, 'error');
      } else if (isNaN(days) || days <= 0) {
        showToast(ERROR_MESSAGES.SUB_DAYS_INVALID, 'error');
      } else {
        showToast(getErrorMessage(err, ERROR_MESSAGES.SUB_CREATE_FAIL), 'error');
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
          <h2 className="text-2xl font-bold text-brand-space flex items-center">
            <Plus className="w-6 h-6 mr-2 text-brand-red" />
            Nouvelle Offre
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-brand-papaya rounded-lg transition-colors">
            <X className="w-6 h-6 text-brand-steel" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-steel uppercase ml-1">Nom de l'offre</label>
            <input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-brand-papaya/20 border border-brand-steel/10 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none"
              placeholder="Ex: Abonnement Annuel"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-steel uppercase ml-1">Prix (DH)</label>
              <input
                required
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-3 bg-brand-papaya/20 border border-brand-steel/10 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none font-bold text-brand-red"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-steel uppercase ml-1">Durée (Jours)</label>
              <input
                required
                type="number"
                value={formData.duration_days}
                onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                className="w-full px-4 py-3 bg-brand-papaya/20 border border-brand-steel/10 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none"
                placeholder="30"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-steel uppercase ml-1">Salle (Optionnel)</label>
            <select
              value={formData.gym_id}
              onChange={(e) => setFormData({ ...formData, gym_id: e.target.value })}
              className="w-full px-4 py-3 bg-brand-papaya/20 border border-brand-steel/10 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none appearance-none"
            >
              <option value="">Toutes les salles</option>
              {gyms.map(gym => (
                <option key={gym.id} value={gym.id}>{gym.name}</option>
              ))}
            </select>
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
                  <span>Enregistrer l'offre</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSubscriptionModal;

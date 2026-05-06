import { useState, useEffect } from 'react';
import { X, Loader2, Save, Tag } from 'lucide-react';
import api from '../../services/api';
import { useToast } from './Toast';
import { getErrorMessage, ERROR_MESSAGES } from '../../utils/errorMessages';

const EditSubscriptionModal = ({ isOpen, onClose, onRefresh, subscription }) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    duration_days: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (subscription) {
      setFormData({
        name: subscription.name,
        price: subscription.price,
        duration_days: subscription.duration_days,
      });
    }
  }, [subscription]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/subscriptions/${subscription.id}`, formData);
      showToast('Offre modifiée avec succès !', 'success');
      onRefresh();
      onClose();
    } catch (err) {
      const price = parseFloat(formData.price);
      const days = parseInt(formData.duration_days);
      if (isNaN(price) || price <= 0) {
        showToast(ERROR_MESSAGES.SUB_PRICE_INVALID, 'error');
      } else if (isNaN(days) || days <= 0) {
        showToast(ERROR_MESSAGES.SUB_DAYS_INVALID, 'error');
      } else {
        showToast(getErrorMessage(err, ERROR_MESSAGES.SUB_UPDATE_FAIL), 'error');
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
            <Tag className="w-6 h-6 mr-2 text-brand-red" />
            Modifier l'Offre
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
              />
            </div>
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

export default EditSubscriptionModal;

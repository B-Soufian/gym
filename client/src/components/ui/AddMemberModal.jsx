import { useState, useEffect } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import api from '../../services/api';
import { useToast } from './Toast';
import { getErrorMessage, ERROR_MESSAGES } from '../../utils/errorMessages';

const AddMemberModal = ({ isOpen, onClose, onRefresh }) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '+212 ',
    gender: 'MALE',
    gym_id: '',
    subscription_id: '',
    custom_id: '',
    subscription_start: new Date().toISOString().split('T')[0],
    has_insurance: true,
  });
  const [gyms, setGyms] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          const [gymRes, subRes] = await Promise.all([
            api.get('/gyms'),
            api.get('/subscriptions')
          ]);
          setGyms(gymRes.data.gyms);
          setSubscriptions(subRes.data.subscriptions);
          
          // Auto-select first gym and subscription
          if (gymRes.data.gyms.length > 0) {
            setFormData(prev => ({ ...prev, gym_id: gymRes.data.gyms[0].id }));
          }
        } catch (err) {
          console.error('Failed to fetch modal data', err);
        } finally {
          setFetching(false);
        }
      };
      fetchData();
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate Moroccan phone number: +212 followed by exactly 9 digits
    const phoneRegex = /^\+212[0-9]{9}$/;
    if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      showToast('Numéro de téléphone invalide. Format attendu : +212612345678 (9 chiffres après +212)', 'error');
      return;
    }

    setLoading(true);
    try {
      let sub_end = null;
      if (formData.subscription_id && formData.subscription_start) {
        const sub = subscriptions.find(s => s.id === parseInt(formData.subscription_id));
        if (sub) {
          const startDate = new Date(formData.subscription_start);
          startDate.setDate(startDate.getDate() + sub.duration_days);
          sub_end = startDate.toISOString().split('T')[0];
        }
      }

      await api.post('/members', {
        ...formData,
        registration_date: formData.subscription_start,
        subscription_end: sub_end
      });
      
      showToast('Membre ajouté avec succès !', 'success');
      onRefresh();
      onClose();
      setFormData({
        first_name: '',
        last_name: '',
        phone: '',
        gender: 'MALE',
        gym_id: gyms[0]?.id || '',
        subscription_id: '',
        custom_id: '',
        subscription_start: new Date().toISOString().split('T')[0],
        has_insurance: true,
      });
    } catch (err) {
      const serverError = err.response?.data?.error || err.response?.data?.message || '';
      if (serverError.toLowerCase().includes('téléphone') || serverError.toLowerCase().includes('phone')) {
        showToast(ERROR_MESSAGES.MEMBER_DUPLICATE_PHONE, 'error');
      } else if (serverError.toLowerCase().includes('id unique') || serverError.toLowerCase().includes('badge') || serverError.toLowerCase().includes('custom_id')) {
        showToast(ERROR_MESSAGES.MEMBER_DUPLICATE_ID, 'error');
      } else if (serverError.toLowerCase().includes('prénom') || serverError.toLowerCase().includes('nom') || serverError.toLowerCase().includes('existe déjà')) {
        showToast(ERROR_MESSAGES.MEMBER_DUPLICATE_NAME, 'error');
      } else if (serverError) {
        showToast(serverError, 'error');
      } else {
        showToast(getErrorMessage(err, ERROR_MESSAGES.MEMBER_CREATE_FAIL), 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (e, field) => {
    const value = e.target.value.replace(/[0-9]/g, '');
    setFormData({ ...formData, [field]: value });
  };

  const handlePhoneChange = (e) => {
    let value = e.target.value;
    // Allow '+' only at the start, then only digits
    const cleaned = value.startsWith('+') 
      ? '+' + value.slice(1).replace(/\D/g, '')
      : value.replace(/\D/g, '');
    
    if (cleaned === '' || cleaned === '+') {
      setFormData({ ...formData, phone: '+212' });
    } else if (!cleaned.startsWith('+212')) {
      // If user tries to delete prefix, force it back
      setFormData({ ...formData, phone: '+212' + cleaned.replace(/^212/, '') });
    } else {
      setFormData({ ...formData, phone: cleaned });
    }
  };

  const handleIdChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Digits only
    setFormData({ ...formData, custom_id: value });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-space/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-brand-steel/10 animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 bg-brand-papaya/30 border-b border-brand-steel/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-brand-space">Nouveau Membre</h2>
          <button onClick={onClose} className="p-2 hover:bg-brand-papaya rounded-lg transition-colors">
            <X className="w-5 h-5 text-brand-steel" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-steel uppercase ml-1">Prénom <span className="text-brand-red">*</span></label>
              <input
                required
                value={formData.first_name}
                onChange={(e) => handleNameChange(e, 'first_name')}
                className="w-full px-4 py-2 bg-brand-papaya/20 border border-brand-steel/10 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none"
                placeholder="Ex: Youssef"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-steel uppercase ml-1">Nom <span className="text-brand-red">*</span></label>
              <input
                required
                value={formData.last_name}
                onChange={(e) => handleNameChange(e, 'last_name')}
                className="w-full px-4 py-2 bg-brand-papaya/20 border border-brand-steel/10 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none"
                placeholder="Ex: El Amrani"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-steel uppercase ml-1">Téléphone <span className="text-brand-red">*</span></label>
            <input
              required
              value={formData.phone}
              onChange={handlePhoneChange}
              className="w-full px-4 py-2 bg-brand-papaya/20 border border-brand-steel/10 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none"
              placeholder="+212 6..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-steel uppercase ml-1">Genre</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-4 py-2 bg-brand-papaya/20 border border-brand-steel/10 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none appearance-none"
              >
                <option value="MALE">Homme</option>
                <option value="FEMALE">Femme</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-steel uppercase ml-1">Salle (Gym) <span className="text-brand-red">*</span></label>
              <select
                required
                value={formData.gym_id}
                onChange={(e) => setFormData({ ...formData, gym_id: e.target.value })}
                className="w-full px-4 py-2 bg-brand-papaya/20 border border-brand-steel/10 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none appearance-none"
              >
                {gyms.map(gym => (
                  <option key={gym.id} value={gym.id}>{gym.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-steel uppercase ml-1">ID Unique (Badge) <span className="text-brand-red">*</span></label>
              <input
                required
                type="text"
                inputMode="numeric"
                value={formData.custom_id}
                onChange={handleIdChange}
                className="w-full px-4 py-2 bg-brand-papaya/20 border border-brand-steel/10 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none"
                placeholder="Ex: 12345"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-steel uppercase ml-1">Date d'inscription <span className="text-brand-red">*</span></label>
              <input
                type="date"
                required
                value={formData.subscription_start}
                onChange={(e) => setFormData({ ...formData, subscription_start: e.target.value })}
                className="w-full px-4 py-2 bg-brand-papaya/20 border border-brand-steel/10 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-steel uppercase ml-1">Plan (Abonnement) <span className="text-brand-red">*</span></label>
            <select
              required
              value={formData.subscription_id}
              onChange={(e) => setFormData({ ...formData, subscription_id: e.target.value })}
              className="w-full px-4 py-2 bg-brand-papaya/20 border border-brand-steel/10 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none appearance-none"
            >
              <option value="">-- Sélectionner un plan (Obligatoire) --</option>
              {subscriptions.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name} ({sub.duration_days} jours - {sub.price} DH)</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-steel uppercase ml-1">Assurance Annuelle (100 DH)</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, has_insurance: true })}
                className={`py-2 rounded-xl font-bold border transition-all ${
                  formData.has_insurance
                  ? 'bg-brand-space text-white border-brand-space shadow-md' 
                  : 'bg-white text-brand-steel border-brand-steel/20 hover:bg-brand-papaya'
                }`}
              >
                Oui (Inclure)
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, has_insurance: false })}
                className={`py-2 rounded-xl font-bold border transition-all ${
                  !formData.has_insurance
                  ? 'bg-brand-space text-white border-brand-space shadow-md' 
                  : 'bg-white text-brand-steel border-brand-steel/20 hover:bg-brand-papaya'
                }`}
              >
                Non
              </button>
            </div>
          </div>

          <div className="pt-4 flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-brand-steel/20 text-brand-space font-bold rounded-xl hover:bg-brand-papaya transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || fetching}
              className="flex-1 py-3 bg-brand-red text-brand-papaya font-bold rounded-xl shadow-lg shadow-brand-red/20 hover:bg-brand-lava transition-all flex items-center justify-center space-x-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
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

export default AddMemberModal;

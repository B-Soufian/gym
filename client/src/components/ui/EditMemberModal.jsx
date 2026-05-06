import { useState, useEffect } from 'react';
import { X, Loader2, Save, User } from 'lucide-react';
import api from '../../services/api';
import { useToast } from './Toast';

const EditMemberModal = ({ isOpen, onClose, onRefresh, member }) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    gender: 'MALE',
    custom_id: '',
    insurance_end: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (member) {
      setFormData({
        first_name: member.first_name,
        last_name: member.last_name,
        phone: member.phone,
        email: member.email || '',
        gender: member.gender || 'MALE',
        custom_id: member.custom_id || '',
        insurance_end: member.insurance_end ? new Date(member.insurance_end).toISOString().split('T')[0] : '',
      });
    }
  }, [member]);

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
      await api.put(`/members/${member.id}`, formData);
      showToast('Membre modifié avec succès !', 'success');
      onRefresh();
      onClose();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Erreur lors de la modification';
      showToast(errorMsg, 'error');
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
    if (!value.startsWith('+212')) {
      value = '+212 ' + value.replace(/^\+?212\s?/, '');
    }
    setFormData({ ...formData, phone: value });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-space/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-brand-steel/10 animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 bg-brand-papaya/30 border-b border-brand-steel/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-brand-space flex items-center">
            <User className="w-5 h-5 mr-2 text-brand-red" />
            Modifier le Membre
          </h2>
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
              <label className="text-xs font-bold text-brand-steel uppercase ml-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 bg-brand-papaya/20 border border-brand-steel/10 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none"
                placeholder="Ex: contact@email.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-steel uppercase ml-1">ID Unique <span className="text-brand-red">*</span></label>
              <input
                disabled
                value={formData.custom_id}
                className="w-full px-4 py-2 bg-brand-papaya/10 border border-brand-steel/5 rounded-xl outline-none cursor-not-allowed opacity-70 font-bold text-brand-space"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-steel uppercase ml-1">Assurance valide jusqu'au</label>
              <input
                type="date"
                value={formData.insurance_end}
                onChange={(e) => setFormData({ ...formData, insurance_end: e.target.value })}
                className="w-full px-4 py-2 bg-brand-papaya/20 border border-brand-steel/10 rounded-xl focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none"
              />
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
              disabled={loading}
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

export default EditMemberModal;

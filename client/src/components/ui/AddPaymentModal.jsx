import { useState, useEffect } from 'react';
import { X, Loader2, DollarSign, User, Calendar, Search } from 'lucide-react';
import api from '../../services/api';
import { useToast } from './Toast';
import useAuthStore from '../../stores/authStore';
import { getErrorMessage, ERROR_MESSAGES } from '../../utils/errorMessages';

const AddPaymentModal = ({ isOpen, onClose, onRefresh, initialMember }) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    member_id: '',
    subscription_id: '',
    amount: '',
    payment_method: 'CASH',
    notes: '',
    is_insurance_renewal: false,
  });
  const [members, setMembers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (isOpen && initialMember) {
      setFormData(prev => ({ ...prev, member_id: initialMember.id }));
      setSearchTerm(`${initialMember.first_name} ${initialMember.last_name} (${initialMember.custom_id || initialMember.phone})`);
    } else if (!isOpen) {
      setFormData({ member_id: '', subscription_id: '', amount: '', payment_method: 'CASH', notes: '', is_insurance_renewal: false });
      setSearchTerm('');
    }
  }, [isOpen, initialMember]);



  const maskPhone = (phone) => {
    if (!phone) return 'N/A';
    if (isAdmin) return phone;
    return phone.length > 4 
      ? `${phone.substring(0, 2)}****${phone.substring(phone.length - 2)}`
      : '****';
  };

  const filteredMembers = members.filter(m => {
    const searchStr = searchTerm.trim().toLowerCase();
    if (searchStr === '') return false;

    const phone = (m.phone || '').toLowerCase();
    const customId = (m.custom_id || '').toLowerCase();
    const id = m.id.toString();
    const firstName = m.first_name.toLowerCase();
    const lastName = m.last_name.toLowerCase();
    const fullName = `${firstName} ${lastName}`;
    const reverseName = `${lastName} ${firstName}`;

    if (searchStr.startsWith('+')) {
      return !isAdmin ? phone === searchStr : phone.startsWith(searchStr);
    }

    if (!isAdmin) {
      return customId === searchStr || 
             id === searchStr ||
             fullName === searchStr ||
             reverseName === searchStr;
    } else {
      return customId.includes(searchStr) ||
             id.includes(searchStr) ||
             fullName.includes(searchStr) ||
             reverseName.includes(searchStr);
    }
  });

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          const [memRes, subRes] = await Promise.all([
            api.get('/members'),
            api.get('/subscriptions')
          ]);
          setMembers(memRes.data.members);
          setSubscriptions(subRes.data.subscriptions);
        } catch (err) {
          console.error('Failed to fetch modal data', err);
        }
      };
      fetchData();
    }
  }, [isOpen]);

  const handleSubChange = (e) => {
    const sub = subscriptions.find(s => s.id === parseInt(e.target.value));
    setFormData({
      ...formData,
      subscription_id: e.target.value,
      amount: sub ? sub.price : '',
    });
  };

  const selectedMemberData = members.find(m => m.id === formData.member_id);
  const isInsuranceValid = selectedMemberData?.insurance_end && new Date(selectedMemberData.insurance_end) > new Date();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!formData.member_id) {
        showToast(ERROR_MESSAGES.PAYMENT_NO_MEMBER, 'error');
        setLoading(false);
        return;
      }
      await api.post('/payments', formData);
      onRefresh();
      onClose();
      setFormData({ member_id: '', subscription_id: '', amount: '', payment_method: 'CASH', notes: '', is_insurance_renewal: false });
      setSearchTerm('');
      showToast('Paiement enregistré avec succès', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, ERROR_MESSAGES.PAYMENT_CREATE_FAIL), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-space/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-brand-steel/10 animate-in zoom-in duration-200">
        <div className="px-8 py-6 bg-brand-papaya/30 border-b border-brand-steel/10 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-brand-space flex items-center">
            <DollarSign className="w-6 h-6 mr-2 text-brand-red" />
            Nouveau Paiement
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-brand-papaya rounded-lg transition-colors">
            <X className="w-6 h-6 text-brand-steel" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="space-y-1 relative">
            <label className="text-xs font-bold text-brand-steel uppercase ml-1">Sélectionner le Membre</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-steel" />
              <input
                type="text"
                required={!formData.member_id}
                placeholder="Rechercher par nom, téléphone, ID..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsDropdownOpen(true);
                  if (formData.member_id) setFormData({ ...formData, member_id: '' });
                }}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                className="w-full pl-11 pr-4 py-3 bg-brand-papaya/20 border border-brand-steel/10 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none"
              />
              
              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-brand-steel/10 rounded-xl shadow-xl max-h-60 overflow-auto">
                  {filteredMembers.length > 0 ? (
                    filteredMembers.map(m => (
                      <div
                        key={m.id}
                        onClick={() => {
                          setFormData({ ...formData, member_id: m.id });
                          setSearchTerm(`${m.first_name} ${m.last_name} (${m.custom_id || m.phone})`);
                          setIsDropdownOpen(false);
                        }}
                        className="px-4 py-3 hover:bg-brand-papaya/40 cursor-pointer border-b border-brand-steel/5 last:border-0 transition-colors"
                      >
                        <div className="font-bold text-brand-space flex justify-between items-center">
                          <span>{m.first_name} {m.last_name}</span>
                          {m.custom_id && <span className="text-xs px-2 py-1 bg-brand-papaya/50 rounded-md text-brand-steel">{m.custom_id}</span>}
                        </div>
                        <div className="text-xs text-brand-steel mt-1">{maskPhone(m.phone)}</div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-sm text-brand-steel text-center italic">
                      {!isAdmin && searchTerm.trim() === '' 
                        ? 'Tapez le nom complet ou l\'ID exact pour rechercher...' 
                        : (!isAdmin ? 'Aucun membre trouvé (vérifiez l\'orthographe exacte)' : 'Aucun membre trouvé')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-steel uppercase ml-1">Plan (Abonnement)</label>
              <select
                value={formData.subscription_id}
                onChange={handleSubChange}
                className="w-full px-4 py-3 bg-brand-papaya/20 border border-brand-steel/10 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none appearance-none"
              >
                <option value="">Paiement libre (Optionnel)</option>
                {subscriptions.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.price} DH)</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-steel uppercase ml-1">Montant à Payer (DH)</label>
              <input
                required
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-4 py-3 bg-brand-papaya/20 border border-brand-steel/10 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none font-bold text-brand-red"
              />
            </div>
          </div>

          <div className={`flex items-center space-x-3 p-4 rounded-xl border transition-all ${isInsuranceValid ? 'bg-green-50 border-green-200' : 'bg-brand-papaya/30 border-brand-steel/10'}`}>
            <input
              type="checkbox"
              id="insurance_renewal"
              disabled={isInsuranceValid}
              checked={isInsuranceValid ? false : formData.is_insurance_renewal}
              onChange={(e) => {
                const checked = e.target.checked;
                let newAmount = parseFloat(formData.amount) || 0;
                if (checked) newAmount += 100;
                else newAmount = Math.max(0, newAmount - 100);
                
                setFormData({ 
                  ...formData, 
                  is_insurance_renewal: checked,
                  amount: newAmount > 0 ? newAmount : ''
                });
              }}
              className="w-5 h-5 accent-brand-red rounded focus:ring-brand-red cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <label htmlFor="insurance_renewal" className={`text-sm font-bold select-none ${isInsuranceValid ? 'text-green-700 cursor-not-allowed' : 'text-brand-space cursor-pointer'}`}>
              {isInsuranceValid 
                ? `Assurance valide jusqu'au ${new Date(selectedMemberData.insurance_end).toLocaleDateString('fr-FR')} (Non modifiable)`
                : "Inclure le renouvellement d'assurance (+100 DH / 1 an)"}
            </label>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-steel uppercase ml-1">Méthode de Paiement</label>
            <div className="grid grid-cols-2 gap-3">
              {['CASH', 'CARD'].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setFormData({ ...formData, payment_method: method })}
                  className={`py-3 rounded-xl font-bold border transition-all ${
                    formData.payment_method === method 
                    ? 'bg-brand-space text-white border-brand-space shadow-md' 
                    : 'bg-white text-brand-steel border-brand-steel/20 hover:bg-brand-papaya'
                  }`}
                >
                  {method}
                </button>
              ))}
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
                  <span>Confirmer le Paiement</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPaymentModal;

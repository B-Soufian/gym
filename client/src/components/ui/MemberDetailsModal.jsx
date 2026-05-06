import { useState, useEffect } from 'react';
import { X, User, Calendar, Phone, Mail, Building2, Shield, Activity } from 'lucide-react';
import api from '../../services/api';
import useAuthStore from '../../stores/authStore';

const MemberDetailsModal = ({ isOpen, onClose, memberId }) => {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(false);
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'SUPER_ADMIN';

  const maskPhone = (phone) => {
    if (!phone) return 'N/A';
    if (isAdmin) return phone;
    return phone.length > 4 
      ? `${phone.substring(0, 2)}****${phone.substring(phone.length - 2)}`
      : '****';
  };

  useEffect(() => {
    if (isOpen && memberId) {
      const fetchDetails = async () => {
        setLoading(true);
        try {
          const res = await api.get(`/members/${memberId}`);
          setMember(res.data.member);
        } catch (err) {
          console.error('Failed to fetch member details', err);
        } finally {
          setLoading(false);
        }
      };
      fetchDetails();
    }
  }, [isOpen, memberId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-space/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-brand-steel/10 animate-in zoom-in duration-300">
        <div className="px-8 py-6 bg-gradient-to-r from-brand-papaya/50 to-white border-b border-brand-steel/10 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-brand-space flex items-center group">
            <Activity className="w-6 h-6 mr-2 text-brand-red group-hover:rotate-12 transition-transform duration-300" />
            Fiche Membre
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-brand-red/10 hover:text-brand-red rounded-xl transition-all active:scale-95 group">
            <X className="w-6 h-6 text-brand-steel group-hover:text-brand-red transition-colors" />
          </button>
        </div>

        {loading ? (
          <div className="p-20 text-center">
            <Activity className="w-12 h-12 text-brand-red animate-spin mx-auto" />
            <p className="mt-4 text-brand-steel font-bold animate-pulse">Chargement du profil...</p>
          </div>
        ) : member ? (
          <div className="p-8 space-y-8">
            <div className="flex items-center space-x-6">
              <div className="w-24 h-24 rounded-3xl bg-brand-space text-white flex items-center justify-center text-4xl font-black shadow-xl hover:scale-105 hover:-rotate-3 transition-all duration-300 cursor-default">
                {member.first_name?.[0] || '?'}{member.last_name?.[0] || '?'}
              </div>
              <div className="group cursor-default">
                <h3 className="text-2xl font-black text-brand-space group-hover:text-brand-red transition-colors duration-300">{member.first_name} {member.last_name}</h3>
                <p className="text-brand-steel font-bold mt-1">ID: #{member.custom_id || member.id}</p>
                <span className={`inline-block mt-2 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest border shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105 ${
                  member.status === 'ACTIVE' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'
                }`}>
                  {member.status === 'ACTIVE' ? 'ACTIF' : (member.status === 'FROZEN' ? 'GELÉ' : 'EXPIRÉ')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center p-3 rounded-xl hover:bg-brand-papaya/50 transition-all duration-300 cursor-default group hover:scale-[1.02]">
                  <div className="p-2 bg-brand-papaya rounded-lg mr-3 group-hover:scale-110 group-hover:bg-brand-red/10 transition-all duration-300">
                    <Phone className="w-5 h-5 text-brand-red" />
                  </div>
                  <span className="text-brand-space font-bold">{maskPhone(member.phone)}</span>
                </div>
                <div className="flex items-center p-3 rounded-xl hover:bg-brand-papaya/50 transition-all duration-300 cursor-default group hover:scale-[1.02]">
                  <div className="p-2 bg-brand-papaya rounded-lg mr-3 group-hover:scale-110 group-hover:bg-brand-red/10 transition-all duration-300">
                    <Mail className="w-5 h-5 text-brand-red" />
                  </div>
                  <span className="text-brand-space font-bold">{member.email || 'Aucun email'}</span>
                </div>
                <div className="flex items-center p-3 rounded-xl hover:bg-brand-papaya/50 transition-all duration-300 cursor-default group hover:scale-[1.02]">
                  <div className="p-2 bg-brand-papaya rounded-lg mr-3 group-hover:scale-110 group-hover:bg-brand-red/10 transition-all duration-300">
                    <Building2 className="w-5 h-5 text-brand-red" />
                  </div>
                  <span className="text-brand-space font-bold">{member.gym_name || 'Salle Principale'}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center p-3 rounded-xl hover:bg-brand-papaya/50 transition-all duration-300 cursor-default group hover:scale-[1.02]">
                  <div className="p-2 bg-brand-papaya rounded-lg mr-3 group-hover:scale-110 group-hover:bg-brand-red/10 transition-all duration-300">
                    <Calendar className="w-5 h-5 text-brand-red" />
                  </div>
                  <span className="text-brand-steel font-bold">Fin: {member.subscription_end ? new Date(member.subscription_end).toLocaleDateString('fr-FR') : 'N/A'}</span>
                </div>
                <div className="flex items-center p-3 rounded-xl hover:bg-brand-papaya/50 transition-all duration-300 cursor-default group hover:scale-[1.02]">
                  <div className="p-2 bg-brand-papaya rounded-lg mr-3 group-hover:scale-110 group-hover:bg-brand-red/10 transition-all duration-300">
                    <Shield className="w-5 h-5 text-brand-red" />
                  </div>
                  <span className="text-brand-steel font-bold">Inscrit: {member.created_at ? new Date(member.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}</span>
                </div>
                <div className="flex items-center p-3 rounded-xl hover:bg-brand-papaya/50 transition-all duration-300 cursor-default group hover:scale-[1.02]">
                  <div className="p-2 bg-brand-papaya rounded-lg mr-3 group-hover:scale-110 group-hover:bg-brand-red/10 transition-all duration-300">
                    <Shield className={`w-5 h-5 ${(!member.insurance_end || new Date(member.insurance_end) < new Date()) ? 'text-brand-red' : 'text-green-500'}`} />
                  </div>
                  <span className="text-brand-steel font-bold">
                    Assurance: {member.insurance_end ? new Date(member.insurance_end).toLocaleDateString('fr-FR') : 'Non payée'} 
                    {(!member.insurance_end || new Date(member.insurance_end) < new Date()) && <span className="ml-2 text-xs bg-brand-red text-white px-2 py-0.5 rounded-full">Expirée</span>}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                onClick={onClose}
                className="w-full py-4 bg-brand-space text-white font-black rounded-2xl shadow-xl hover:bg-brand-lava hover:shadow-brand-lava/20 transition-all duration-300 hover:-translate-y-1 active:translate-y-0"
              >
                Fermer la fiche
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default MemberDetailsModal;

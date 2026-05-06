import { useState, useEffect } from 'react';
import { 
  Search, 
  UserPlus, 
  Filter, 
  Eye, 
  Edit2, 
  Snowflake, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
  MessageSquare
} from 'lucide-react';
import api from '../services/api';
import AddMemberModal from '../components/ui/AddMemberModal';
import EditMemberModal from '../components/ui/EditMemberModal';
import MemberDetailsModal from '../components/ui/MemberDetailsModal';
import BulkMessageModal from '../components/ui/BulkMessageModal';
import ConfirmModal from '../components/ui/ConfirmModal';
import PromptModal from '../components/ui/PromptModal';
import useAuthStore from '../stores/authStore';
import { useToast } from '../components/ui/Toast';

const Members = () => {
  const { showToast } = useToast();
  const { user, selectedGymId } = useAuthStore();
  const isAdmin = user?.role === 'SUPER_ADMIN';
  const isStaff = user?.role === 'STAFF';

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, memberId: null });
  const [promptModal, setPromptModal] = useState({ isOpen: false, memberId: null });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [viewingMemberId, setViewingMemberId] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchMembers = async () => {
    // Blind search logic: only for STAFF, require search term
    if (isStaff && searchTerm.trim().length === 0) {
      setMembers([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get('/members', {
        params: {
          search: searchTerm,
          status: statusFilter,
          page,
          limit: 10
        }
      });
      setMembers(response.data.members);
      setTotal(response.data.total);
    } catch (err) {
      console.error('Failed to fetch members', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1); // Reset to first page on search/filter/gym change
  }, [searchTerm, statusFilter, selectedGymId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMembers();
      setSelectedMembers([]);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, page, selectedGymId]);

  const maskPhone = (phone) => {
    if (!phone) return 'N/A';
    if (isAdmin) return phone;
    // Mask for staff: 06****54
    return phone.length > 4 
      ? `${phone.substring(0, 2)}****${phone.substring(phone.length - 2)}`
      : '****';
  };

  const handleExport = () => {
    if (!isAdmin) return;
    if (members.length === 0) {
      showToast('Aucun membre à exporter', 'warning');
      return;
    }
    const headers = ['Nom', 'Prénom', 'Téléphone', 'Email', 'Statut', 'Fin Abonnement'];
    const csvContent = [
      headers.join(','),
      ...members.map(m => [
        `"${m.last_name}"`,
        `"${m.first_name}"`,
        `"${m.phone}"`,
        `"${m.email || ''}"`,
        m.status,
        m.subscription_end ? new Date(m.subscription_end).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `membres_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedMembers(members);
    } else {
      setSelectedMembers([]);
    }
  };

  const handleSelectMember = (member) => {
    if (selectedMembers.find(m => m.id === member.id)) {
      setSelectedMembers(selectedMembers.filter(m => m.id !== member.id));
    } else {
      setSelectedMembers([...selectedMembers, member]);
    }
  };

  const executeDelete = async (id) => {
    try {
      await api.delete(`/members/${id}`);
      showToast('Membre supprimé avec succès', 'success');
      fetchMembers();
    } catch (err) {
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const handleDelete = (id) => {
    if (!isAdmin) return;
    setConfirmModal({ isOpen: true, memberId: id });
  };

  const executeFreeze = async (id, days) => {
    if (days && !isNaN(days)) {
      try {
        await api.post(`/members/${id}/freeze`, { days: parseInt(days) });
        showToast(`Abonnement gelé pour ${days} jours`, 'success');
        fetchMembers();
      } catch (err) {
        showToast(err.response?.data?.error || 'Erreur lors du gel', 'error');
      }
    } else {
      showToast('Nombre de jours invalide', 'error');
    }
  };

  const handleFreeze = (id) => {
    setPromptModal({ isOpen: true, memberId: id });
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'FROZEN': return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'EXPIRED': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'DELETED': return 'bg-gray-50 text-gray-700 border-gray-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'ACTIVE': return 'Actif';
      case 'FROZEN': return 'Gelé';
      case 'EXPIRED': return 'Expiré';
      case 'DELETED': return 'Supprimé';
      default: return status;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-brand-space tracking-tight">Gestion des Membres</h1>
          <p className="text-brand-steel font-medium  mt-1">Gérez vos adhérents, abonnements et paiements</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {selectedMembers.length > 0 && isAdmin && (
            <button 
              onClick={() => setIsMessageModalOpen(true)}
              className="flex items-center px-5 py-2.5 bg-green-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-500/20 hover:bg-green-600 transition-all hover:scale-[1.02] active:scale-95"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Message ({selectedMembers.length})
            </button>
          )}
          {isAdmin && (
            <button 
              onClick={handleExport}
              className="flex items-center px-5 py-2.5 bg-white border border-brand-steel/10 rounded-xl text-sm font-bold text-brand-space hover:bg-brand-papaya hover:border-brand-steel/30 transition-all shadow-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </button>
          )}
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center px-6 py-2.5 bg-brand-red text-brand-papaya rounded-xl text-sm font-bold shadow-xl shadow-brand-red/20 hover:bg-brand-lava transition-all transform hover:scale-[1.02] active:scale-95"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Nouveau Membre
          </button>
        </div>
      </div>

      {/* Search & Filters Card */}
      <div className="bg-white p-4 md:p-8 rounded-[2rem] border border-brand-steel/10 shadow-xl shadow-brand-space/5 flex flex-col gap-4 md:gap-8 transition-all">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-steel group-focus-within:text-brand-red transition-all w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher par nom, id, téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-brand-papaya/20 border border-brand-steel/5 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-red/10 focus:border-brand-red focus:bg-white transition-all placeholder-brand-steel/40"
            />
          </div>
          
          {isAdmin && (
            <div className="flex items-center gap-4">
              <div className="relative group min-w-[180px]">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-steel group-focus-within:text-brand-red transition-colors" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-11 pr-10 py-3 bg-brand-papaya/20 border border-brand-steel/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red/5 focus:border-brand-red focus:bg-white text-sm font-bold text-brand-space appearance-none transition-all cursor-pointer"
                >
                  <option value="">Tous les statuts</option>
                  <option value="ACTIVE">Actifs</option>
                  <option value="FROZEN">Gelés</option>
                  <option value="EXPIRED">Expirés</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-brand-steel">
                  <ChevronLeft className="w-4 h-4 -rotate-90" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Members Table */}
      {(isStaff && searchTerm === '' && members.length === 0) ? (
        <div className="bg-white rounded-[2.5rem] border border-brand-steel/10 p-12 md:p-32 text-center space-y-6 shadow-xl shadow-brand-space/5 m-2 md:m-0">
          <div className="w-20 h-20 md:w-24 md:h-24 bg-brand-papaya rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce duration-1000">
             <Search className="w-10 h-10 md:w-12 md:h-12 text-brand-red/40" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl md:text-2xl font-bold text-brand-space">Prêt pour la recherche</h3>
            <p className="text-brand-steel max-w-xs mx-auto text-base md:text-lg">Les résultats s'afficheront ici une fois que vous aurez saisi un critère.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border border-brand-steel/10 shadow-2xl shadow-brand-space/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-brand-papaya/10 border-b border-brand-steel/5">
                  {isAdmin && (
                    <th className="pl-8 pr-4 py-6 w-12">
                      <input 
                        type="checkbox" 
                        onChange={handleSelectAll}
                        checked={members.length > 0 && selectedMembers.length === members.length}
                        className="w-5 h-5 rounded-lg border-brand-steel/20 text-brand-red focus:ring-brand-red cursor-pointer transition-all"
                      />
                    </th>
                  )}
                  <th className="px-6 py-6 text-[11px] font-black text-brand-steel uppercase tracking-[0.2em]">Membre</th>
                  <th className="px-6 py-6 text-[11px] font-black text-brand-steel uppercase tracking-[0.2em]">ID Unique</th>
                  <th className="px-6 py-6 text-[11px] font-black text-brand-steel uppercase tracking-[0.2em]">Téléphone</th>
                  <th className="px-6 py-6 text-[11px] font-black text-brand-steel uppercase tracking-[0.2em]">Statut</th>
                  <th className="px-6 py-6 text-[11px] font-black text-brand-steel uppercase tracking-[0.2em]">Fin Abonnement</th>
                  <th className="px-6 py-6 text-[11px] font-black text-brand-steel uppercase tracking-[0.2em] text-right pr-8">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-steel/5">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan="7" className="px-8 py-6">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-brand-papaya/50 rounded-full" />
                          <div className="space-y-2 flex-1">
                            <div className="h-4 bg-brand-papaya/50 rounded w-1/4" />
                            <div className="h-3 bg-brand-papaya/30 rounded w-1/6" />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-8 py-24 text-center">
                      <div className="space-y-4">
                        <div className="w-16 h-16 bg-brand-papaya/30 rounded-2xl flex items-center justify-center mx-auto">
                          <Filter className="w-8 h-8 text-brand-steel/50" />
                        </div>
                        <p className="text-brand-steel font-bold text-lg italic">Aucun membre ne correspond à vos critères</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  members.map((member) => (
                    <tr key={member.id} className="hover:bg-brand-papaya/10 transition-all group">
                      {isAdmin && (
                        <td className="pl-8 pr-4 py-5">
                          <input 
                            type="checkbox" 
                            checked={!!selectedMembers.find(m => m.id === member.id)}
                            onChange={() => handleSelectMember(member)}
                            className="w-5 h-5 rounded-lg border-brand-steel/20 text-brand-red focus:ring-brand-red cursor-pointer transition-all"
                          />
                        </td>
                      )}
                      <td className="px-6 py-5">
                        <div className="flex items-center">
                          <div className="w-12 h-12 rounded-2xl bg-brand-space text-brand-papaya flex items-center justify-center font-black text-sm mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                            {member.first_name?.[0] || '?'}{member.last_name?.[0] || '?'}
                          </div>
                          <div>
                            <p className="font-bold text-brand-space text-base">{member.first_name} {member.last_name}</p>
                            <p className="text-xs text-brand-steel font-medium">Inscrit le {member.created_at ? new Date(member.created_at).toLocaleDateString('fr-FR') : 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm font-black text-brand-space/80">
                        {member.custom_id || <span className="text-brand-steel/30 font-normal">N/A</span>}
                      </td>
                      <td className="px-6 py-5 text-sm font-bold text-brand-space/70 tracking-tight">
                        {maskPhone(member.phone)}
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] uppercase font-black border-2 tracking-widest ${getStatusStyle(member.status)} shadow-sm`}>
                          {getStatusLabel(member.status)}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm font-black text-brand-space/80">
                        {member.subscription_end ? new Date(member.subscription_end).toLocaleDateString('fr-FR') : 'N/A'}
                      </td>
                      <td className="px-6 py-5 text-right pr-8">
                        <div className="flex items-center justify-end gap-1 transition-all">
                          <button 
                            onClick={() => setViewingMemberId(member.id)}
                            className="p-2.5 text-brand-steel hover:text-brand-space hover:bg-brand-papaya rounded-xl transition-all" 
                            title="Détails"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => setEditingMember(member)}
                            className="p-2.5 text-brand-steel hover:text-brand-red hover:bg-brand-papaya rounded-xl transition-all" 
                            title="Modifier"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          {isAdmin && (
                            <>
                              <button 
                                onClick={() => handleFreeze(member.id)}
                                className="p-2.5 text-brand-steel hover:text-sky-500 hover:bg-brand-papaya rounded-xl transition-all" 
                                title="Geler"
                              >
                                <Snowflake className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => handleDelete(member.id)}
                                className="p-2.5 text-brand-steel hover:text-brand-red hover:bg-brand-papaya rounded-xl transition-all" 
                                title="Supprimer"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-8 py-6 bg-brand-papaya/5 border-t border-brand-steel/5 flex items-center justify-between">
            <p className="text-sm font-medium text-brand-steel">
              Affichage de <span className="font-black text-brand-space">{members.length}</span> sur <span className="font-black text-brand-space">{total}</span> membres
            </p>
            <div className="flex items-center gap-3">
              <button 
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="p-3 rounded-xl border border-brand-steel/10 bg-white hover:bg-brand-papaya text-brand-space disabled:opacity-30 disabled:hover:bg-white transition-all shadow-sm active:scale-90"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="bg-brand-space text-brand-papaya px-5 py-2.5 rounded-xl text-sm font-black shadow-lg shadow-brand-space/20">
                Page {page}
              </div>
              <button 
                disabled={page * 10 >= total}
                onClick={() => setPage(page + 1)}
                className="p-3 rounded-xl border border-brand-steel/10 bg-white hover:bg-brand-papaya text-brand-space disabled:opacity-30 disabled:hover:bg-white transition-all shadow-sm active:scale-90"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      <AddMemberModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onRefresh={fetchMembers}
      />

      {/* Edit Member Modal */}
      <EditMemberModal 
        isOpen={!!editingMember}
        member={editingMember}
        onClose={() => setEditingMember(null)}
        onRefresh={fetchMembers}
      />

      {/* View Member Details Modal */}
      <MemberDetailsModal 
        isOpen={!!viewingMemberId}
        memberId={viewingMemberId}
        onClose={() => setViewingMemberId(null)}
      />

      {/* Bulk Message Modal */}
      <BulkMessageModal 
        isOpen={isMessageModalOpen}
        onClose={() => {
          setIsMessageModalOpen(false);
          setSelectedMembers([]); // Optional: clear selection after closing
        }}
        selectedMembers={selectedMembers}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Supprimer le membre"
        message="Voulez-vous vraiment supprimer ce membre ? Cette action est irréversible."
        onClose={() => setConfirmModal({ isOpen: false, memberId: null })}
        onConfirm={() => executeDelete(confirmModal.memberId)}
        type="danger"
      />

      <PromptModal
        isOpen={promptModal.isOpen}
        title="Geler l'abonnement"
        message="Combien de jours voulez-vous geler cet abonnement ?"
        placeholder="ex: 7"
        defaultValue="7"
        onClose={() => setPromptModal({ isOpen: false, memberId: null })}
        onConfirm={(val) => executeFreeze(promptModal.memberId, val)}
      />
    </div>
  );
};

export default Members;

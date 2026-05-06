import { useState, useEffect } from 'react';
import { X, MessageSquare, Send, Loader2, CheckCircle2, BookmarkPlus, Zap } from 'lucide-react';
import api from '../../services/api';
import { useToast } from './Toast';
import { getErrorMessage, ERROR_MESSAGES } from '../../utils/errorMessages';

const DEFAULT_TEMPLATES = [
  { id: 't2', name: '📸 Instagram', content: 'Suivez-nous sur Instagram pour ne rien rater de nos nouveautés et offres spéciales ! 👉 https://www.instagram.com/lakhlifiothman7 \n\n , 👉 https://www.facebook.com/share/1L3brRcsLs/' },
];

const BulkMessageModal = ({ isOpen, onClose, selectedMembers }) => {
  const { showToast } = useToast();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [customTemplates, setCustomTemplates] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('gym_whatsapp_templates');
    if (saved) {
      try {
        setCustomTemplates(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse templates');
      }
    }
  }, []);

  const saveTemplate = () => {
    if (!message.trim()) return;
    const name = prompt('Entrez un nom court pour ce modèle personnalisé :');
    if (name) {
      const newTemplate = { id: `c_${Date.now()}`, name, content: message };
      const updated = [...customTemplates, newTemplate];
      setCustomTemplates(updated);
      localStorage.setItem('gym_whatsapp_templates', JSON.stringify(updated));
    }
  };

  const deleteCustomTemplate = (id, e) => {
    e.stopPropagation();
    if (confirm('Voulez-vous vraiment supprimer ce modèle ?')) {
      const updated = customTemplates.filter(t => t.id !== id);
      setCustomTemplates(updated);
      localStorage.setItem('gym_whatsapp_templates', JSON.stringify(updated));
    }
  };

  if (!isOpen) return null;

  const validMembers = selectedMembers.filter(m => m.phone);

  const handleSendAll = async () => {
    setLoading(true);
    try {
      // 1. Add all selected members to the queue
      await Promise.all(validMembers.map(member => 
        api.post('/queue', {
          member_id: member.id,
          phone_number: member.phone,
          message: message,
          gym_id: member.gym_id
        })
      ));
      
      setCompleted(true);
    } catch (err) {
      showToast(getErrorMessage(err, ERROR_MESSAGES.WA_SEND_FAIL), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    onClose();
    setTimeout(() => {
      setMessage('');
      setCompleted(false);
      setLoading(false);
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-space/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-brand-steel/10 animate-in zoom-in duration-200">
        <div className="px-8 py-6 bg-brand-papaya/30 border-b border-brand-steel/10 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-brand-space flex items-center">
            <MessageSquare className="w-6 h-6 mr-2 text-brand-red" />
            Envoi Intelligent WhatsApp
          </h2>
          <button onClick={handleReset} className="p-2 hover:bg-brand-papaya rounded-lg transition-colors">
            <X className="w-6 h-6 text-brand-steel" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {!completed ? (
            <>
              <div className="bg-brand-space text-white p-4 rounded-xl text-sm font-medium shadow-lg">
                Solution Intelligente : Les messages seront ajoutés à la file d'attente et envoyés automatiquement en arrière-plan avec simulation de frappe pour protéger votre compte.
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-brand-steel uppercase ml-1 flex items-center">
                    <Zap className="w-3.5 h-3.5 mr-1 text-brand-red" />
                    Modèles Rapides
                  </label>
                  <button 
                    onClick={saveTemplate}
                    disabled={!message.trim()}
                    className="text-xs font-bold text-brand-red flex items-center hover:bg-brand-papaya px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5 mr-1.5" />
                    Enregistrer comme modèle
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2 pb-2">
                  {[...DEFAULT_TEMPLATES, ...customTemplates].map((t) => (
                    <div key={t.id} className="relative group">
                      <button
                        onClick={() => setMessage(t.content)}
                        className="px-3 py-2 bg-brand-papaya/60 hover:bg-brand-papaya border border-brand-steel/10 rounded-xl text-xs font-bold text-brand-space transition-colors shadow-sm"
                      >
                        {t.name}
                      </button>
                      {t.id.startsWith('c_') && (
                        <button
                          onClick={(e) => deleteCustomTemplate(t.id, e)}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-brand-red text-white rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-md"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-3 bg-brand-papaya/20 border border-brand-steel/10 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none resize-none"
                  placeholder="Écrivez votre message ici ou choisissez un modèle ci-dessus..."
                  disabled={loading}
                />
              </div>

              <button
                onClick={handleSendAll}
                disabled={!message.trim() || loading}
                className="w-full py-4 bg-brand-red text-brand-papaya font-bold rounded-2xl shadow-xl shadow-brand-red/20 hover:bg-brand-lava transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                <span>Ajouter à la file d'envoi ({validMembers.length})</span>
              </button>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto animate-in zoom-in">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-brand-space">File d'attente mise à jour !</h3>
              <p className="text-brand-steel text-sm">Les messages ont été ajoutés à la file d'attente intelligente.</p>
              <button
                onClick={handleReset}
                className="w-full py-4 border border-brand-steel/20 text-brand-space font-bold rounded-2xl hover:bg-brand-papaya transition-all"
              >
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkMessageModal;

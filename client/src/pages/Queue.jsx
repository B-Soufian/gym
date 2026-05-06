import { useState, useEffect } from 'react';
import { 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare,
  Loader2,
  RefreshCw,
  ExternalLink,
  Wifi,
  WifiOff,
  Smartphone,
  ScanLine,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import api from '../services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '../components/ui/Toast';

const Queue = () => {
  const { showToast } = useToast();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [waStatus, setWaStatus] = useState({ ready: false, initialized: false, status: 'idle' });
  const [qrCode, setQrCode] = useState(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const response = await api.get('/queue');
      setQueue(response.data.queue || []);
    } catch (err) {
      console.error('Failed to fetch queue', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWaStatus = async () => {
    try {
      const response = await api.get('/queue/whatsapp-qr');
      setWaStatus({ 
        ready: response.data.ready, 
        status: response.data.status,
        error: response.data.error 
      });
      setQrCode(response.data.qr || null);
    } catch (err) {
      console.error('Failed to fetch WA status', err);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir déconnecter WhatsApp ?')) return;
    try {
      await api.post('/queue/whatsapp-disconnect');
      setWaStatus({ ready: false, status: 'initializing' });
      setQrCode(null);
      showToast('WhatsApp déconnecté — nouveau QR en cours de génération', 'success');
    } catch (err) {
      showToast('Erreur lors de la déconnexion', 'error');
    }
  };

  const handleRetry = async () => {
    try {
      await api.post('/queue/whatsapp-retry');
      setWaStatus({ ready: false, status: 'initializing' });
      setQrCode(null);
    } catch (err) {
      console.error('Retry failed', err);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    try {
      await api.post('/queue/sync');
      await fetchQueue();
      showToast('Synchronisation réussie', 'success');
    } catch (err) {
      showToast('Erreur lors de la synchronisation', 'error');
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    try {
      const res = await api.post('/queue/process');
      showToast(res.data.message, 'success');
      fetchQueue();
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur lors du démarrage de l\'envoi';
      showToast(msg, 'error');
    }
  };

  // Initial fetch + polling
  useEffect(() => {
    fetchQueue();
    fetchWaStatus();
    const queueInterval = setInterval(fetchQueue, 10000);
    const statusInterval = setInterval(fetchWaStatus, 2000);
    return () => {
      clearInterval(queueInterval);
      clearInterval(statusInterval);
    };
  }, []);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'SENT': return 'bg-green-50 text-green-600 border-green-100';
      case 'FAILED': return 'bg-red-50 text-red-600 border-red-100';
      case 'SENDING': return 'bg-blue-50 text-blue-600 border-blue-100';
      default: return 'bg-brand-papaya text-brand-space border-brand-steel/10';
    }
  };

  const getStatusLabel = () => {
    switch (waStatus.status) {
      case 'ready': return { text: 'Connecté & Prêt', color: 'green' };
      case 'authenticated': return { text: 'Authentifié, chargement...', color: 'blue' };
      case 'qr_pending': return { text: 'En attente du scan', color: 'amber' };
      case 'failed': return { text: 'Échec de connexion', color: 'red' };
      case 'disconnected': return { text: 'Déconnecté', color: 'red' };
      default: return { text: 'Initialisation...', color: 'gray' };
    }
  };

  const statusLabel = getStatusLabel();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-brand-space tracking-tight">File d'attente WhatsApp</h1>
          <p className="text-brand-steel font-medium mt-1">Solution intelligente (Anti-Ban Engine)</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleSync}
            className="flex items-center space-x-2 bg-white border border-brand-steel/20 text-brand-space px-5 py-2.5 rounded-xl font-bold hover:bg-brand-papaya transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
          <button 
            onClick={handleProcess}
            disabled={!waStatus.ready}
            className="flex items-center space-x-2 bg-brand-red text-white px-5 py-2.5 rounded-xl font-bold hover:bg-brand-lava transition-all shadow-lg shadow-brand-red/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            <span>Lancer l'Envoi</span>
          </button>
        </div>
      </div>

      {/* ════════ WhatsApp Connection Card — CONNECTED ════════ */}
      {waStatus.ready && (
        <div className="bg-white rounded-3xl border border-brand-steel/10 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-8 py-5 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-lg">WhatsApp Connecté</h3>
                <p className="text-white/80 text-sm">Le moteur d'envoi est actif et prêt</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-xl">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse"></span>
                <span className="text-white font-bold text-sm">En ligne</span>
              </div>
              <button
                id="btn-whatsapp-disconnect"
                onClick={handleDisconnect}
                className="flex items-center space-x-2 bg-white/10 hover:bg-red-500 border border-white/20 hover:border-red-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 group"
              >
                <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>Déconnecter</span>
              </button>
            </div>
          </div>
          <div className="px-8 py-5 flex items-center space-x-6 bg-emerald-50/50">
            <div className="flex items-center space-x-2 text-emerald-700">
              <Wifi className="w-4 h-4" />
              <span className="text-sm font-semibold">Session active</span>
            </div>
            <div className="h-4 w-px bg-emerald-200"></div>
            <p className="text-sm text-emerald-600">
              Les messages sont envoyés automatiquement selon la file d'attente
            </p>
          </div>
        </div>
      )}

      {/* ════════ WhatsApp Connection Card — QR / NOT CONNECTED ════════ */}
      {!waStatus.ready && (
        /* ── QR Code / Not Connected State ── */
        <div className="bg-white rounded-3xl border border-brand-steel/10 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-brand-space to-brand-space/90 px-8 py-5 flex items-center space-x-4">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-lg">Connecter WhatsApp Business</h3>
              <p className="text-white/70 text-sm">Scannez le QR code ci-dessous avec votre téléphone</p>
            </div>
          </div>
          
          <div className="p-8 flex flex-col md:flex-row items-center gap-8">
            {/* QR Code Display */}
            <div className="flex-shrink-0">
              {qrCode ? (
                <div className="relative">
                  <div className="bg-white p-4 rounded-2xl shadow-xl border-2 border-brand-red/20">
                    <img 
                      src={qrCode} 
                      alt="QR Code WhatsApp" 
                      className="w-64 h-64 object-contain"
                    />
                  </div>
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-brand-red text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center space-x-1.5 animate-pulse">
                    <ScanLine className="w-3.5 h-3.5" />
                    <span>Scannez maintenant</span>
                  </div>
                </div>
              ) : waStatus.status === 'failed' ? (
                <div className="w-64 h-64 bg-red-50 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-red-200 space-y-3">
                  <AlertCircle className="w-10 h-10 text-red-400" />
                  <p className="text-red-600 text-sm font-bold text-center">Échec de connexion</p>
                  <p className="text-red-500 text-xs text-center px-4">{waStatus.error || 'Erreur inconnue'}</p>
                  <button 
                    onClick={handleRetry}
                    className="mt-2 px-4 py-2 bg-brand-red text-white text-xs font-bold rounded-xl hover:bg-brand-lava transition-all shadow-md"
                  >
                    🔄 Réessayer la connexion
                  </button>
                </div>
              ) : (
                <div className="w-64 h-64 bg-brand-papaya/30 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-brand-steel/20">
                  <Loader2 className="w-10 h-10 text-brand-steel animate-spin mb-3" />
                  <p className="text-brand-steel text-sm font-medium">Chargement du QR code...</p>
                  <p className="text-brand-steel/60 text-xs mt-1">Cela peut prendre 30 secondes</p>
                </div>
              )}
            </div>
            
            {/* Instructions */}
            <div className="flex-1 space-y-5">
              {waStatus.status === 'qr_pending' && (
                <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border bg-amber-50 text-amber-600 border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mr-2 animate-pulse"></span>
                  En attente du scan
                </div>
              )}
              {waStatus.status === 'initializing' && (
                <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border bg-blue-50 text-blue-600 border-blue-200">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
                  Initialisation en cours...
                </div>
              )}
              {waStatus.status === 'failed' && (
                <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border bg-red-50 text-red-600 border-red-200">
                  <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                  Échec de connexion
                </div>
              )}
              
              <h4 className="text-xl font-extrabold text-brand-space">Comment connecter ?</h4>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <span className="w-8 h-8 rounded-full bg-brand-red text-white flex-shrink-0 flex items-center justify-center text-sm font-bold shadow-md">1</span>
                  <div>
                    <p className="font-bold text-brand-space text-sm">Ouvrez WhatsApp sur votre téléphone</p>
                    <p className="text-brand-steel text-xs mt-0.5">WhatsApp ou WhatsApp Business</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <span className="w-8 h-8 rounded-full bg-brand-red text-white flex-shrink-0 flex items-center justify-center text-sm font-bold shadow-md">2</span>
                  <div>
                    <p className="font-bold text-brand-space text-sm">Allez dans Paramètres → Appareils liés</p>
                    <p className="text-brand-steel text-xs mt-0.5">Puis appuyez sur "Lier un appareil"</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <span className="w-8 h-8 rounded-full bg-brand-red text-white flex-shrink-0 flex items-center justify-center text-sm font-bold shadow-md">3</span>
                  <div>
                    <p className="font-bold text-brand-space text-sm">Scannez le QR code affiché ici</p>
                    <p className="text-brand-steel text-xs mt-0.5">La connexion se fera automatiquement</p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <strong>💡 Note :</strong> Le QR code se renouvelle toutes les 30 secondes. Si le code expire, un nouveau apparaîtra automatiquement.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════ Queue Table ════════ */}
      <div className="bg-white rounded-3xl border border-brand-steel/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-brand-papaya/10">
                <th className="px-6 py-4 text-xs font-bold text-brand-steel uppercase tracking-wider">Date Prévue</th>
                <th className="px-6 py-4 text-xs font-bold text-brand-steel uppercase tracking-wider">Destinataire</th>
                <th className="px-6 py-4 text-xs font-bold text-brand-steel uppercase tracking-wider">Message</th>
                <th className="px-6 py-4 text-xs font-bold text-brand-steel uppercase tracking-wider">Statut</th>
                <th className="px-6 py-4 text-xs font-bold text-brand-steel uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-papaya">
              {loading && queue.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-brand-red animate-spin mx-auto" />
                  </td>
                </tr>
              ) : queue.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-14 h-14 bg-brand-papaya rounded-full flex items-center justify-center mx-auto">
                        <MessageSquare className="w-7 h-7 text-brand-red" />
                      </div>
                      <h3 className="text-lg font-bold text-brand-space">La file d'attente est vide</h3>
                      <p className="text-brand-steel text-sm">
                        Aucun message en attente. Cliquez sur "Actualiser" pour vérifier les abonnements expirants.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                queue.map((item) => (
                  <tr key={item.id} className="hover:bg-brand-papaya/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-brand-space">
                        {item.scheduled_at ? format(new Date(item.scheduled_at), 'dd MMM yyyy', { locale: fr }) : '-'}
                      </div>
                      <div className="text-xs text-brand-steel flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {item.scheduled_at ? format(new Date(item.scheduled_at), 'HH:mm') : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-brand-space">
                        {item.first_name ? `${item.first_name} ${item.last_name}` : item.phone_number}
                      </div>
                      <div className="text-xs text-brand-steel">{item.phone_number}</div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <p className="text-sm text-brand-space truncate" title={item.message}>
                        {item.message}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getStatusStyle(item.status)}`}>
                        {item.status === 'SENT' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : item.status === 'FAILED' ? <AlertCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                        {item.status === 'SENT' ? 'ENVOYÉ' : (item.status === 'FAILED' ? 'ÉCHEC' : (item.status === 'SENDING' ? 'ENVOI...' : 'EN ATTENTE'))}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <a 
                        href={`https://wa.me/${(item.phone_number || '').replace(/\D/g, '')}?text=${encodeURIComponent(item.message || '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center space-x-1 text-brand-red font-bold text-xs hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Envoyer Manuel</span>
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Queue;

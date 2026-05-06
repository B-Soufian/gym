import { useState, useEffect } from 'react';
import { 
  Activity, 
  User, 
  Database, 
  MapPin, 
  Clock, 
  ShieldAlert,
  Loader2,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import api from '../services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/audit');
      setLogs(response.data.logs);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionColor = (log) => {
    const action = log.action_type;
    if (action.includes('LOGIN')) return 'text-blue-500';
    if (action.includes('FAILED')) return 'text-red-500';
    if (action.includes('INSERT') || action.includes('CREATE') || action === 'UNFREEZE') return 'text-green-500';
    if (action.includes('DELETE') || (action === 'PAYMENT' && !log.new_value)) return 'text-red-600';
    if (action === 'FREEZE') return 'text-sky-500';
    return 'text-brand-space';
  };

  const translateTable = (table) => {
    const map = {
      'members': 'du membre',
      'payments': 'du paiement',
      'subscriptions': 'de l\'abonnement',
      'users': 'de l\'utilisateur',
      'gyms': 'de la salle'
    };
    return map[table] || `de ${table}`;
  };

  const translateAction = (log) => {
    const action = log.action_type;
    if (action === 'PAYMENT' && !log.new_value) return 'SUPPRESSION PAIEMENT';
    
    const map = {
      'LOGIN': 'CONNEXION',
      'LOGIN_FAILED': 'ÉCHEC CONNEXION',
      'CREATE': 'CRÉATION',
      'INSERT': 'AJOUT',
      'UPDATE': 'MODIFICATION',
      'DELETE': 'SUPPRESSION',
      'PAYMENT': 'PAIEMENT',
      'FREEZE': 'GEL',
      'UNFREEZE': 'DÉGEL'
    };
    return map[action] || action;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-brand-space tracking-tight">Journaux d'Audit</h1>
        <p className="text-brand-steel font-medium mt-1">Traçabilité complète des actions système</p>
      </div>

      <div className="bg-white rounded-3xl border border-brand-steel/10 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-brand-papaya flex items-center justify-between">
          <div className="flex items-center space-x-2 text-brand-steel">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-bold uppercase tracking-wider">Aujourd'hui</span>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-brand-papaya rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
            <button className="p-2 hover:bg-brand-papaya rounded-lg"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="p-0">
          {loading ? (
            <div className="py-20 flex justify-center">
               <Loader2 className="w-10 h-10 text-brand-red animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-20 text-center text-brand-steel font-medium">
              Aucun journal d'audit disponible
            </div>
          ) : (
            <div className="divide-y divide-brand-papaya">
              {logs.map((log) => (
                <div key={log.id} className="p-6 hover:bg-brand-papaya/5 transition-colors flex items-start gap-4">
                  <div className={`p-3 rounded-2xl ${log.action_type.includes('FAILED') ? 'bg-red-50' : 'bg-brand-papaya/40'}`}>
                    {log.action_type.includes('LOGIN') ? <User className="w-5 h-5 text-brand-space" /> : <Activity className="w-5 h-5 text-brand-space" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-black text-brand-space">
                        {log.username_snapshot} <span className={`font-bold ml-2 ${getActionColor(log)}`}>{translateAction(log)}</span>
                      </p>
                      <div className="flex items-center text-xs text-brand-steel">
                        <Clock className="w-3 h-3 mr-1" />
                        {format(new Date(log.created_at), 'HH:mm:ss')}
                      </div>
                    </div>
                    
                    {/* Log Message Details */}
                    {(log.action_type === 'PAYMENT' || log.action_type === 'CREATE' || log.action_type === 'UPDATE' || log.action_type === 'DELETE' || log.action_type === 'FREEZE' || log.action_type === 'UNFREEZE') && (
                      <div className="mb-2 text-xs font-bold text-brand-space bg-brand-papaya/20 p-2 rounded-lg inline-block">
                        {log.action_type === 'PAYMENT' && log.new_value && (
                          <span>Paiement de <span className="text-brand-red">{log.new_value.amount} DH</span> pour <span className="text-blue-600">{log.target_name || `le membre #${log.new_value.member_id}`}</span></span>
                        )}
                        {log.action_type === 'PAYMENT' && !log.new_value && log.old_value && (
                          <span>Suppression du paiement de <span className="text-brand-red">{log.old_value.amount} DH</span> pour <span className="text-blue-600">{log.target_name || `le membre #${log.old_value.member_id}`}</span></span>
                        )}
                        {log.action_type === 'CREATE' && (
                          <span>Création {translateTable(log.target_table)} : <span className="text-blue-600">{log.target_name || (log.new_value?.first_name ? `${log.new_value.first_name} ${log.new_value.last_name}` : (log.new_value?.name || log.new_value?.username || 'ID '+log.target_id))}</span></span>
                        )}
                        {log.action_type === 'UPDATE' && (
                          <span>Modification {translateTable(log.target_table)} : <span className="text-blue-600">{log.target_name || `#${log.target_id}`}</span></span>
                        )}
                        {log.action_type === 'DELETE' && (
                          <span>Suppression {translateTable(log.target_table)} : <span className="text-blue-600">{log.target_name || `#${log.target_id}`}</span></span>
                        )}
                        {log.action_type === 'FREEZE' && (
                          <span>Gel de l'abonnement : <span className="text-blue-600">{log.target_name || `#${log.target_id}`}</span></span>
                        )}
                        {log.action_type === 'UNFREEZE' && (
                          <span>Dégel de l'abonnement : <span className="text-blue-600">{log.target_name || `#${log.target_id}`}</span></span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-6 text-xs text-brand-steel font-bold uppercase tracking-wider">
                      <div className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        IP: {log.ip_address}
                      </div>
                      {log.gym_id && (
                        <div className="flex items-center">
                          <Database className="w-3 h-3 mr-1" />
                          Gym ID: {log.gym_id}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;

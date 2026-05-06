import { X, AlertTriangle } from 'lucide-react';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onClose, type = 'danger' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-space/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden border border-brand-steel/10 animate-in zoom-in-95 duration-200">
        <div className="p-6 text-center space-y-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${type === 'danger' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'}`}>
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-brand-space mb-2">{title}</h3>
            <p className="text-brand-steel text-sm">{message}</p>
          </div>
        </div>
        <div className="p-4 bg-brand-papaya/30 border-t border-brand-steel/10 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-brand-space font-bold hover:bg-white border border-transparent hover:border-brand-steel/20 transition-all"
          >
            Annuler
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-white shadow-lg transition-all ${type === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-brand-space hover:bg-brand-space/90 shadow-brand-space/20'}`}
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

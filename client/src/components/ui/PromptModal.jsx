import { useState, useEffect } from 'react';
import { X, HelpCircle } from 'lucide-react';

const PromptModal = ({ isOpen, title, message, placeholder, defaultValue = '', onConfirm, onClose }) => {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-space/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden border border-brand-steel/10 animate-in zoom-in-95 duration-200">
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-full bg-brand-papaya flex items-center justify-center text-brand-red">
              <HelpCircle className="w-6 h-6" />
            </div>
            <button onClick={onClose} className="p-2 text-brand-steel hover:bg-brand-papaya rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div>
            <h3 className="text-xl font-bold text-brand-space mb-2">{title}</h3>
            <p className="text-brand-steel text-sm mb-4">{message}</p>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              className="w-full px-4 py-3 bg-brand-papaya/30 border border-brand-steel/10 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onConfirm(value);
                  onClose();
                }
              }}
            />
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
              onConfirm(value);
              onClose();
            }}
            className="flex-1 px-4 py-2.5 bg-brand-space hover:bg-brand-space/90 text-white rounded-xl font-bold shadow-lg shadow-brand-space/20 transition-all"
          >
            Valider
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptModal;

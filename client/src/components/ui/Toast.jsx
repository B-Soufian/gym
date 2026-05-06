import { useState, useEffect, createContext, useContext } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success', duration = 2000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Small delay to trigger the entrance animation
    const enterTimer = setTimeout(() => setIsVisible(true), 10);
    
    const exitTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onRemove(toast.id), 200); // Faster exit
    }, toast.duration);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
    };
  }, [toast, onRemove]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <XCircle className="w-5 h-5 text-rose-500" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-500" />,
    info: <AlertCircle className="w-5 h-5 text-sky-500" />,
  };

  const styles = {
    success: 'bg-white border-emerald-100 text-emerald-900 shadow-emerald-500/10',
    error: 'bg-white border-rose-100 text-rose-900 shadow-rose-500/10',
    warning: 'bg-white border-amber-100 text-amber-900 shadow-amber-500/10',
    info: 'bg-white border-sky-100 text-sky-900 shadow-sky-500/10',
  };

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 min-w-[300px] max-w-sm rounded-xl border shadow-xl
        pointer-events-auto transition-all duration-300 ease-out transform
        ${isVisible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-8 opacity-0 scale-90'}
        ${styles[toast.type]}
      `}
    >
      <div className="flex-shrink-0">{icons[toast.type]}</div>
      <div className="flex-grow text-sm font-bold tracking-tight">{toast.message}</div>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onRemove(toast.id), 200);
        }}
        className="flex-shrink-0 p-1 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <X className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  );
}
;

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

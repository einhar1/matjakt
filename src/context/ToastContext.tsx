import { createContext, useContext, useState, useRef, useCallback, type ReactNode } from 'react';
import { FaCheckCircle } from 'react-icons/fa';

type ToastContextType = {
  showCartToast: () => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showCartToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(true);
    timerRef.current = setTimeout(() => setVisible(false), 2500);
  }, []);

  return (
    <ToastContext.Provider value={{ showCartToast }}>
      {children}
      <div className={`cart-toast${visible ? ' cart-toast--visible' : ''}`}>
        <FaCheckCircle className="cart-toast-icon" />
        Tillagd i matkasse
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

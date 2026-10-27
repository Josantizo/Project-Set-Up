import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const siguienteId = useRef(1);

  const quitar = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const mostrar = useCallback(
    (mensaje, tipo = 'exito') => {
      const id = siguienteId.current++;
      setToasts((t) => [...t, { id, mensaje, tipo }]);
      setTimeout(() => quitar(id), tipo === 'error' ? 6000 : 3000);
    },
    [quitar],
  );

  const valor = useMemo(
    () => ({ exito: (m) => mostrar(m, 'exito'), error: (m) => mostrar(m, 'error') }),
    [mostrar],
  );

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tipo === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start gap-3 rounded-lg px-4 py-3 text-sm shadow-lg ring-1 ${
              t.tipo === 'error'
                ? 'bg-red-50 text-red-800 ring-red-200'
                : 'bg-emerald-50 text-emerald-800 ring-emerald-200'
            }`}
          >
            <span className="flex-1">{t.mensaje}</span>
            <button onClick={() => quitar(t.id)} className="opacity-60 hover:opacity-100" aria-label="Cerrar">
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

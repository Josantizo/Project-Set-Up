import { useEffect, useId } from 'react';
import { colorAvatar, iniciales, PRIORIDADES } from '../lib/formato';

const VARIANTES = {
  primario: 'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500',
  secundario: 'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus-visible:ring-indigo-500',
  peligro: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
  fantasma: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-indigo-500',
};

const TAMANOS = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3.5 py-2 text-sm',
};

export function Boton({ variante = 'primario', tamano = 'md', cargando = false, className = '', children, disabled, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled || cargando}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTES[variante]} ${TAMANOS[tamano]} ${className}`}
      {...props}
    >
      {cargando && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function Campo({ etiqueta, ayuda, children, id }) {
  return (
    <div className="space-y-1.5">
      {etiqueta && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700">
          {etiqueta}
        </label>
      )}
      {children}
      {ayuda && <p className="text-xs text-slate-500">{ayuda}</p>}
    </div>
  );
}

// Input con etiqueta asociada automáticamente
export function Entrada({ etiqueta, ayuda, className = '', ...props }) {
  const id = useId();
  return (
    <Campo etiqueta={etiqueta} ayuda={ayuda} id={id}>
      <input id={id} className={`input ${className}`} {...props} />
    </Campo>
  );
}

export function AreaTexto({ etiqueta, ayuda, className = '', ...props }) {
  const id = useId();
  return (
    <Campo etiqueta={etiqueta} ayuda={ayuda} id={id}>
      <textarea id={id} className={`input min-h-[88px] ${className}`} {...props} />
    </Campo>
  );
}

export function Selector({ etiqueta, ayuda, className = '', children, ...props }) {
  const id = useId();
  return (
    <Campo etiqueta={etiqueta} ayuda={ayuda} id={id}>
      <select id={id} className={`input ${className}`} {...props}>
        {children}
      </select>
    </Campo>
  );
}

export function Alerta({ children, tipo = 'error' }) {
  if (!children) return null;
  const estilos = tipo === 'error' ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  return (
    <div role={tipo === 'error' ? 'alert' : 'status'} className={`rounded-lg px-3 py-2 text-sm ring-1 ring-inset ${estilos}`}>
      {children}
    </div>
  );
}

export function Spinner({ className = 'h-5 w-5' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="4" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
      <Spinner />
      {texto}
    </div>
  );
}

export function ErrorCarga({ error, alReintentar }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-sm text-red-700">{error?.message ?? 'Ocurrió un error'}</p>
      {alReintentar && (
        <Boton variante="secundario" className="mt-4" onClick={alReintentar}>
          Reintentar
        </Boton>
      )}
    </div>
  );
}

export function Vacio({ titulo, children }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center">
      <p className="text-sm font-medium text-slate-700">{titulo}</p>
      {children && <div className="mt-1 text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function Modal({ abierto, alCerrar, titulo, children, ancho = 'max-w-lg' }) {
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e) => e.key === 'Escape' && alCerrar();
    document.addEventListener('keydown', alTeclear);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = '';
    };
  }, [abierto, alCerrar]);

  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:py-[8vh]" onMouseDown={alCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`card w-full ${ancho}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
          <button onClick={alCerrar} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Cerrar">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function Avatar({ usuario, tamano = 'h-7 w-7 text-xs' }) {
  if (!usuario) return null;
  return (
    <span
      title={usuario.nombre}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${colorAvatar(usuario.id)} ${tamano}`}
    >
      {iniciales(usuario.nombre)}
    </span>
  );
}

export function InsigniaPrioridad({ prioridad }) {
  const p = PRIORIDADES[prioridad];
  if (!p) return null;
  return <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${p.clase}`}>{p.nombre}</span>;
}

export function InsigniaRol({ rol }) {
  const admin = rol === 'ADMIN';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        admin ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'
      }`}
    >
      {admin ? 'Admin' : 'Miembro'}
    </span>
  );
}

export function Etiqueta({ etiqueta }) {
  return (
    <span
      className="inline-flex max-w-full items-center truncate rounded px-1.5 py-0.5 text-[11px] font-medium text-white"
      style={{ backgroundColor: etiqueta.color }}
    >
      {etiqueta.nombre}
    </span>
  );
}

export function BarraProgreso({ porcentaje, className = 'h-1.5' }) {
  return (
    <div className={`w-full overflow-hidden rounded-full bg-slate-200 ${className}`}>
      <div
        className={`h-full rounded-full transition-all ${porcentaje === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
        style={{ width: `${porcentaje}%` }}
      />
    </div>
  );
}

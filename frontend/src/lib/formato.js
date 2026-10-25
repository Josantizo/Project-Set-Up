// Etiquetas y estilos compartidos para los enums del backend.

export const ESTADOS = {
  POR_HACER: { nombre: 'Por hacer', color: 'bg-slate-400', suave: 'bg-slate-100 text-slate-700' },
  EN_PROGRESO: { nombre: 'En progreso', color: 'bg-blue-500', suave: 'bg-blue-50 text-blue-700' },
  EN_REVISION: { nombre: 'En revisión / QA', color: 'bg-amber-500', suave: 'bg-amber-50 text-amber-700' },
  COMPLETADO: { nombre: 'Completado', color: 'bg-emerald-500', suave: 'bg-emerald-50 text-emerald-700' },
};

export const PRIORIDADES = {
  ALTA: { nombre: 'Alta', clase: 'bg-red-50 text-red-700 ring-red-200' },
  MEDIA: { nombre: 'Media', clase: 'bg-amber-50 text-amber-700 ring-amber-200' },
  BAJA: { nombre: 'Baja', clase: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

// Las fechas de tareas se guardan como día (00:00 UTC): se muestran en UTC para
// que "5 nov" no aparezca como "4 nov" en Guatemala (UTC-6).
export function formatoFecha(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function formatoFechaCorta(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

// Día de un momento real (creación de proyectos, usuarios…): en hora local.
export function formatoDiaLocal(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Momentos (comentarios, bitácora): en hora local.
export function formatoMomento(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-GT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Valor para <input type="date"> a partir de una fecha ISO de la API.
export function aInputFecha(iso) {
  return iso ? iso.slice(0, 10) : '';
}

export function iniciales(nombre = '') {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

// Color estable por usuario para los avatares
const COLORES_AVATAR = ['bg-indigo-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500', 'bg-teal-500'];
export function colorAvatar(id = 0) {
  return COLORES_AVATAR[id % COLORES_AVATAR.length];
}

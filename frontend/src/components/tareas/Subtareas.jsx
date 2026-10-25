import { useState } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { BarraProgreso } from '../ui';

function FormAgregar({ placeholder, alAgregar, etiqueta }) {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      await alAgregar(texto.trim());
      setTexto('');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex gap-2">
      <input
        aria-label={etiqueta}
        className="input py-1.5"
        placeholder={placeholder}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        maxLength={191}
      />
      <button
        type="submit"
        disabled={enviando || !texto.trim()}
        className="shrink-0 rounded-lg bg-slate-800 px-3 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-40"
      >
        Agregar
      </button>
    </form>
  );
}

function BotonBorrar({ onClick, etiqueta }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      title={etiqueta}
      className="rounded p-1 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
    >
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
      </svg>
    </button>
  );
}

function Subtarea({ subtarea, base, alCambiar }) {
  const toast = useToast();
  const [abierta, setAbierta] = useState(subtarea.checklist.length > 0);
  const hechos = subtarea.checklist.filter((i) => i.completado).length;
  const ruta = `${base}/${subtarea.id}`;

  // Ejecuta la petición y refresca la tarea; los errores se muestran como aviso
  const ejecutar = async (peticion) => {
    try {
      await peticion();
      await alCambiar();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <li className="rounded-lg border border-slate-200">
      <div className="group flex items-center gap-2 px-3 py-2">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          checked={subtarea.completada}
          aria-label={`Completar ${subtarea.titulo}`}
          onChange={(e) => ejecutar(() => api(ruta, { method: 'PUT', body: { completada: e.target.checked } }))}
        />
        <span className={`flex-1 text-sm ${subtarea.completada ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{subtarea.titulo}</span>
        <button
          type="button"
          onClick={() => setAbierta(!abierta)}
          className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
          aria-expanded={abierta}
        >
          Checklist {subtarea.checklist.length > 0 && `${hechos}/${subtarea.checklist.length}`} {abierta ? '▴' : '▾'}
        </button>
        <BotonBorrar
          etiqueta={`Eliminar subtarea ${subtarea.titulo}`}
          onClick={() => window.confirm(`¿Eliminar la subtarea “${subtarea.titulo}” y su checklist?`) && ejecutar(() => api(ruta, { method: 'DELETE' }))}
        />
      </div>

      {abierta && (
        <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 px-3 py-2 pl-9">
          {subtarea.checklist.length > 0 && (
            <ul className="space-y-1">
              {subtarea.checklist.map((item) => (
                <li key={item.id} className="group flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    checked={item.completado}
                    aria-label={`Marcar ${item.texto}`}
                    onChange={(e) =>
                      ejecutar(() => api(`${ruta}/checklist/${item.id}`, { method: 'PUT', body: { completado: e.target.checked } }))
                    }
                  />
                  <span className={`flex-1 text-sm ${item.completado ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item.texto}</span>
                  <BotonBorrar
                    etiqueta={`Eliminar ${item.texto}`}
                    onClick={() => ejecutar(() => api(`${ruta}/checklist/${item.id}`, { method: 'DELETE' }))}
                  />
                </li>
              ))}
            </ul>
          )}
          <FormAgregar
            etiqueta="Nuevo elemento del checklist"
            placeholder="Nuevo elemento…"
            alAgregar={(texto) => ejecutar(() => api(`${ruta}/checklist`, { method: 'POST', body: { texto } }))}
          />
        </div>
      )}
    </li>
  );
}

export default function Subtareas({ tarea, alCambiar }) {
  const toast = useToast();
  const base = `/tareas/${tarea.id}/subtareas`;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium text-slate-700">Avance</span>
          <span className="tabular-nums text-slate-500">
            {tarea.progreso.completadas} de {tarea.progreso.total} · {tarea.progreso.porcentaje}%
          </span>
        </div>
        <BarraProgreso porcentaje={tarea.progreso.porcentaje} className="mt-1.5 h-2" />
        <p className="mt-1 text-xs text-slate-400">El avance se calcula con las subtareas completadas; el checklist es una guía interna.</p>
      </div>

      {tarea.subtareas.length > 0 && (
        <ul className="space-y-2">
          {tarea.subtareas.map((s) => (
            <Subtarea key={s.id} subtarea={s} base={base} alCambiar={alCambiar} />
          ))}
        </ul>
      )}

      <FormAgregar
        etiqueta="Nueva subtarea"
        placeholder="Nueva subtarea…"
        alAgregar={async (titulo) => {
          try {
            await api(base, { method: 'POST', body: { titulo } });
            await alCambiar();
          } catch (e) {
            toast.error(e.message);
          }
        }}
      />
    </div>
  );
}

import { formatoFechaCorta } from '../../lib/formato';
import { Avatar, Etiqueta, InsigniaPrioridad } from '../ui';

export function InsigniaBug() {
  return <span className="inline-flex items-center rounded bg-red-600 px-1 py-px text-[10px] font-bold uppercase tracking-wide text-white">Bug</span>;
}

export default function TarjetaTarea({ tarea, alAbrir, alArrastrar, alSoltarArrastre, arrastrando }) {
  const completada = tarea.columna.tipo === 'COMPLETADO';

  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(tarea.id));
        alArrastrar(tarea);
      }}
      onDragEnd={alSoltarArrastre}
      className={`transition ${arrastrando ? 'opacity-40' : ''}`}
    >
      <button
        type="button"
        onClick={() => alAbrir(tarea.id)}
        className={`block w-full cursor-grab rounded-lg border bg-white p-3 text-left shadow-sm transition hover:border-indigo-300 hover:shadow active:cursor-grabbing ${
          tarea.vencida ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200'
        }`}
      >
        {tarea.etiquetas.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {tarea.etiquetas.map((et) => (
              <Etiqueta key={et.id} etiqueta={et} />
            ))}
          </div>
        )}

        <p className={`text-sm font-medium leading-snug ${completada ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-900'}`}>
          {tarea.tipo === 'BUG' && (
            <span className="mr-1.5 align-[1px]">
              <InsigniaBug />
            </span>
          )}
          {tarea.titulo}
        </p>

        {tarea.progreso.total > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full ${tarea.progreso.porcentaje === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                style={{ width: `${tarea.progreso.porcentaje}%` }}
              />
            </div>
            <span className="text-[11px] tabular-nums text-slate-500">
              {tarea.progreso.completadas}/{tarea.progreso.total}
            </span>
          </div>
        )}

        <div className="mt-2.5 flex items-center gap-2">
          <InsigniaPrioridad prioridad={tarea.prioridad} />
          {tarea.fechaLimite && (
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-medium ${tarea.vencida ? 'text-red-600' : 'text-slate-500'}`}
              title={tarea.vencida ? 'Vencida' : 'Fecha límite'}
            >
              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z"
                  clipRule="evenodd"
                />
              </svg>
              {tarea.vencida ? 'Vencida · ' : ''}
              {formatoFechaCorta(tarea.fechaLimite)}
            </span>
          )}
          <span className="ml-auto">
            {tarea.responsable ? (
              <Avatar usuario={tarea.responsable} tamano="h-6 w-6 text-[10px]" />
            ) : (
              <span className="text-[11px] text-slate-400">Sin asignar</span>
            )}
          </span>
        </div>
      </button>
    </li>
  );
}

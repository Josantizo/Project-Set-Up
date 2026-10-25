import { useState } from 'react';
import { api } from '../../api/client';
import { useRecurso } from '../../hooks/useRecurso';
import { ESTADOS, formatoMomento } from '../../lib/formato';
import { Alerta, Avatar, Boton, Cargando, ErrorCarga } from '../ui';

export function Comentarios({ tareaId }) {
  const { datos: comentarios, setDatos, error, cargando, recargar } = useRecurso(`/tareas/${tareaId}/comentarios`);
  const [texto, setTexto] = useState('');
  const [errorEnvio, setErrorEnvio] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setErrorEnvio('');
    try {
      const nuevo = await api(`/tareas/${tareaId}/comentarios`, { method: 'POST', body: { texto: texto.trim() } });
      setDatos([...comentarios, nuevo]);
      setTexto('');
    } catch (err) {
      setErrorEnvio(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) return <Cargando />;
  if (error) return <ErrorCarga error={error} alReintentar={recargar} />;

  return (
    <div className="space-y-4">
      {comentarios.length === 0 ? (
        <p className="text-sm text-slate-500">Todavía no hay comentarios.</p>
      ) : (
        <ul className="space-y-3">
          {comentarios.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Avatar usuario={c.usuario} />
              <div className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-xs">
                  <span className="font-medium text-slate-800">{c.usuario.nombre}</span>
                  <span className="ml-2 text-slate-400">{formatoMomento(c.creadoEn)}</span>
                </p>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-700">{c.texto}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={enviar} className="space-y-2">
        <Alerta>{errorEnvio}</Alerta>
        <textarea
          aria-label="Nuevo comentario"
          className="input min-h-[72px]"
          placeholder="Escribe un comentario…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <div className="flex justify-end">
          <Boton type="submit" tamano="sm" cargando={enviando} disabled={!texto.trim()}>
            Comentar
          </Boton>
        </div>
      </form>
    </div>
  );
}

export function Bitacora({ tareaId }) {
  const { datos: registros, error, cargando, recargar } = useRecurso(`/tareas/${tareaId}/bitacora`);

  if (cargando) return <Cargando />;
  if (error) return <ErrorCarga error={error} alReintentar={recargar} />;
  if (registros.length === 0) return <p className="text-sm text-slate-500">Sin actividad registrada.</p>;

  return (
    <ol className="relative space-y-4 border-l border-slate-200 pl-5">
      {registros.map((r) => {
        const nuevo = ESTADOS[r.estadoNuevo];
        return (
          <li key={r.id} className="relative">
            <span className={`absolute -left-[26px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${nuevo?.color ?? 'bg-slate-400'}`} />
            <p className="text-sm text-slate-800">
              <span className="font-medium">{r.usuario.nombre}</span>{' '}
              {r.accion === 'CREADA' ? (
                'creó la tarea'
              ) : r.accion === 'MOVIDA' ? (
                <>
                  la movió de <span className="font-medium">{ESTADOS[r.estadoAnterior]?.nombre ?? r.estadoAnterior}</span> a{' '}
                  <span className="font-medium">{nuevo?.nombre ?? r.estadoNuevo}</span>
                </>
              ) : (
                r.detalle ?? r.accion.toLowerCase()
              )}
            </p>
            <p className="text-xs text-slate-400">{formatoMomento(r.fecha)}</p>
          </li>
        );
      })}
    </ol>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ESTADOS, formatoDiaLocal, formatoMomento } from '../../lib/formato';
import { Boton, Cargando, ErrorCarga, Modal } from '../ui';
import { Bitacora, Comentarios } from './Actividad';
import FormTarea from './FormTarea';
import Subtareas from './Subtareas';
import { InsigniaBug } from './TarjetaTarea';

// Siguientes estados válidos; solo para ofrecer botones. El backend es quien valida.
const SIGUIENTES = {
  POR_HACER: ['EN_PROGRESO'],
  EN_PROGRESO: ['EN_REVISION'],
  EN_REVISION: ['COMPLETADO', 'EN_PROGRESO'],
  COMPLETADO: [],
};

function MoverEstado({ tarea, columnas, alMover }) {
  const [moviendo, setMoviendo] = useState(null);
  const actual = tarea.columna.tipo;
  const destinos = SIGUIENTES[actual].map((tipo) => columnas.find((c) => c.tipo === tipo)).filter(Boolean);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADOS[actual].suave}`}>{ESTADOS[actual].nombre}</span>
      {destinos.length === 0 ? (
        <span className="text-xs text-slate-400">Estado final</span>
      ) : (
        <>
          <span className="text-xs text-slate-400">Mover a</span>
          {destinos.map((c) => (
            <Boton
              key={c.id}
              variante="secundario"
              tamano="sm"
              cargando={moviendo === c.id}
              disabled={moviendo !== null}
              onClick={async () => {
                setMoviendo(c.id);
                await alMover(c);
                setMoviendo(null);
              }}
            >
              {c.tipo === 'EN_PROGRESO' && actual === 'EN_REVISION' ? 'Devolver a En progreso' : c.nombre}
            </Boton>
          ))}
        </>
      )}
    </div>
  );
}

export default function ModalTarea({ tareaId, alCerrar, proyecto, columnas, alActualizar, alEliminar }) {
  const { usuario } = useAuth();
  const toast = useToast();
  const [tarea, setTarea] = useState(null);
  const [error, setError] = useState(null);
  const [pestana, setPestana] = useState('detalles');

  const cargar = useCallback(async () => {
    try {
      const t = await api(`/tareas/${tareaId}`);
      setTarea(t);
      setError(null);
      alActualizar(t);
    } catch (e) {
      setError(e);
    }
  }, [tareaId, alActualizar]);

  useEffect(() => {
    setTarea(null);
    setPestana('detalles');
    if (tareaId) cargar();
  }, [tareaId, cargar]);

  async function mover(columna) {
    try {
      const t = await api(`/tareas/${tarea.id}/mover`, { method: 'PATCH', body: { columnaDestinoId: columna.id } });
      setTarea(t);
      alActualizar(t);
      toast.exito(`Movida a ${columna.nombre}`);
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function eliminar() {
    if (!window.confirm(`¿Eliminar la tarea “${tarea.titulo}” con sus subtareas, comentarios y bitácora?`)) return;
    try {
      await api(`/tareas/${tarea.id}`, { method: 'DELETE' });
      toast.exito('Tarea eliminada');
      alEliminar(tarea.id);
    } catch (e) {
      toast.error(e.message);
    }
  }

  const puedeEliminar = tarea && (tarea.creadorId === usuario.id || proyecto.miRol === 'ADMIN');
  const pestanas = tarea
    ? [
        { id: 'detalles', nombre: 'Detalles' },
        { id: 'subtareas', nombre: `Subtareas (${tarea.subtareas.length})` },
        { id: 'comentarios', nombre: 'Comentarios' },
        { id: 'historial', nombre: 'Historial' },
      ]
    : [];

  return (
    <Modal abierto={Boolean(tareaId)} alCerrar={alCerrar} titulo={tarea ? `Tarea #${tarea.id}` : 'Tarea'} ancho="max-w-3xl">
      {error ? (
        <ErrorCarga error={error} alReintentar={cargar} />
      ) : !tarea ? (
        <Cargando />
      ) : (
        <div className="space-y-5">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold leading-snug text-slate-900">
              {tarea.tipo === 'BUG' && (
                <span className="mr-2 align-[3px]">
                  <InsigniaBug />
                </span>
              )}
              {tarea.titulo}
            </h3>
            <MoverEstado tarea={tarea} columnas={columnas} alMover={mover} />
            <p className="text-xs text-slate-400">
              Creada por {tarea.creador.nombre} el {formatoMomento(tarea.fechaCreacion)}
              {tarea.fechaCierre && ` · Cerrada el ${formatoDiaLocal(tarea.fechaCierre)}`}
              {tarea.vencida && <span className="ml-1 font-medium text-red-600">· Vencida</span>}
            </p>
          </div>

          <div className="border-b border-slate-200">
            <div className="-mb-px flex gap-5 overflow-x-auto" role="tablist">
              {pestanas.map((p) => (
                <button
                  key={p.id}
                  role="tab"
                  aria-selected={pestana === p.id}
                  onClick={() => setPestana(p.id)}
                  className={`whitespace-nowrap border-b-2 pb-2.5 text-sm font-medium transition ${
                    pestana === p.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {p.nombre}
                </button>
              ))}
            </div>
          </div>

          {pestana === 'detalles' && (
            <>
              <FormTarea
                key={tarea.id}
                tarea={tarea}
                miembros={proyecto.miembros}
                etiquetas={proyecto.etiquetas}
                textoBoton="Guardar cambios"
                alEnviar={async (body) => {
                  const t = await api(`/tareas/${tarea.id}`, { method: 'PUT', body });
                  setTarea(t);
                  alActualizar(t);
                  toast.exito('Tarea actualizada');
                }}
              />
              {puedeEliminar && (
                <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50/50 px-4 py-3">
                  <p className="text-sm text-red-800">Eliminar borra también subtareas, comentarios y bitácora.</p>
                  <Boton variante="peligro" tamano="sm" onClick={eliminar}>
                    Eliminar tarea
                  </Boton>
                </div>
              )}
            </>
          )}
          {pestana === 'subtareas' && <Subtareas tarea={tarea} alCambiar={cargar} />}
          {pestana === 'comentarios' && <Comentarios tareaId={tarea.id} />}
          {pestana === 'historial' && <Bitacora key={tarea.columna.tipo} tareaId={tarea.id} />}
        </div>
      )}
    </Modal>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Alerta, Boton, Cargando, Entrada, ErrorCarga, Modal, Vacio } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useRecurso } from '../../hooks/useRecurso';
import { ESTADOS, formatoDiaLocal } from '../../lib/formato';

function Indicador({ titulo, valor, detalle, color }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-slate-500">{titulo}</p>
      <p className={`mt-1 text-3xl font-semibold tabular-nums ${color}`}>{valor}</p>
      {detalle && <p className="mt-1 text-xs text-slate-400">{detalle}</p>}
    </div>
  );
}

function Dashboard({ proyectoId }) {
  const { datos: d, error, cargando, recargar } = useRecurso(`/proyectos/${proyectoId}/dashboard`);
  if (cargando) return <Cargando texto="Cargando resumen…" />;
  if (error) return <ErrorCarga error={error} alReintentar={recargar} />;

  const avance = d.total ? Math.round((d.completadas / d.total) * 100) : 0;

  return (
    <section>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicador titulo="Tareas totales" valor={d.total} color="text-slate-900" />
        <Indicador titulo="Completadas" valor={d.completadas} detalle={`${avance}% del proyecto`} color="text-emerald-600" />
        <Indicador titulo="En progreso" valor={d.enProgreso} color="text-blue-600" />
        <Indicador titulo="Vencidas" valor={d.vencidas} detalle="Fecha límite pasada sin completar" color={d.vencidas ? 'text-red-600' : 'text-slate-900'} />
      </div>

      <div className="card mt-4 p-4">
        <p className="text-sm font-medium text-slate-700">Distribución por estado</p>
        {d.total === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Aún no hay tareas en este proyecto.</p>
        ) : (
          <>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-100">
              {Object.entries(ESTADOS).map(([clave, e]) =>
                d.porEstado[clave] ? (
                  <div key={clave} className={e.color} style={{ width: `${(d.porEstado[clave] / d.total) * 100}%` }} title={`${e.nombre}: ${d.porEstado[clave]}`} />
                ) : null,
              )}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
              {Object.entries(ESTADOS).map(([clave, e]) => (
                <li key={clave} className="flex items-center gap-1.5 text-slate-600">
                  <span className={`h-2.5 w-2.5 rounded-full ${e.color}`} />
                  {e.nombre}
                  <span className="font-medium tabular-nums text-slate-900">{d.porEstado[clave] ?? 0}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

function ModalTablero({ abierto, alCerrar, tablero, proyectoId, alGuardar }) {
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setNombre(tablero?.nombre ?? '');
    setError('');
  }, [abierto, tablero]);

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      const body = { nombre: nombre.trim() };
      const res = tablero
        ? await api(`/tableros/${tablero.id}`, { method: 'PUT', body })
        : await api(`/proyectos/${proyectoId}/tableros`, { method: 'POST', body });
      alGuardar(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal abierto={abierto} alCerrar={alCerrar} titulo={tablero ? 'Renombrar tablero' : 'Nuevo tablero'} ancho="max-w-md">
      <form onSubmit={enviar} className="space-y-4">
        <Alerta>{error}</Alerta>
        <Entrada
          etiqueta="Nombre"
          placeholder="Ej. Sprint 2"
          required
          autoFocus
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          ayuda={tablero ? null : 'Se crea con las columnas Por hacer, En progreso, En revisión / QA y Completado.'}
        />
        <div className="flex justify-end gap-2">
          <Boton variante="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" cargando={enviando}>
            {tablero ? 'Guardar' : 'Crear tablero'}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}

export default function ResumenProyecto({ proyecto, alCambiar }) {
  const toast = useToast();
  const esAdminProyecto = proyecto.miRol === 'ADMIN';
  // null = cerrado, {} = nuevo, tablero = renombrar
  const [modal, setModal] = useState(null);

  async function eliminar(t) {
    if (!window.confirm(`¿Eliminar el tablero “${t.nombre}” con todas sus tareas? Esta acción no se puede deshacer.`)) return;
    try {
      await api(`/tableros/${t.id}`, { method: 'DELETE' });
      toast.exito('Tablero eliminado');
      alCambiar();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-8">
      <Dashboard proyectoId={proyecto.id} />

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Tableros</h2>
          {esAdminProyecto && (
            <Boton tamano="sm" onClick={() => setModal({})}>
              + Nuevo tablero
            </Boton>
          )}
        </div>
        <div className="mt-3">
          {proyecto.tableros.length === 0 ? (
            <Vacio titulo="Este proyecto aún no tiene tableros">
              {esAdminProyecto ? 'Crea uno para empezar a organizar tareas.' : 'Un administrador del proyecto debe crear el primero.'}
            </Vacio>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {proyecto.tableros.map((t) => (
                <li key={t.id} className="card flex items-center gap-3 p-4 transition hover:border-indigo-300">
                  <Link to={`/tableros/${t.id}`} className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900 hover:text-indigo-700">{t.nombre}</p>
                    <p className="text-xs text-slate-400">Creado el {formatoDiaLocal(t.creadoEn)}</p>
                  </Link>
                  {esAdminProyecto && (
                    <div className="flex shrink-0 gap-1">
                      <Boton variante="fantasma" tamano="sm" onClick={() => setModal(t)}>
                        Renombrar
                      </Boton>
                      <Boton variante="fantasma" tamano="sm" className="!text-red-600" onClick={() => eliminar(t)}>
                        Eliminar
                      </Boton>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <ModalTablero
        abierto={modal !== null}
        alCerrar={() => setModal(null)}
        tablero={modal?.id ? modal : null}
        proyectoId={proyecto.id}
        alGuardar={() => {
          toast.exito(modal?.id ? 'Tablero renombrado' : 'Tablero creado');
          setModal(null);
          alCambiar();
        }}
      />
    </div>
  );
}

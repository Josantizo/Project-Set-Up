import { useCallback, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import FormTarea from '../components/tareas/FormTarea';
import ModalTarea from '../components/tareas/ModalTarea';
import TarjetaTarea from '../components/tareas/TarjetaTarea';
import { Boton, Cargando, ErrorCarga, Modal } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useRecurso } from '../hooks/useRecurso';
import { ESTADOS } from '../lib/formato';

// Devuelve el tablero con la tarea ubicada en su columna (columnaId), quitándola
// de donde estuviera. Si no cambia de columna conserva su posición.
function colocarTarea(tablero, tarea) {
  return {
    ...tablero,
    columnas: tablero.columnas.map((c) => {
      const idx = c.tareas.findIndex((t) => t.id === tarea.id);
      if (c.id === tarea.columnaId) {
        if (idx === -1) return { ...c, tareas: [...c.tareas, tarea] };
        const tareas = [...c.tareas];
        tareas[idx] = tarea;
        return { ...c, tareas };
      }
      return idx === -1 ? c : { ...c, tareas: c.tareas.filter((t) => t.id !== tarea.id) };
    }),
  };
}

function quitarTarea(tablero, tareaId) {
  return { ...tablero, columnas: tablero.columnas.map((c) => ({ ...c, tareas: c.tareas.filter((t) => t.id !== tareaId) })) };
}

const FILTROS_VACIOS = { buscar: '', responsable: '', prioridad: '', etiqueta: '' };

function cumpleFiltros(t, f, usuarioId) {
  if (f.buscar && !t.titulo.toLowerCase().includes(f.buscar.toLowerCase())) return false;
  if (f.prioridad && t.prioridad !== f.prioridad) return false;
  if (f.etiqueta && !t.etiquetas.some((e) => e.id === Number(f.etiqueta))) return false;
  if (f.responsable === 'mias') return t.responsableId === usuarioId;
  if (f.responsable === 'sin') return !t.responsableId;
  if (f.responsable) return t.responsableId === Number(f.responsable);
  return true;
}

export default function Tablero() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const { datos: tablero, setDatos, error, cargando, recargar } = useRecurso(`/tableros/${id}`);
  const { datos: proyecto, error: errorProyecto } = useRecurso(tablero ? `/proyectos/${tablero.proyectoId}` : null);

  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [creando, setCreando] = useState(false);
  const [arrastrada, setArrastrada] = useState(null);
  const [sobreColumna, setSobreColumna] = useState(null);

  const tareaAbierta = params.get('tarea') ? Number(params.get('tarea')) : null;
  const abrirTarea = (tareaId) => setParams({ tarea: String(tareaId) });
  const cerrarTarea = useCallback(() => setParams({}, { replace: true }), [setParams]);

  const actualizarTarea = useCallback((t) => setDatos((prev) => prev && colocarTarea(prev, t)), [setDatos]);

  const totalTareas = useMemo(() => tablero?.columnas.reduce((n, c) => n + c.tareas.length, 0) ?? 0, [tablero]);
  const hayFiltros = Object.values(filtros).some(Boolean);

  if (cargando || (tablero && !proyecto && !errorProyecto)) return <Cargando />;
  if (error || errorProyecto) return <ErrorCarga error={error ?? errorProyecto} alReintentar={recargar} />;

  async function soltarEn(columna) {
    const tarea = arrastrada;
    setArrastrada(null);
    setSobreColumna(null);
    if (!tarea || tarea.columnaId === columna.id) return;

    // Movimiento optimista; si el backend lo rechaza la tarjeta vuelve a su columna
    actualizarTarea({ ...tarea, columnaId: columna.id, columna: { ...tarea.columna, id: columna.id, nombre: columna.nombre, tipo: columna.tipo } });
    try {
      const movida = await api(`/tareas/${tarea.id}/mover`, { method: 'PATCH', body: { columnaDestinoId: columna.id } });
      actualizarTarea(movida);
    } catch (e) {
      actualizarTarea(tarea);
      toast.error(e.message);
    }
  }

  return (
    // Alto de la ventana menos la barra superior (3.5rem + 1px de borde)
    <div className="flex h-[calc(100dvh-3.5rem-1px)] flex-col">
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <nav className="text-sm text-slate-500">
          <Link to="/proyectos" className="hover:text-slate-700">
            Proyectos
          </Link>
          <span className="mx-1.5">/</span>
          <Link to={`/proyectos/${proyecto.id}`} className="hover:text-slate-700">
            {proyecto.nombre}
          </Link>
        </nav>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-slate-900">
            {tablero.nombre}
            <span className="ml-2 text-sm font-normal text-slate-400">{totalTareas} tareas</span>
          </h1>
          <Boton onClick={() => setCreando(true)}>+ Nueva tarea</Boton>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            aria-label="Buscar tareas"
            className="input w-full sm:w-56"
            placeholder="Buscar por título…"
            value={filtros.buscar}
            onChange={(e) => setFiltros({ ...filtros, buscar: e.target.value })}
          />
          <select
            aria-label="Filtrar por responsable"
            className="input w-auto"
            value={filtros.responsable}
            onChange={(e) => setFiltros({ ...filtros, responsable: e.target.value })}
          >
            <option value="">Todos los responsables</option>
            <option value="mias">Asignadas a mí</option>
            <option value="sin">Sin asignar</option>
            {proyecto.miembros.map((m) => (
              <option key={m.usuarioId} value={m.usuarioId}>
                {m.usuario.nombre}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar por prioridad"
            className="input w-auto"
            value={filtros.prioridad}
            onChange={(e) => setFiltros({ ...filtros, prioridad: e.target.value })}
          >
            <option value="">Toda prioridad</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Media</option>
            <option value="BAJA">Baja</option>
          </select>
          {proyecto.etiquetas.length > 0 && (
            <select
              aria-label="Filtrar por etiqueta"
              className="input w-auto"
              value={filtros.etiqueta}
              onChange={(e) => setFiltros({ ...filtros, etiqueta: e.target.value })}
            >
              <option value="">Todas las etiquetas</option>
              {proyecto.etiquetas.map((et) => (
                <option key={et.id} value={et.id}>
                  {et.nombre}
                </option>
              ))}
            </select>
          )}
          {hayFiltros && (
            <Boton variante="fantasma" tamano="sm" onClick={() => setFiltros(FILTROS_VACIOS)}>
              Limpiar filtros
            </Boton>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        {/* Columnas de ancho fijo con scroll horizontal; en pantallas grandes reparten el ancho */}
        <div className="grid h-full w-max min-w-full auto-cols-[17rem] grid-flow-col gap-4 p-4 sm:px-6 xl:w-auto xl:auto-cols-[minmax(0,1fr)]">
          {tablero.columnas.map((columna) => {
            const visibles = columna.tareas.filter((t) => cumpleFiltros(t, filtros, usuario.id));
            const resaltada = arrastrada && sobreColumna === columna.id && arrastrada.columnaId !== columna.id;
            return (
              <section
                key={columna.id}
                aria-label={columna.nombre}
                onDragOver={(e) => {
                  if (!arrastrada) return;
                  e.preventDefault();
                  if (sobreColumna !== columna.id) setSobreColumna(columna.id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  soltarEn(columna);
                }}
                className={`flex min-h-0 flex-col rounded-xl bg-slate-100 transition ${resaltada ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-300' : ''}`}
              >
                <header className="flex items-center gap-2 px-3 pb-2 pt-3">
                  <span className={`h-2.5 w-2.5 rounded-full ${ESTADOS[columna.tipo].color}`} />
                  <h2 className="text-sm font-semibold text-slate-700">{columna.nombre}</h2>
                  <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-medium tabular-nums text-slate-500">
                    {hayFiltros ? `${visibles.length}/${columna.tareas.length}` : columna.tareas.length}
                  </span>
                </header>
                <ul className="flex-1 space-y-2 overflow-y-auto px-2 pb-3">
                  {visibles.map((t) => (
                    <TarjetaTarea
                      key={t.id}
                      tarea={t}
                      alAbrir={abrirTarea}
                      alArrastrar={setArrastrada}
                      alSoltarArrastre={() => {
                        setArrastrada(null);
                        setSobreColumna(null);
                      }}
                      arrastrando={arrastrada?.id === t.id}
                    />
                  ))}
                  {visibles.length === 0 && (
                    <li className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400">
                      {hayFiltros && columna.tareas.length ? 'Ninguna coincide con los filtros' : 'Sin tareas'}
                    </li>
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      </div>

      <Modal abierto={creando} alCerrar={() => setCreando(false)} titulo="Nueva tarea" ancho="max-w-2xl">
        <p className="mb-4 text-sm text-slate-500">La tarea se crea en “Por hacer”. Para pasarla a “En progreso” necesita un responsable.</p>
        <FormTarea
          miembros={proyecto.miembros}
          etiquetas={proyecto.etiquetas}
          textoBoton="Crear tarea"
          alCancelar={() => setCreando(false)}
          alEnviar={async (body) => {
            const t = await api('/tareas', { method: 'POST', body: { ...body, tableroId: tablero.id } });
            actualizarTarea(t);
            setCreando(false);
            toast.exito('Tarea creada');
          }}
        />
      </Modal>

      <ModalTarea
        tareaId={tareaAbierta}
        alCerrar={cerrarTarea}
        proyecto={proyecto}
        columnas={tablero.columnas}
        alActualizar={actualizarTarea}
        alEliminar={(tareaId) => {
          setDatos((prev) => quitarTarea(prev, tareaId));
          cerrarTarea();
        }}
      />
    </div>
  );
}

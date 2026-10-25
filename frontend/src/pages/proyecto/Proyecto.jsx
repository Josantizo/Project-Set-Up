import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import ModalProyecto from '../../components/ModalProyecto';
import { Boton, Cargando, ErrorCarga, InsigniaRol } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useRecurso } from '../../hooks/useRecurso';
import EtiquetasProyecto from './EtiquetasProyecto';
import MiembrosProyecto from './MiembrosProyecto';
import ResumenProyecto from './ResumenProyecto';

export default function Proyecto() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const pestana = params.get('vista') ?? 'resumen';
  const { datos: proyecto, setDatos, error, cargando, recargar } = useRecurso(`/proyectos/${id}`);
  const [editando, setEditando] = useState(false);

  if (cargando) return <Cargando />;
  if (error) return <ErrorCarga error={error} alReintentar={error.status >= 500 || error.status === 0 ? recargar : null} />;

  const esAdminProyecto = proyecto.miRol === 'ADMIN';

  async function eliminar() {
    const ok = window.confirm(
      `¿Eliminar el proyecto “${proyecto.nombre}”?\n\nSe borrarán todos sus tableros, tareas, comentarios y bitácora. Esta acción no se puede deshacer.`,
    );
    if (!ok) return;
    try {
      await api(`/proyectos/${id}`, { method: 'DELETE' });
      toast.exito('Proyecto eliminado');
      navigate('/proyectos');
    } catch (e) {
      toast.error(e.message);
    }
  }

  const pestanas = [
    { id: 'resumen', nombre: 'Resumen' },
    { id: 'miembros', nombre: `Miembros (${proyecto.miembros.length})` },
    { id: 'etiquetas', nombre: `Etiquetas (${proyecto.etiquetas.length})` },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav className="text-sm text-slate-500">
        <Link to="/proyectos" className="hover:text-slate-700">
          Proyectos
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-700">{proyecto.nombre}</span>
      </nav>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">{proyecto.nombre}</h1>
            <InsigniaRol rol={proyecto.miRol} />
          </div>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">{proyecto.descripcion || 'Sin descripción'}</p>
          <p className="mt-1 text-xs text-slate-400">Creado por {proyecto.creador.nombre}</p>
        </div>
        {esAdminProyecto && (
          <div className="flex gap-2">
            <Boton variante="secundario" onClick={() => setEditando(true)}>
              Editar
            </Boton>
            <Boton variante="secundario" className="!text-red-600" onClick={eliminar}>
              Eliminar
            </Boton>
          </div>
        )}
      </div>

      <div className="mt-6 border-b border-slate-200">
        <div className="-mb-px flex gap-6 overflow-x-auto" role="tablist">
          {pestanas.map((p) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={pestana === p.id}
              onClick={() => setParams(p.id === 'resumen' ? {} : { vista: p.id }, { replace: true })}
              className={`whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition ${
                pestana === p.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {p.nombre}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {pestana === 'miembros' ? (
          <MiembrosProyecto proyecto={proyecto} alCambiar={recargar} />
        ) : pestana === 'etiquetas' ? (
          <EtiquetasProyecto proyecto={proyecto} alCambiar={recargar} />
        ) : (
          <ResumenProyecto proyecto={proyecto} alCambiar={recargar} />
        )}
      </div>

      <ModalProyecto
        abierto={editando}
        alCerrar={() => setEditando(false)}
        proyecto={proyecto}
        alGuardar={(p) => {
          setDatos({ ...proyecto, nombre: p.nombre, descripcion: p.descripcion });
          setEditando(false);
          toast.exito('Proyecto actualizado');
        }}
      />
    </div>
  );
}

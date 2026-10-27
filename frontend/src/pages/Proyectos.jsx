import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ModalProyecto from '../components/ModalProyecto';
import { Boton, Cargando, ErrorCarga, InsigniaRol, Vacio } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useRecurso } from '../hooks/useRecurso';
import { formatoDiaLocal } from '../lib/formato';

export default function Proyectos() {
  const { usuario, esAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { datos: proyectos, error, cargando, recargar } = useRecurso('/proyectos');
  const [creando, setCreando] = useState(false);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Proyectos</h1>
          <p className="mt-1 text-sm text-slate-500">
            {esAdmin ? 'Como administrador ves todos los proyectos.' : `Hola, ${usuario.nombre.split(' ')[0]}. Estos son los proyectos donde participas.`}
          </p>
        </div>
        {esAdmin && <Boton onClick={() => setCreando(true)}>+ Nuevo proyecto</Boton>}
      </div>

      <div className="mt-6">
        {cargando ? (
          <Cargando />
        ) : error ? (
          <ErrorCarga error={error} alReintentar={recargar} />
        ) : proyectos.length === 0 ? (
          <Vacio titulo="Todavía no hay proyectos">
            {esAdmin ? 'Crea el primero con “Nuevo proyecto”.' : 'Pide a un administrador que te agregue a un proyecto.'}
          </Vacio>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {proyectos.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/proyectos/${p.id}`}
                  className="card group flex h-full flex-col p-5 transition hover:border-indigo-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-semibold text-slate-900 group-hover:text-indigo-700">{p.nombre}</h2>
                    {p.miRol && <InsigniaRol rol={p.miRol} />}
                  </div>
                  <p className="mt-2 line-clamp-2 flex-1 text-sm text-slate-500">{p.descripcion || 'Sin descripción'}</p>
                  <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                    <span>
                      {p._count.tableros} {p._count.tableros === 1 ? 'tablero' : 'tableros'}
                    </span>
                    <span>
                      {p._count.miembros} {p._count.miembros === 1 ? 'miembro' : 'miembros'}
                    </span>
                    <span className="ml-auto">{formatoDiaLocal(p.creadoEn)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ModalProyecto
        abierto={creando}
        alCerrar={() => setCreando(false)}
        alGuardar={(p) => {
          toast.exito('Proyecto creado');
          navigate(`/proyectos/${p.id}`);
        }}
      />
    </div>
  );
}

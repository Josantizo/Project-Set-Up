import { useState } from 'react';
import { api } from '../../api/client';
import { Alerta, Avatar, Boton, InsigniaRol, Selector } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useRecurso } from '../../hooks/useRecurso';

function AgregarMiembro({ proyecto, alAgregar }) {
  const { datos: usuarios } = useRecurso('/usuarios');
  const [usuarioId, setUsuarioId] = useState('');
  const [rol, setRol] = useState('MIEMBRO');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const idsMiembros = new Set(proyecto.miembros.map((m) => m.usuarioId));
  const disponibles = (usuarios ?? []).filter((u) => !idsMiembros.has(u.id));

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      await api(`/proyectos/${proyecto.id}/miembros`, { method: 'POST', body: { usuarioId: Number(usuarioId), rol } });
      setUsuarioId('');
      setRol('MIEMBRO');
      alAgregar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="card space-y-3 p-4">
      <p className="text-sm font-medium text-slate-700">Agregar miembro</p>
      <Alerta>{error}</Alerta>
      <div className="grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end">
        <Selector etiqueta="Usuario" required value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)}>
          <option value="">{usuarios ? (disponibles.length ? 'Selecciona un usuario…' : 'Todos los usuarios ya son miembros') : 'Cargando…'}</option>
          {disponibles.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre} — {u.email}
            </option>
          ))}
        </Selector>
        <Selector etiqueta="Rol en el proyecto" value={rol} onChange={(e) => setRol(e.target.value)}>
          <option value="MIEMBRO">Miembro</option>
          <option value="ADMIN">Admin</option>
        </Selector>
        <Boton type="submit" cargando={enviando} disabled={!usuarioId}>
          Agregar
        </Boton>
      </div>
    </form>
  );
}

export default function MiembrosProyecto({ proyecto, alCambiar }) {
  const { usuario } = useAuth();
  const toast = useToast();
  const esAdminProyecto = proyecto.miRol === 'ADMIN';

  async function cambiarRol(m, rol) {
    try {
      await api(`/proyectos/${proyecto.id}/miembros/${m.usuarioId}`, { method: 'PUT', body: { rol } });
      toast.exito(`${m.usuario.nombre} ahora es ${rol === 'ADMIN' ? 'admin' : 'miembro'} del proyecto`);
      alCambiar();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function quitar(m) {
    if (!window.confirm(`¿Quitar a ${m.usuario.nombre} del proyecto? Sus tareas asignadas conservarán el responsable.`)) return;
    try {
      await api(`/proyectos/${proyecto.id}/miembros/${m.usuarioId}`, { method: 'DELETE' });
      toast.exito('Miembro quitado');
      alCambiar();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-4">
      {esAdminProyecto && (
        <AgregarMiembro
          proyecto={proyecto}
          alAgregar={() => {
            toast.exito('Miembro agregado');
            alCambiar();
          }}
        />
      )}

      <ul className="card divide-y divide-slate-100">
        {proyecto.miembros.map((m) => (
          <li key={m.usuarioId} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <Avatar usuario={m.usuario} tamano="h-9 w-9 text-sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">
                {m.usuario.nombre}
                {m.usuarioId === usuario.id && <span className="ml-1.5 text-xs font-normal text-slate-400">(tú)</span>}
              </p>
              <p className="truncate text-xs text-slate-500">{m.usuario.email}</p>
            </div>
            {esAdminProyecto ? (
              <div className="flex items-center gap-2">
                <select
                  aria-label={`Rol de ${m.usuario.nombre}`}
                  className="input w-auto py-1.5"
                  value={m.rol}
                  onChange={(e) => cambiarRol(m, e.target.value)}
                >
                  <option value="MIEMBRO">Miembro</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <Boton variante="fantasma" tamano="sm" className="!text-red-600" onClick={() => quitar(m)}>
                  Quitar
                </Boton>
              </div>
            ) : (
              <InsigniaRol rol={m.rol} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

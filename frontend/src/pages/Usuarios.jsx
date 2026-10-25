import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Alerta, Avatar, Boton, Cargando, Entrada, ErrorCarga, InsigniaRol, Modal, Selector, Vacio } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useRecurso } from '../hooks/useRecurso';
import { formatoDiaLocal } from '../lib/formato';
import { AYUDA_CONTRASENA } from './auth/Registro';

function ModalUsuario({ abierto, alCerrar, usuario, alGuardar }) {
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'MIEMBRO' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  // Detalle (proyectos y conteo de tareas) solo al editar
  const { datos: detalle } = useRecurso(abierto && usuario ? `/usuarios/${usuario.id}` : null);

  useEffect(() => {
    if (!abierto) return;
    setForm({ nombre: usuario?.nombre ?? '', email: usuario?.email ?? '', password: '', rol: usuario?.rol ?? 'MIEMBRO' });
    setError('');
  }, [abierto, usuario]);

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      const body = { nombre: form.nombre.trim(), email: form.email.trim(), rol: form.rol };
      if (usuario) await api(`/usuarios/${usuario.id}`, { method: 'PUT', body });
      else await api('/usuarios', { method: 'POST', body: { ...body, password: form.password } });
      alGuardar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal abierto={abierto} alCerrar={alCerrar} titulo={usuario ? 'Editar usuario' : 'Nuevo usuario'}>
      <form onSubmit={enviar} className="space-y-4">
        <Alerta>{error}</Alerta>
        <Entrada etiqueta="Nombre" name="nombre" required value={form.nombre} onChange={cambiar} />
        <Entrada etiqueta="Correo" type="email" name="email" required value={form.email} onChange={cambiar} />
        {!usuario && (
          <Entrada
            etiqueta="Contraseña inicial"
            type="password"
            name="password"
            autoComplete="new-password"
            required
            ayuda={AYUDA_CONTRASENA}
            value={form.password}
            onChange={cambiar}
          />
        )}
        <Selector etiqueta="Rol global" name="rol" value={form.rol} onChange={cambiar} ayuda="El ADMIN global crea proyectos, gestiona usuarios y actúa como admin en todos los proyectos.">
          <option value="MIEMBRO">Miembro</option>
          <option value="ADMIN">Admin</option>
        </Selector>

        {usuario && detalle && (
          <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm">
            <p className="text-slate-600">
              {detalle._count.tareasAsignadas} tareas asignadas · {detalle._count.tareasCreadas} creadas
            </p>
            {detalle.membresias.length > 0 && (
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {detalle.membresias.map((m) => (
                  <li key={m.proyecto.id}>
                    <Link to={`/proyectos/${m.proyecto.id}`} className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-xs text-slate-700 ring-1 ring-slate-200 hover:ring-indigo-300">
                      {m.proyecto.nombre}
                      <span className="text-slate-400">· {m.rol === 'ADMIN' ? 'admin' : 'miembro'}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Boton variante="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" cargando={enviando}>
            {usuario ? 'Guardar cambios' : 'Crear usuario'}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}

export default function Usuarios() {
  const { usuario: yo } = useAuth();
  const toast = useToast();
  const [buscar, setBuscar] = useState('');
  const [consulta, setConsulta] = useState('');
  const { datos: usuarios, error, cargando, recargar } = useRecurso(`/usuarios${consulta ? `?buscar=${encodeURIComponent(consulta)}` : ''}`);
  // null = cerrado, {} = nuevo, usuario = editar
  const [modal, setModal] = useState(null);

  // Búsqueda en el servidor con una pequeña espera mientras se escribe
  useEffect(() => {
    const t = setTimeout(() => setConsulta(buscar.trim()), 300);
    return () => clearTimeout(t);
  }, [buscar]);

  async function eliminar(u) {
    if (!window.confirm(`¿Eliminar a ${u.nombre}? Solo se puede si no tiene actividad en el sistema.`)) return;
    try {
      await api(`/usuarios/${u.id}`, { method: 'DELETE' });
      toast.exito('Usuario eliminado');
      recargar();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Usuarios</h1>
          <p className="mt-1 text-sm text-slate-500">Gestiona las cuentas y los roles globales.</p>
        </div>
        <Boton onClick={() => setModal({})}>+ Nuevo usuario</Boton>
      </div>

      <input
        aria-label="Buscar usuarios"
        className="input mt-6 sm:max-w-xs"
        placeholder="Buscar por nombre o correo…"
        value={buscar}
        onChange={(e) => setBuscar(e.target.value)}
      />

      <div className="mt-4">
        {cargando && !usuarios ? (
          <Cargando />
        ) : error ? (
          <ErrorCarga error={error} alReintentar={recargar} />
        ) : usuarios.length === 0 ? (
          <Vacio titulo="Sin resultados">No hay usuarios que coincidan con “{consulta}”.</Vacio>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Usuario</th>
                  <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Rol</th>
                  <th className="hidden px-4 py-2.5 font-medium md:table-cell">Registro</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar usuario={u} tamano="h-8 w-8 text-xs" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">
                            {u.nombre}
                            {u.id === yo.id && <span className="ml-1.5 text-xs font-normal text-slate-400">(tú)</span>}
                          </p>
                          <p className="truncate text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <InsigniaRol rol={u.rol} />
                    </td>
                    <td className="hidden px-4 py-3 text-slate-500 md:table-cell">{formatoDiaLocal(u.creadoEn)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Boton variante="fantasma" tamano="sm" onClick={() => setModal(u)}>
                          Editar
                        </Boton>
                        {u.id !== yo.id && (
                          <Boton variante="fantasma" tamano="sm" className="!text-red-600" onClick={() => eliminar(u)}>
                            Eliminar
                          </Boton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ModalUsuario
        abierto={modal !== null}
        alCerrar={() => setModal(null)}
        usuario={modal?.id ? modal : null}
        alGuardar={() => {
          toast.exito(modal?.id ? 'Usuario actualizado' : 'Usuario creado');
          setModal(null);
          recargar();
        }}
      />
    </div>
  );
}

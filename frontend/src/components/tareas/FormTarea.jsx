import { useState } from 'react';
import { aInputFecha } from '../../lib/formato';
import { Alerta, AreaTexto, Boton, Campo, Entrada, Selector } from '../ui';

function estadoInicial(t) {
  return {
    titulo: t?.titulo ?? '',
    descripcion: t?.descripcion ?? '',
    prioridad: t?.prioridad ?? 'MEDIA',
    tipo: t?.tipo ?? 'TAREA',
    responsableId: t?.responsableId ? String(t.responsableId) : '',
    etiquetas: t?.etiquetas?.map((e) => e.id) ?? [],
    fechaInicio: aInputFecha(t?.fechaInicio),
    fechaLimite: aInputFecha(t?.fechaLimite),
  };
}

// Formulario de crear/editar tarea. `alEnviar` recibe el cuerpo listo para la API
// y puede lanzar un error, que se muestra arriba del formulario.
export default function FormTarea({ tarea, miembros, etiquetas, alEnviar, alCancelar, textoBoton }) {
  const [form, setForm] = useState(() => estadoInicial(tarea));
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });
  const alternarEtiqueta = (id) =>
    setForm({ ...form, etiquetas: form.etiquetas.includes(id) ? form.etiquetas.filter((x) => x !== id) : [...form.etiquetas, id] });

  // El responsable actual puede ya no ser miembro (se conserva por historial)
  const opcionesResponsable = miembros.map((m) => m.usuario);
  if (tarea?.responsable && !opcionesResponsable.some((u) => u.id === tarea.responsable.id)) {
    opcionesResponsable.push(tarea.responsable);
  }

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await alEnviar({
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim() || null,
        prioridad: form.prioridad,
        tipo: form.tipo,
        responsableId: form.responsableId ? Number(form.responsableId) : null,
        etiquetas: form.etiquetas,
        fechaInicio: form.fechaInicio || null,
        fechaLimite: form.fechaLimite || null,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <Alerta>{error}</Alerta>
      <Entrada etiqueta="Título" required maxLength={191} value={form.titulo} onChange={cambiar('titulo')} />
      <AreaTexto etiqueta="Descripción" placeholder="Opcional" value={form.descripcion} onChange={cambiar('descripcion')} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Selector etiqueta="Tipo" value={form.tipo} onChange={cambiar('tipo')}>
          <option value="TAREA">Tarea</option>
          <option value="BUG">Bug</option>
        </Selector>
        <Selector etiqueta="Prioridad" value={form.prioridad} onChange={cambiar('prioridad')}>
          <option value="ALTA">Alta</option>
          <option value="MEDIA">Media</option>
          <option value="BAJA">Baja</option>
        </Selector>
        <Selector etiqueta="Responsable" value={form.responsableId} onChange={cambiar('responsableId')}>
          <option value="">Sin asignar</option>
          {opcionesResponsable.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre}
            </option>
          ))}
        </Selector>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Entrada etiqueta="Fecha de inicio" type="date" value={form.fechaInicio} onChange={cambiar('fechaInicio')} />
        <Entrada etiqueta="Fecha límite" type="date" min={form.fechaInicio || undefined} value={form.fechaLimite} onChange={cambiar('fechaLimite')} />
      </div>

      <Campo etiqueta="Etiquetas">
        {etiquetas.length === 0 ? (
          <p className="text-sm text-slate-500">El proyecto no tiene etiquetas.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {etiquetas.map((et) => {
              const activa = form.etiquetas.includes(et.id);
              return (
                <button
                  key={et.id}
                  type="button"
                  aria-pressed={activa}
                  onClick={() => alternarEtiqueta(et.id)}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                    activa ? 'text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50'
                  }`}
                  style={activa ? { backgroundColor: et.color } : undefined}
                >
                  {activa ? '✓ ' : ''}
                  {et.nombre}
                </button>
              );
            })}
          </div>
        )}
      </Campo>

      <div className="flex justify-end gap-2 pt-2">
        {alCancelar && (
          <Boton variante="secundario" onClick={alCancelar}>
            Cancelar
          </Boton>
        )}
        <Boton type="submit" cargando={enviando}>
          {textoBoton}
        </Boton>
      </div>
    </form>
  );
}

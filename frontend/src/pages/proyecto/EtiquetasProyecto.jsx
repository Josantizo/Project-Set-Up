import { useState } from 'react';
import { api } from '../../api/client';
import { Alerta, Boton, Etiqueta, Vacio } from '../../components/ui';
import { useToast } from '../../context/ToastContext';

const COLORES = ['#6366f1', '#2563eb', '#0891b2', '#16a34a', '#ca8a04', '#ea580c', '#dc2626', '#db2777', '#7c3aed', '#475569'];

function FormEtiqueta({ inicial, alGuardar, alCancelar, textoBoton }) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [color, setColor] = useState(inicial?.color ?? COLORES[0]);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      await alGuardar({ nombre: nombre.trim(), color });
      if (!inicial) setNombre('');
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-3">
      <Alerta>{error}</Alerta>
      <div className="flex flex-wrap items-center gap-3">
        <input
          aria-label="Nombre de la etiqueta"
          className="input max-w-xs flex-1"
          placeholder="Nombre de la etiqueta"
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Color">
          {COLORES.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={c}
              onClick={() => setColor(c)}
              className={`h-6 w-6 rounded-full ring-offset-2 transition ${color === c ? 'ring-2 ring-slate-800' : 'hover:scale-110'}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color"
            aria-label="Color personalizado"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-6 w-8 cursor-pointer rounded border border-slate-300 bg-white"
          />
        </div>
        <div className="flex gap-2">
          <Boton type="submit" tamano="sm" cargando={enviando}>
            {textoBoton}
          </Boton>
          {alCancelar && (
            <Boton variante="secundario" tamano="sm" onClick={alCancelar}>
              Cancelar
            </Boton>
          )}
        </div>
      </div>
      {nombre.trim() && (
        <p className="text-xs text-slate-500">
          Vista previa: <Etiqueta etiqueta={{ nombre: nombre.trim(), color }} />
        </p>
      )}
    </form>
  );
}

export default function EtiquetasProyecto({ proyecto, alCambiar }) {
  const toast = useToast();
  const [editandoId, setEditandoId] = useState(null);
  const base = `/proyectos/${proyecto.id}/etiquetas`;

  async function eliminar(et) {
    if (!window.confirm(`¿Eliminar la etiqueta “${et.nombre}”? Se quitará de todas las tareas.`)) return;
    try {
      await api(`${base}/${et.id}`, { method: 'DELETE' });
      toast.exito('Etiqueta eliminada');
      alCambiar();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <p className="mb-3 text-sm font-medium text-slate-700">Nueva etiqueta</p>
        <FormEtiqueta
          textoBoton="Crear"
          alGuardar={async (body) => {
            await api(base, { method: 'POST', body });
            toast.exito('Etiqueta creada');
            alCambiar();
          }}
        />
      </div>

      {proyecto.etiquetas.length === 0 ? (
        <Vacio titulo="Sin etiquetas">Las etiquetas ayudan a clasificar tareas (Backend, Frontend, QA…).</Vacio>
      ) : (
        <ul className="card divide-y divide-slate-100">
          {proyecto.etiquetas.map((et) => (
            <li key={et.id} className="px-4 py-3">
              {editandoId === et.id ? (
                <FormEtiqueta
                  inicial={et}
                  textoBoton="Guardar"
                  alCancelar={() => setEditandoId(null)}
                  alGuardar={async (body) => {
                    await api(`${base}/${et.id}`, { method: 'PUT', body });
                    toast.exito('Etiqueta actualizada');
                    setEditandoId(null);
                    alCambiar();
                  }}
                />
              ) : (
                <div className="flex items-center gap-3">
                  <Etiqueta etiqueta={et} />
                  <span className="text-xs text-slate-400">{et.color}</span>
                  <div className="ml-auto flex gap-1">
                    <Boton variante="fantasma" tamano="sm" onClick={() => setEditandoId(et.id)}>
                      Editar
                    </Boton>
                    <Boton variante="fantasma" tamano="sm" className="!text-red-600" onClick={() => eliminar(et)}>
                      Eliminar
                    </Boton>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Alerta, AreaTexto, Boton, Entrada, Modal } from './ui';

// Crear (sin `proyecto`) o editar un proyecto.
export default function ModalProyecto({ abierto, alCerrar, proyecto, alGuardar }) {
  const [form, setForm] = useState({ nombre: '', descripcion: '' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setForm({ nombre: proyecto?.nombre ?? '', descripcion: proyecto?.descripcion ?? '' });
    setError('');
  }, [abierto, proyecto]);

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError('');
    const body = { nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || null };
    try {
      const res = proyecto
        ? await api(`/proyectos/${proyecto.id}`, { method: 'PUT', body })
        : await api('/proyectos', { method: 'POST', body });
      alGuardar(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal abierto={abierto} alCerrar={alCerrar} titulo={proyecto ? 'Editar proyecto' : 'Nuevo proyecto'}>
      <form onSubmit={enviar} className="space-y-4">
        <Alerta>{error}</Alerta>
        <Entrada etiqueta="Nombre" required autoFocus value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        <AreaTexto
          etiqueta="Descripción"
          placeholder="Opcional"
          value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Boton variante="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" cargando={enviando}>
            {proyecto ? 'Guardar cambios' : 'Crear proyecto'}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}

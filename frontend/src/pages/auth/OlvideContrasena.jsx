import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Alerta, Boton, Entrada } from '../../components/ui';
import AuthLayout from './AuthLayout';

export default function OlvideContrasena() {
  const [email, setEmail] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const res = await api('/auth/olvide-contrasena', { method: 'POST', body: { email: email.trim() } });
      setMensaje(res.mensaje);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthLayout
      titulo="Recuperar contraseña"
      subtitulo="Te generaremos un código para crear una contraseña nueva."
      pie={
        <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
          Volver a iniciar sesión
        </Link>
      }
    >
      {mensaje ? (
        <div className="space-y-4">
          <Alerta tipo="exito">{mensaje}</Alerta>
          <p className="text-sm text-slate-600">
            Por ahora el código no se envía por correo: aparece en la consola del backend como <code className="rounded bg-slate-100 px-1">[reset] Token para …</code>.
          </p>
          <Link
            to="/restablecer-contrasena"
            className="block rounded-lg bg-indigo-600 px-3.5 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700"
          >
            Ya tengo el código
          </Link>
        </div>
      ) : (
        <form onSubmit={enviar} className="space-y-4">
          <Alerta>{error}</Alerta>
          <Entrada etiqueta="Correo" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Boton type="submit" cargando={enviando} className="w-full">
            Generar código
          </Boton>
        </form>
      )}
    </AuthLayout>
  );
}

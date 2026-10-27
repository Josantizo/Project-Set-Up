import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { Alerta, Boton, Entrada } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import AuthLayout from './AuthLayout';
import { AYUDA_CONTRASENA } from './Registro';

export default function RestablecerContrasena() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ token: params.get('token') ?? '', password: '', confirmar: '' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmar) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setEnviando(true);
    try {
      await api('/auth/restablecer-contrasena', { method: 'POST', body: { token: form.token.trim(), password: form.password } });
      toast.exito('Contraseña actualizada. Ya puedes iniciar sesión.');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <AuthLayout
      titulo="Nueva contraseña"
      subtitulo="Pega el código de recuperación y elige tu nueva contraseña."
      pie={
        <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
          Volver a iniciar sesión
        </Link>
      }
    >
      <form onSubmit={enviar} className="space-y-4">
        <Alerta>{error}</Alerta>
        <Entrada etiqueta="Código de recuperación" name="token" required autoComplete="off" value={form.token} onChange={cambiar} />
        <Entrada
          etiqueta="Nueva contraseña"
          type="password"
          name="password"
          autoComplete="new-password"
          required
          ayuda={AYUDA_CONTRASENA}
          value={form.password}
          onChange={cambiar}
        />
        <Entrada
          etiqueta="Confirmar contraseña"
          type="password"
          name="confirmar"
          autoComplete="new-password"
          required
          value={form.confirmar}
          onChange={cambiar}
        />
        <Boton type="submit" cargando={enviando} className="w-full">
          Cambiar contraseña
        </Boton>
      </form>
    </AuthLayout>
  );
}

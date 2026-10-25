import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Alerta, Boton, Entrada } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from './AuthLayout';

export default function Login() {
  const { iniciarSesion } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await iniciarSesion(form.email.trim(), form.password);
      navigate(location.state?.desde ?? '/proyectos', { replace: true });
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <AuthLayout
      titulo="Iniciar sesión"
      subtitulo="Entra para ver tus proyectos y tareas."
      pie={
        <>
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="font-medium text-indigo-600 hover:text-indigo-700">
            Regístrate
          </Link>
        </>
      }
    >
      <form onSubmit={enviar} className="space-y-4">
        <Alerta>{error}</Alerta>
        <Entrada etiqueta="Correo" type="email" name="email" autoComplete="email" required value={form.email} onChange={cambiar} />
        <Entrada
          etiqueta="Contraseña"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={form.password}
          onChange={cambiar}
        />
        <div className="flex justify-end">
          <Link to="/olvide-contrasena" className="text-sm text-indigo-600 hover:text-indigo-700">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <Boton type="submit" cargando={enviando} className="w-full">
          Entrar
        </Boton>
      </form>
    </AuthLayout>
  );
}

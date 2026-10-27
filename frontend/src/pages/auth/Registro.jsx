import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alerta, Boton, Entrada } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from './AuthLayout';

export const AYUDA_CONTRASENA = 'Mínimo 8 caracteres, con mayúscula, minúscula y número.';

export default function Registro() {
  const { registrarse } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: '', email: '', password: '', confirmar: '' });
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
      await registrarse({ nombre: form.nombre.trim(), email: form.email.trim(), password: form.password });
      navigate('/proyectos', { replace: true });
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <AuthLayout
      titulo="Crear cuenta"
      subtitulo="Un administrador te agregará a los proyectos."
      pie={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
            Inicia sesión
          </Link>
        </>
      }
    >
      <form onSubmit={enviar} className="space-y-4">
        <Alerta>{error}</Alerta>
        <Entrada etiqueta="Nombre completo" name="nombre" autoComplete="name" required value={form.nombre} onChange={cambiar} />
        <Entrada etiqueta="Correo" type="email" name="email" autoComplete="email" required value={form.email} onChange={cambiar} />
        <Entrada
          etiqueta="Contraseña"
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
          Crear cuenta
        </Boton>
      </form>
    </AuthLayout>
  );
}

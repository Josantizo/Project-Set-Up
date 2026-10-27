import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Cargando } from './ui';

// Solo usuarios con sesión; si no, al login recordando a dónde iban.
export function RutaPrivada() {
  const { usuario, cargando } = useAuth();
  const location = useLocation();
  if (cargando) return <Cargando texto="Verificando sesión…" />;
  if (!usuario) return <Navigate to="/login" replace state={{ desde: location.pathname + location.search }} />;
  return <Outlet />;
}

// Solo ADMIN global.
export function RutaAdmin() {
  const { esAdmin } = useAuth();
  return esAdmin ? <Outlet /> : <Navigate to="/proyectos" replace />;
}

// Login, registro, etc.: si ya hay sesión, a la app.
export function RutaPublica() {
  const { usuario, cargando } = useAuth();
  if (cargando) return <Cargando texto="Verificando sesión…" />;
  return usuario ? <Navigate to="/proyectos" replace /> : <Outlet />;
}

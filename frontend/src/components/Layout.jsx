import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Avatar, InsigniaRol } from './ui';

function Enlace({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-md px-3 py-1.5 text-sm font-medium transition ${
          isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

// `compacto`: en pantallas pequeñas muestra solo el ícono
export function Logo({ compacto = false }) {
  return (
    <span className="flex items-center gap-2 font-semibold text-slate-900">
      <img src="/favicon.svg" alt="" className="h-7 w-7" />
      <span className={compacto ? 'hidden sm:inline' : ''}>Gestor de Tareas</span>
    </span>
  );
}

export default function Layout() {
  const { usuario, esAdmin, cerrarSesion } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="shrink-0" aria-label="Inicio">
            <Logo compacto />
          </Link>
          <nav className="flex items-center gap-1">
            <Enlace to="/proyectos">Proyectos</Enlace>
            {esAdmin && <Enlace to="/usuarios">Usuarios</Enlace>}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <Avatar usuario={usuario} />
              <div className="leading-tight">
                <p className="text-sm font-medium text-slate-800">{usuario.nombre}</p>
                <p className="text-xs text-slate-500">{usuario.email}</p>
              </div>
              <InsigniaRol rol={usuario.rol} />
            </div>
            <button
              onClick={() => {
                // Sin recordar la página: el siguiente usuario puede no tener acceso a ella
                cerrarSesion();
                navigate('/login', { replace: true });
              }}
              className="rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Salir
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

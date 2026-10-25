import { Link, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { RutaAdmin, RutaPrivada, RutaPublica } from './components/Rutas';
import Login from './pages/auth/Login';
import OlvideContrasena from './pages/auth/OlvideContrasena';
import Registro from './pages/auth/Registro';
import RestablecerContrasena from './pages/auth/RestablecerContrasena';
import Proyecto from './pages/proyecto/Proyecto';
import Proyectos from './pages/Proyectos';
import Tablero from './pages/Tablero';
import Usuarios from './pages/Usuarios';

function NoEncontrado() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-5xl font-bold text-slate-300">404</p>
      <p className="mt-3 text-slate-600">Esta página no existe.</p>
      <Link to="/proyectos" className="mt-6 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700">
        Ir a proyectos
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<RutaPublica />}>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/olvide-contrasena" element={<OlvideContrasena />} />
      </Route>
      {/* Accesible con o sin sesión: el código llega por fuera de la app */}
      <Route path="/restablecer-contrasena" element={<RestablecerContrasena />} />

      <Route element={<RutaPrivada />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/proyectos" replace />} />
          <Route path="/proyectos" element={<Proyectos />} />
          <Route path="/proyectos/:id" element={<Proyecto />} />
          <Route path="/tableros/:id" element={<Tablero />} />
          <Route element={<RutaAdmin />}>
            <Route path="/usuarios" element={<Usuarios />} />
          </Route>
          <Route path="*" element={<NoEncontrado />} />
        </Route>
      </Route>
    </Routes>
  );
}

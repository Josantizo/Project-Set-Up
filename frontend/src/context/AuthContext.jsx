import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, configurarAlExpirarSesion, guardarToken, obtenerToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(Boolean(obtenerToken()));

  const cerrarSesion = useCallback(() => {
    guardarToken(null);
    setUsuario(null);
  }, []);

  useEffect(() => {
    configurarAlExpirarSesion(cerrarSesion);
    if (!obtenerToken()) return;
    api('/auth/perfil')
      .then(setUsuario)
      .catch(() => cerrarSesion())
      .finally(() => setCargando(false));
  }, [cerrarSesion]);

  const iniciarSesion = useCallback(async (email, password) => {
    const { token, usuario } = await api('/auth/login', { method: 'POST', body: { email, password } });
    guardarToken(token);
    setUsuario(usuario);
  }, []);

  const registrarse = useCallback(async (datos) => {
    const { token, usuario } = await api('/auth/registro', { method: 'POST', body: datos });
    guardarToken(token);
    setUsuario(usuario);
  }, []);

  const valor = useMemo(
    () => ({
      usuario,
      cargando,
      esAdmin: usuario?.rol === 'ADMIN',
      iniciarSesion,
      registrarse,
      cerrarSesion,
    }),
    [usuario, cargando, iniciarSesion, registrarse, cerrarSesion],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

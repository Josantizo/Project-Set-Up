import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';

// Carga una ruta GET de la API y expone datos, error, estado de carga y recarga.
// Si `ruta` es null no hace nada (útil para cargas que dependen de otro dato).
export function useRecurso(ruta) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(Boolean(ruta));

  const recargar = useCallback(async () => {
    if (!ruta) return;
    try {
      const res = await api(ruta);
      setDatos(res);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [ruta]);

  useEffect(() => {
    setCargando(Boolean(ruta));
    setDatos(null);
    recargar();
  }, [ruta, recargar]);

  return { datos, setDatos, error, cargando, recargar };
}

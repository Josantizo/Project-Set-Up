// Cliente HTTP de la API. Agrega el token, convierte los errores del backend
// ({ error: "..." }) en excepciones con mensaje listo para mostrar.
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';
const CLAVE_TOKEN = 'token';

let token = leerToken();
let alExpirarSesion = () => {};

function leerToken() {
  try {
    return localStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
}

export function obtenerToken() {
  return token;
}

export function guardarToken(nuevo) {
  token = nuevo;
  try {
    if (nuevo) localStorage.setItem(CLAVE_TOKEN, nuevo);
    else localStorage.removeItem(CLAVE_TOKEN);
  } catch {
    // Sin almacenamiento (modo privado): la sesión dura lo que la pestaña.
  }
}

export function configurarAlExpirarSesion(fn) {
  alExpirarSesion = fn;
}

export class ApiError extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

export async function api(ruta, { method = 'GET', body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(BASE_URL + ruta, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. ¿Está corriendo el backend?');
  }

  if (res.status === 204) return null;
  const datos = await res.json().catch(() => null);

  if (!res.ok) {
    // Un 401 con token significa sesión vencida o usuario eliminado
    if (res.status === 401 && token) alExpirarSesion();
    throw new ApiError(res.status, datos?.error ?? `Error ${res.status}`);
  }
  return datos;
}

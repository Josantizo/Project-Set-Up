import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

export const CLAVE = 'Clave123!';

// IDs fijos que crea prisma/seed.js sobre una base recién reiniciada
export const SEED = {
  usuarios: { admin: 1, ana: 2, luis: 3, maria: 4 },
  proyectoId: 1,
  tableroId: 1,
  columnas: { POR_HACER: 1, EN_PROGRESO: 2, EN_REVISION: 3, COMPLETADO: 4 },
  etiquetas: { Backend: 1, Frontend: 2, Bug: 3 },
  tareas: { completada: 1, enRevision: 2, enProgreso: 3, vencida: 4, sinResponsable: 5, bug: 6 },
};

export async function login(email, password = CLAVE) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`No se pudo iniciar sesión con ${email}: ${res.status}`);
  return res.body.token;
}

// Cliente con token: api(token).get('/api/...')
export const api = (token) => {
  const conToken = (r) => (token ? r.set('Authorization', `Bearer ${token}`) : r);
  return {
    get: (url) => conToken(request(app).get(url)),
    post: (url, body) => conToken(request(app).post(url)).send(body),
    put: (url, body) => conToken(request(app).put(url)).send(body),
    patch: (url, body) => conToken(request(app).patch(url)).send(body),
    delete: (url) => conToken(request(app).delete(url)),
  };
};

// Verifica el status y devuelve el body; si falla, el mensaje incluye la respuesta
export function esperar(res, status) {
  assert.equal(res.status, status, `Esperaba ${status} y llegó ${res.status}: ${JSON.stringify(res.body)}`);
  return res.body;
}

let contador = 0;
export const emailUnico = (prefijo = 'prueba') => `${prefijo}.${Date.now()}.${++contador}@demo.com`;

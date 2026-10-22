import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma.js';
import { api, esperar, login, emailUnico, CLAVE, SEED } from './helpers.js';

let ana, admin, u, tokU, proyecto;
const email = emailUnico('gestion');

before(async () => {
  ana = await login('ana@demo.com');
  admin = await login('admin@demo.com');
});

after(async () => {
  if (proyecto) await prisma.proyecto.deleteMany({ where: { id: proyecto.id } });
  if (u) await prisma.usuario.deleteMany({ where: { id: u.id } });
  await prisma.$disconnect();
});

describe('Listar y buscar usuarios', () => {
  test('requiere autenticación', async () => {
    esperar(await api().get('/api/usuarios'), 401);
  });

  test('un miembro ve solo id, nombre y email; el ADMIN ve también el rol', async () => {
    const deAna = esperar(await api(ana).get('/api/usuarios'), 200);
    assert.deepEqual(Object.keys(deAna[0]).sort(), ['email', 'id', 'nombre']);
    const deAdmin = esperar(await api(admin).get('/api/usuarios'), 200);
    assert.ok('rol' in deAdmin[0] && !('password' in deAdmin[0]));
  });

  test('busca por nombre o correo', async () => {
    const r = esperar(await api(ana).get('/api/usuarios?buscar=luis'), 200);
    assert.deepEqual(r.map((x) => x.email), ['luis@demo.com']);
  });

  test('el detalle es solo para ADMIN y no expone la contraseña', async () => {
    esperar(await api(ana).get(`/api/usuarios/${SEED.usuarios.luis}`), 403);
    const d = esperar(await api(admin).get(`/api/usuarios/${SEED.usuarios.ana}`), 200);
    assert.ok(d.membresias.length >= 1);
    assert.equal(d.password, undefined);
    esperar(await api(admin).get('/api/usuarios/99999'), 404);
  });
});

describe('Crear usuarios', () => {
  for (const [caso, body, status] of [
    ['contraseña débil', { nombre: 'Prueba', email, password: 'clave' }, 400],
    ['correo inválido', { nombre: 'Prueba', email: 'malo', password: CLAVE }, 400],
    ['sin nombre', { email, password: CLAVE }, 400],
    ['correo ya registrado', { nombre: 'Prueba', email: 'ana@demo.com', password: CLAVE }, 409],
  ]) {
    test(`rechaza ${caso} (${status})`, async () => {
      esperar(await api(admin).post('/api/usuarios', body), status);
    });
  }

  test('un MIEMBRO no puede crear usuarios', async () => {
    esperar(await api(ana).post('/api/usuarios', { nombre: 'X', email, password: CLAVE }), 403);
  });

  test('el ADMIN crea un usuario que puede iniciar sesión', async () => {
    u = esperar(await api(admin).post('/api/usuarios', { nombre: 'Usuario Prueba', email, password: CLAVE }), 201);
    assert.equal(u.rol, 'MIEMBRO');
    assert.equal(u.password, undefined);
    tokU = await login(email);
  });
});

describe('Editar usuarios y roles', () => {
  test('valida correo duplicado y rol', async () => {
    esperar(await api(admin).put(`/api/usuarios/${u.id}`, { email: 'luis@demo.com' }), 409);
    esperar(await api(admin).put(`/api/usuarios/${u.id}`, { rol: 'ROOT' }), 400);
    esperar(await api(ana).put(`/api/usuarios/${u.id}`, { rol: 'ADMIN' }), 403);
  });

  test('el cambio de rol aplica de inmediato con el mismo token', async () => {
    esperar(await api(tokU).post('/api/proyectos', { nombre: 'X' }), 403);
    esperar(await api(admin).put(`/api/usuarios/${u.id}`, { rol: 'ADMIN' }), 200);
    proyecto = esperar(await api(tokU).post('/api/proyectos', { nombre: 'Temporal usuarios' }), 201);
    esperar(await api(admin).put(`/api/usuarios/${u.id}`, { rol: 'MIEMBRO' }), 200);
    esperar(await api(tokU).post('/api/proyectos', { nombre: 'X' }), 403);
  });

  test('no se puede degradar al único ADMIN global', async () => {
    const r = esperar(await api(admin).put(`/api/usuarios/${SEED.usuarios.admin}`, { rol: 'MIEMBRO' }), 400);
    assert.equal(r.error, 'Debe existir al menos un administrador en el sistema');
  });
});

describe('Eliminar usuarios', () => {
  test('nadie puede eliminarse a sí mismo', async () => {
    esperar(await api(admin).delete(`/api/usuarios/${SEED.usuarios.admin}`), 400);
  });

  test('no se eliminan usuarios con actividad (trazabilidad)', async () => {
    esperar(await api(admin).delete(`/api/usuarios/${SEED.usuarios.ana}`), 409);
    esperar(await api(admin).delete(`/api/usuarios/${u.id}`), 409); // creó un proyecto
  });

  test('un MIEMBRO no puede eliminar usuarios', async () => {
    esperar(await api(ana).delete(`/api/usuarios/${u.id}`), 403);
  });

  test('sin actividad se elimina y su token deja de funcionar', async () => {
    esperar(await api(admin).delete(`/api/proyectos/${proyecto.id}`), 204);
    proyecto = null;
    esperar(await api(admin).delete(`/api/usuarios/${u.id}`), 204);
    esperar(await api(tokU).get('/api/proyectos'), 401);
    esperar(await api(admin).get(`/api/usuarios/${u.id}`), 404);
    u = null;
  });
});

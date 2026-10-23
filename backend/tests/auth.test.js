import { describe, test, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { api, esperar, login, emailUnico, CLAVE } from './helpers.js';

after(() => prisma.$disconnect());

describe('Registro', () => {
  const email = emailUnico('registro');

  test('registra un usuario válido como MIEMBRO y devuelve token', async () => {
    const body = esperar(await api().post('/api/auth/registro', { nombre: 'Nuevo Usuario', email, password: CLAVE }), 201);
    assert.ok(body.token);
    assert.equal(body.usuario.rol, 'MIEMBRO');
    assert.equal(body.usuario.password, undefined);
  });

  test('rechaza correo ya registrado (409)', async () => {
    esperar(await api().post('/api/auth/registro', { nombre: 'Otro', email, password: CLAVE }), 409);
  });

  test('rechaza formato de correo inválido', async () => {
    const body = esperar(await api().post('/api/auth/registro', { nombre: 'X Y', email: 'correo-malo', password: CLAVE }), 400);
    assert.equal(body.error, 'Formato de correo inválido');
  });

  test('rechaza nombre vacío', async () => {
    esperar(await api().post('/api/auth/registro', { nombre: '', email: emailUnico(), password: CLAVE }), 400);
  });

  for (const [password, error] of [
    ['Ab1', 'Mínimo 8 caracteres'],
    ['clave1234', 'Debe incluir una mayúscula'],
    ['CLAVE1234', 'Debe incluir una minúscula'],
    ['ClaveSinNumero', 'Debe incluir un número'],
  ]) {
    test(`rechaza contraseña débil "${password}": ${error}`, async () => {
      const body = esperar(await api().post('/api/auth/registro', { nombre: 'X Y', email: emailUnico(), password }), 400);
      assert.equal(body.error, error);
    });
  }
});

describe('Login y perfil', () => {
  test('inicia sesión con credenciales correctas', async () => {
    const body = esperar(await api().post('/api/auth/login', { email: 'ana@demo.com', password: CLAVE }), 200);
    assert.ok(body.token);
    assert.equal(body.usuario.email, 'ana@demo.com');
  });

  test('rechaza contraseña incorrecta (401)', async () => {
    esperar(await api().post('/api/auth/login', { email: 'ana@demo.com', password: 'Incorrecta1' }), 401);
  });

  test('rechaza correo inexistente con el mismo mensaje (401)', async () => {
    const body = esperar(await api().post('/api/auth/login', { email: 'nadie@demo.com', password: CLAVE }), 401);
    assert.equal(body.error, 'Credenciales incorrectas');
  });

  test('perfil requiere token', async () => {
    esperar(await api().get('/api/auth/perfil'), 401);
    esperar(await api('token-falso').get('/api/auth/perfil'), 401);
  });

  test('perfil devuelve el usuario autenticado sin contraseña', async () => {
    const body = esperar(await api(await login('ana@demo.com')).get('/api/auth/perfil'), 200);
    assert.equal(body.email, 'ana@demo.com');
    assert.equal(body.password, undefined);
  });
});

describe('Recuperación de contraseña', () => {
  const email = emailUnico('recuperar');
  const nueva = 'NuevaClave456';

  test('responde igual exista o no el correo', async () => {
    await api().post('/api/auth/registro', { nombre: 'Recuperar', email, password: CLAVE });
    const a = esperar(await api().post('/api/auth/olvide-contrasena', { email }), 200);
    const b = esperar(await api().post('/api/auth/olvide-contrasena', { email: 'nadie@demo.com' }), 200);
    assert.equal(a.mensaje, b.mensaje);
  });

  test('rechaza token inválido', async () => {
    esperar(await api().post('/api/auth/restablecer-contrasena', { token: 'no-existe', password: nueva }), 400);
  });

  test('rechaza contraseña nueva débil', async () => {
    const { resetToken } = await prisma.usuario.findUnique({ where: { email } });
    esperar(await api().post('/api/auth/restablecer-contrasena', { token: resetToken, password: 'debil' }), 400);
  });

  test('restablece con token válido; la clave vieja deja de servir y el token no se reutiliza', async () => {
    const { resetToken } = await prisma.usuario.findUnique({ where: { email } });
    esperar(await api().post('/api/auth/restablecer-contrasena', { token: resetToken, password: nueva }), 200);
    esperar(await api().post('/api/auth/login', { email, password: nueva }), 200);
    esperar(await api().post('/api/auth/login', { email, password: CLAVE }), 401);
    esperar(await api().post('/api/auth/restablecer-contrasena', { token: resetToken, password: 'OtraClave789' }), 400);
  });
});

describe('Errores generales', () => {
  test('JSON mal formado responde 400 en JSON', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{malo');
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'El cuerpo de la petición no es un JSON válido');
  });

  test('ruta inexistente responde 404 en JSON', async () => {
    const body = esperar(await api().get('/api/no-existe'), 404);
    assert.equal(body.error, 'Ruta no encontrada');
  });
});

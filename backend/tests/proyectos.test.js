import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma.js';
import { api, esperar, login, SEED } from './helpers.js';

const { ana: ANA, luis: LUIS, admin: ADMIN } = SEED.usuarios;
let ana, luis, admin;
let p, tb, tb2, et, et2, t;

before(async () => {
  ana = await login('ana@demo.com');
  luis = await login('luis@demo.com');
  admin = await login('admin@demo.com');
});

after(async () => {
  // Por si alguna prueba falló antes de eliminar el proyecto
  if (p) await prisma.tarea.deleteMany({ where: { columna: { tablero: { proyectoId: p.id } } } });
  if (p) await prisma.proyecto.deleteMany({ where: { id: p.id } });
  await prisma.$disconnect();
});

describe('Proyectos', () => {
  test('solo el ADMIN global crea proyectos', async () => {
    esperar(await api(ana).post('/api/proyectos', { nombre: 'X' }), 403);
    assert.equal(esperar(await api(admin).post('/api/proyectos', {}), 400).error, 'El nombre es obligatorio');
    p = esperar(await api(admin).post('/api/proyectos', { nombre: 'Proyecto de prueba', descripcion: 'test' }), 201);
  });

  test('el creador queda como ADMIN del proyecto', async () => {
    const miembros = esperar(await api(admin).get(`/api/proyectos/${p.id}/miembros`), 200);
    assert.deepEqual(miembros.map((m) => [m.usuarioId, m.rol]), [[ADMIN, 'ADMIN']]);
  });

  test('cada usuario lista solo los proyectos donde es miembro', async () => {
    const deAdmin = esperar(await api(admin).get('/api/proyectos'), 200);
    assert.ok(deAdmin.some((x) => x.id === p.id && x.miRol === 'ADMIN'));
    const deAna = esperar(await api(ana).get('/api/proyectos'), 200);
    assert.ok(!deAna.some((x) => x.id === p.id));
    assert.ok(deAna.some((x) => x.id === SEED.proyectoId));
  });

  test('un no miembro no ve el proyecto; inexistente es 404', async () => {
    esperar(await api(ana).get(`/api/proyectos/${p.id}`), 403);
    esperar(await api(admin).get('/api/proyectos/99999'), 404);
  });

  test('el ADMIN edita el proyecto', async () => {
    assert.equal(esperar(await api(admin).put(`/api/proyectos/${p.id}`, { nombre: 'Editado' }), 200).nombre, 'Editado');
  });
});

describe('Miembros', () => {
  for (const [caso, body, status] of [
    ['sin usuarioId ni email', {}, 400],
    ['email inválido', { email: 'no-es-correo' }, 400],
    ['rol inválido', { usuarioId: ANA, rol: 'JEFE' }, 400],
    ['email inexistente', { email: 'nadie@demo.com' }, 404],
  ]) {
    test(`agregar miembro con ${caso}: ${status}`, async () => {
      esperar(await api(admin).post(`/api/proyectos/${p.id}/miembros`, body), status);
    });
  }

  test('agrega por email como MIEMBRO; duplicado es 409', async () => {
    const m = esperar(await api(admin).post(`/api/proyectos/${p.id}/miembros`, { email: 'ana@demo.com' }), 201);
    assert.equal(m.rol, 'MIEMBRO');
    esperar(await api(admin).post(`/api/proyectos/${p.id}/miembros`, { usuarioId: ANA }), 409);
  });

  test('el nuevo miembro ve el proyecto pero no puede gestionarlo', async () => {
    assert.equal(esperar(await api(ana).get(`/api/proyectos/${p.id}`), 200).miRol, 'MIEMBRO');
    esperar(await api(ana).put(`/api/proyectos/${p.id}`, { nombre: 'x' }), 403);
    esperar(await api(ana).post(`/api/proyectos/${p.id}/miembros`, { usuarioId: LUIS }), 403);
  });

  test('no se puede quitar ni degradar al único ADMIN del proyecto', async () => {
    esperar(await api(admin).delete(`/api/proyectos/${p.id}/miembros/${ADMIN}`), 400);
    esperar(await api(admin).put(`/api/proyectos/${p.id}/miembros/${ADMIN}`, { rol: 'MIEMBRO' }), 400);
  });

  test('cambiar rol de quien no es miembro es 404', async () => {
    esperar(await api(admin).put(`/api/proyectos/${p.id}/miembros/${LUIS}`, { rol: 'ADMIN' }), 404);
  });
});

describe('Tableros', () => {
  test('solo el ADMIN del proyecto crea tableros, con las 4 columnas de estado', async () => {
    esperar(await api(ana).post(`/api/proyectos/${p.id}/tableros`, { nombre: 'T' }), 403);
    esperar(await api(admin).post(`/api/proyectos/${p.id}/tableros`, {}), 400);
    tb = esperar(await api(admin).post(`/api/proyectos/${p.id}/tableros`, { nombre: 'Sprint A' }), 201);
    assert.deepEqual(tb.columnas.map((c) => c.tipo), ['POR_HACER', 'EN_PROGRESO', 'EN_REVISION', 'COMPLETADO']);
  });

  test('los miembros listan y ven tableros; los demás no', async () => {
    assert.equal(esperar(await api(ana).get(`/api/proyectos/${p.id}/tableros`), 200).length, 1);
    esperar(await api(luis).get(`/api/tableros/${tb.id}`), 403);
    esperar(await api(ana).get('/api/tableros/99999'), 404);
  });

  test('solo el ADMIN renombra el tablero', async () => {
    esperar(await api(ana).put(`/api/tableros/${tb.id}`, { nombre: 'x' }), 403);
    assert.equal(esperar(await api(admin).put(`/api/tableros/${tb.id}`, { nombre: 'Sprint A1' }), 200).nombre, 'Sprint A1');
  });
});

describe('Etiquetas', () => {
  test('cualquier miembro crea etiquetas; color hex y nombre único', async () => {
    esperar(await api(ana).post(`/api/proyectos/${p.id}/etiquetas`, { nombre: 'QA', color: 'rojo' }), 400);
    et = esperar(await api(ana).post(`/api/proyectos/${p.id}/etiquetas`, { nombre: 'QA', color: '#f59e0b' }), 201);
    esperar(await api(ana).post(`/api/proyectos/${p.id}/etiquetas`, { nombre: 'QA' }), 409);
    et2 = esperar(await api(ana).post(`/api/proyectos/${p.id}/etiquetas`, { nombre: 'Docs' }), 201);
    assert.equal(et2.color, '#6366f1');
  });

  test('edita etiquetas validando duplicados y pertenencia al proyecto', async () => {
    esperar(await api(ana).put(`/api/proyectos/${p.id}/etiquetas/${et2.id}`, { nombre: 'QA' }), 409);
    assert.equal(esperar(await api(ana).put(`/api/proyectos/${p.id}/etiquetas/${et2.id}`, { color: '#10b981' }), 200).color, '#10b981');
    esperar(await api(ana).put(`/api/proyectos/${p.id}/etiquetas/${SEED.etiquetas.Backend}`, { color: '#000000' }), 404);
  });

  test('un no miembro no ve las etiquetas', async () => {
    esperar(await api(luis).get(`/api/proyectos/${p.id}/etiquetas`), 403);
    assert.equal(esperar(await api(ana).get(`/api/proyectos/${p.id}/etiquetas`), 200).length, 2);
  });
});

describe('Integración con tareas', () => {
  test('una tarea no puede usar etiquetas de otro proyecto', async () => {
    esperar(await api(ana).post('/api/tareas', { tableroId: tb.id, titulo: 'x', etiquetas: [SEED.etiquetas.Backend] }), 400);
  });

  test('la vista Kanban muestra la tarea en POR_HACER y marcada como vencida', async () => {
    t = esperar(await api(ana).post('/api/tareas', {
      tableroId: tb.id, titulo: 'En proyecto nuevo', etiquetas: [et.id, et2.id], responsableId: ANA, fechaLimite: '2026-01-01',
    }), 201);
    const kanban = esperar(await api(ana).get(`/api/tableros/${tb.id}`), 200);
    assert.equal(kanban.columnas.length, 4);
    assert.equal(kanban.columnas[0].tareas[0].id, t.id);
    assert.equal(kanban.columnas[0].tareas[0].vencida, true);
  });

  test('eliminar una etiqueta la quita de las tareas', async () => {
    esperar(await api(ana).delete(`/api/proyectos/${p.id}/etiquetas/${et2.id}`), 204);
    assert.equal(esperar(await api(ana).get(`/api/tareas/${t.id}`), 200).etiquetas.length, 1);
  });

  test('el dashboard del proyecto nuevo refleja la tarea', async () => {
    esperar(await api(ana).patch(`/api/tareas/${t.id}/mover`, { columnaDestinoId: tb.columnas[1].id }), 200);
    const d = esperar(await api(ana).get(`/api/proyectos/${p.id}/dashboard`), 200);
    assert.deepEqual([d.total, d.enProgreso, d.vencidas], [1, 1, 1]);
  });
});

describe('ADMIN de proyecto (no global)', () => {
  test('gestiona tableros y miembros, pero no crea proyectos', async () => {
    esperar(await api(admin).put(`/api/proyectos/${p.id}/miembros/${ANA}`, { rol: 'ADMIN' }), 200);
    tb2 = esperar(await api(ana).post(`/api/proyectos/${p.id}/tableros`, { nombre: 'Sprint B' }), 201);
    esperar(await api(ana).post(`/api/proyectos/${p.id}/miembros`, { usuarioId: LUIS }), 201);
    esperar(await api(luis).delete(`/api/tableros/${tb2.id}`), 403);
    esperar(await api(ana).post('/api/proyectos', { nombre: 'X' }), 403);
  });

  test('el ADMIN global sigue gestionando aunque sea MIEMBRO en el proyecto', async () => {
    esperar(await api(ana).put(`/api/proyectos/${p.id}/miembros/${ADMIN}`, { rol: 'MIEMBRO' }), 200);
    esperar(await api(admin).put(`/api/proyectos/${p.id}`, { descripcion: 'ok' }), 200);
  });

  test('al quitar a un miembro pierde el acceso', async () => {
    esperar(await api(ana).delete(`/api/proyectos/${p.id}/miembros/${LUIS}`), 204);
    esperar(await api(luis).get(`/api/proyectos/${p.id}`), 403);
    esperar(await api(admin).delete(`/api/proyectos/${p.id}/miembros/${ANA}`), 400); // única ADMIN
  });
});

describe('Eliminación en cascada', () => {
  test('eliminar un tablero elimina sus tareas', async () => {
    esperar(await api(admin).delete(`/api/tableros/${tb.id}`), 204);
    esperar(await api(admin).get(`/api/tareas/${t.id}`), 404);
  });

  test('eliminar un proyecto elimina tableros y tareas', async () => {
    const t2 = esperar(await api(ana).post('/api/tareas', { tableroId: tb2.id, titulo: 'otra' }), 201);
    esperar(await api(luis).delete(`/api/proyectos/${p.id}`), 403);
    esperar(await api(admin).delete(`/api/proyectos/${p.id}`), 204);
    esperar(await api(admin).get(`/api/proyectos/${p.id}`), 404);
    esperar(await api(admin).get(`/api/tareas/${t2.id}`), 404);
  });
});

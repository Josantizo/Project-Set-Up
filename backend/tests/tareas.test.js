import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma.js';
import { api, esperar, login, emailUnico, CLAVE, SEED } from './helpers.js';

const { columnas: COL, tableroId: TABLERO } = SEED;
let ana, admin, ajeno;
let tarea; // tarea que recorre todo el flujo de estados
let columnaOtroTablero, proyectoTemporal;

const mover = (token, id, columnaDestinoId) => api(token).patch(`/api/tareas/${id}/mover`, { columnaDestinoId });

before(async () => {
  ana = await login('ana@demo.com');
  admin = await login('admin@demo.com');
  // Usuario recién registrado: no es miembro del proyecto del seed
  ajeno = (await api().post('/api/auth/registro', { nombre: 'Ajeno', email: emailUnico('ajeno'), password: CLAVE })).body.token;
  // Otro proyecto con su tablero, para probar movimientos entre tableros
  proyectoTemporal = (await api(admin).post('/api/proyectos', { nombre: 'Temporal tareas' })).body;
  const tablero = (await api(admin).post(`/api/proyectos/${proyectoTemporal.id}/tableros`, { nombre: 'Otro' })).body;
  columnaOtroTablero = tablero.columnas[1].id;
});

after(async () => {
  // Deja el proyecto del seed como estaba, para poder repetir las pruebas sin reiniciar la base
  if (tarea) await prisma.tarea.deleteMany({ where: { id: tarea.id } });
  await api(admin).delete(`/api/proyectos/${proyectoTemporal.id}`);
  await prisma.$disconnect();
});

describe('CRUD de tareas', () => {
  test('requiere autenticación', async () => {
    esperar(await api().get(`/api/tareas?tableroId=${TABLERO}`), 401);
  });

  test('listar exige tableroId', async () => {
    esperar(await api(ana).get('/api/tareas'), 400);
  });

  test('un miembro lista las tareas del tablero con progreso y vencida', async () => {
    const tareas = esperar(await api(ana).get(`/api/tareas?tableroId=${TABLERO}`), 200);
    assert.ok(tareas.length >= 6);
    assert.ok('progreso' in tareas[0] && 'vencida' in tareas[0]);
  });

  test('un no miembro no puede listar ni crear (403)', async () => {
    esperar(await api(ajeno).get(`/api/tareas?tableroId=${TABLERO}`), 403);
    esperar(await api(ajeno).post('/api/tareas', { tableroId: TABLERO, titulo: 'x' }), 403);
  });

  for (const [caso, body, error] of [
    ['título vacío', { titulo: '' }, 'El título es obligatorio'],
    ['sin título', {}, 'El título es obligatorio'],
    ['prioridad inválida', { titulo: 'x', prioridad: 'URGENTE' }, 'Prioridad debe ser ALTA, MEDIA o BAJA'],
    ['tipo inválido', { titulo: 'x', tipo: 'EPICA' }, 'Tipo debe ser TAREA o BUG'],
    ['fecha inválida', { titulo: 'x', fechaLimite: 'mañana' }, 'Fecha inválida'],
    ['fecha límite antes del inicio', { titulo: 'x', fechaInicio: '2026-11-10', fechaLimite: '2026-11-01' }, 'La fecha límite no puede ser anterior a la fecha de inicio'],
    ['responsable que no es miembro', { titulo: 'x', responsableId: 9999 }, 'El responsable debe ser miembro del proyecto'],
    ['etiqueta de otro proyecto', { titulo: 'x', etiquetas: [9999] }, 'Alguna etiqueta no existe o no pertenece al proyecto'],
  ]) {
    test(`rechaza crear con ${caso}`, async () => {
      const res = esperar(await api(ana).post('/api/tareas', { tableroId: TABLERO, ...body }), 400);
      assert.equal(res.error, error);
    });
  }

  test('crea una tarea completa en POR_HACER con fecha de creación automática', async () => {
    tarea = esperar(await api(ana).post('/api/tareas', {
      tableroId: TABLERO, titulo: 'Tarea de prueba', descripcion: 'desc', prioridad: 'ALTA', tipo: 'BUG',
      etiquetas: [SEED.etiquetas.Backend, SEED.etiquetas.Bug], fechaInicio: '2026-10-20', fechaLimite: '2030-01-01',
    }), 201);
    assert.equal(tarea.columna.tipo, 'POR_HACER');
    assert.ok(tarea.fechaCreacion);
    assert.equal(tarea.etiquetas.length, 2);
    assert.equal(tarea.responsableId, null);
    assert.equal(tarea.vencida, false);
  });

  test('obtiene la tarea por id; 404 si no existe', async () => {
    const t = esperar(await api(ana).get(`/api/tareas/${tarea.id}`), 200);
    assert.deepEqual(t.progreso, { total: 0, completadas: 0, porcentaje: 0 });
    esperar(await api(ana).get('/api/tareas/99999'), 404);
  });

  test('edita campos y reemplaza etiquetas', async () => {
    const t = esperar(await api(ana).put(`/api/tareas/${tarea.id}`, { titulo: 'Editada', prioridad: 'BAJA', etiquetas: [SEED.etiquetas.Frontend] }), 200);
    assert.equal(t.titulo, 'Editada');
    assert.equal(t.prioridad, 'BAJA');
    assert.deepEqual(t.etiquetas.map((e) => e.id), [SEED.etiquetas.Frontend]);
  });

  test('valida fecha límite contra la fecha de inicio ya guardada', async () => {
    esperar(await api(ana).put(`/api/tareas/${tarea.id}`, { fechaLimite: '2026-10-01' }), 400);
  });

  test('marca como vencida la tarea del seed con fecha pasada, no la completada', async () => {
    assert.equal(esperar(await api(ana).get(`/api/tareas/${SEED.tareas.vencida}`), 200).vencida, true);
    assert.equal(esperar(await api(ana).get(`/api/tareas/${SEED.tareas.completada}`), 200).vencida, false);
  });
});

describe('Transiciones de estado', () => {
  test('POR_HACER → EN_PROGRESO sin responsable: 400', async () => {
    const res = esperar(await mover(ana, tarea.id, COL.EN_PROGRESO), 400);
    assert.equal(res.error, 'La tarea debe tener un responsable asignado para pasar a EN_PROGRESO');
  });

  test('POR_HACER → COMPLETADO (salto): 400', async () => {
    const res = esperar(await mover(ana, tarea.id, COL.COMPLETADO), 400);
    assert.match(res.error, /Transición no permitida: POR_HACER → COMPLETADO/);
  });

  test('POR_HACER → EN_REVISION (salto): 400', async () => {
    esperar(await mover(ana, tarea.id, COL.EN_REVISION), 400);
  });

  test('mover a la misma columna, sin destino o a columna inexistente', async () => {
    esperar(await mover(ana, tarea.id, COL.POR_HACER), 400);
    esperar(await api(ana).patch(`/api/tareas/${tarea.id}/mover`, {}), 400);
    esperar(await mover(ana, tarea.id, 99999), 404);
  });

  test('la columna destino debe ser del mismo tablero', async () => {
    const res = esperar(await mover(ana, tarea.id, columnaOtroTablero), 400);
    assert.equal(res.error, 'La columna destino debe pertenecer al mismo tablero');
  });

  test('un no miembro no puede mover (403)', async () => {
    esperar(await mover(ajeno, tarea.id, COL.EN_PROGRESO), 403);
  });

  test('con responsable asignado pasa a EN_PROGRESO', async () => {
    esperar(await api(ana).put(`/api/tareas/${tarea.id}`, { responsableId: SEED.usuarios.ana }), 200);
    assert.equal(esperar(await mover(ana, tarea.id, COL.EN_PROGRESO), 200).columna.tipo, 'EN_PROGRESO');
  });

  test('no se puede quitar el responsable a una tarea iniciada', async () => {
    esperar(await api(ana).put(`/api/tareas/${tarea.id}`, { responsableId: null }), 400);
  });

  test('EN_PROGRESO no puede saltar a COMPLETADO ni volver a POR_HACER', async () => {
    esperar(await mover(ana, tarea.id, COL.COMPLETADO), 400);
    esperar(await mover(ana, tarea.id, COL.POR_HACER), 400);
  });

  test('EN_PROGRESO → EN_REVISION → EN_PROGRESO (defectos) → EN_REVISION', async () => {
    assert.equal(esperar(await mover(ana, tarea.id, COL.EN_REVISION), 200).columna.tipo, 'EN_REVISION');
    assert.equal(esperar(await mover(admin, tarea.id, COL.EN_PROGRESO), 200).columna.tipo, 'EN_PROGRESO');
    esperar(await mover(ana, tarea.id, COL.EN_REVISION), 200);
  });

  test('EN_REVISION no puede volver a POR_HACER', async () => {
    esperar(await mover(ana, tarea.id, COL.POR_HACER), 400);
  });

  test('EN_REVISION → COMPLETADO llena la fecha de cierre', async () => {
    const t = esperar(await mover(admin, tarea.id, COL.COMPLETADO), 200);
    assert.equal(t.columna.tipo, 'COMPLETADO');
    assert.ok(t.fechaCierre);
  });

  for (const destino of ['POR_HACER', 'EN_PROGRESO', 'EN_REVISION']) {
    test(`COMPLETADO es estado final: no se mueve a ${destino}`, async () => {
      const res = esperar(await mover(admin, tarea.id, COL[destino]), 400);
      assert.equal(res.error, 'La tarea está COMPLETADA: es un estado final y no se puede mover');
    });
  }

  test('la bitácora registra la creación y cada movimiento con usuario y estados', async () => {
    const bitacora = esperar(await api(ana).get(`/api/tareas/${tarea.id}/bitacora`), 200);
    assert.deepEqual(
      bitacora.map((b) => [b.accion, b.estadoAnterior, b.estadoNuevo, b.usuario.nombre]),
      [
        ['CREADA', null, 'POR_HACER', 'Ana López'],
        ['MOVIDA', 'POR_HACER', 'EN_PROGRESO', 'Ana López'],
        ['MOVIDA', 'EN_PROGRESO', 'EN_REVISION', 'Ana López'],
        ['MOVIDA', 'EN_REVISION', 'EN_PROGRESO', 'Admin Demo'],
        ['MOVIDA', 'EN_PROGRESO', 'EN_REVISION', 'Ana López'],
        ['MOVIDA', 'EN_REVISION', 'COMPLETADO', 'Admin Demo'],
      ],
    );
  });
});

describe('Subtareas y checklist', () => {
  let t, s1, s2, item;
  const sub = (path = '') => `/api/tareas/${t.id}/subtareas${path}`;

  test('crea subtareas y valida el título', async () => {
    t = esperar(await api(admin).post('/api/tareas', { tableroId: TABLERO, titulo: 'Con subtareas' }), 201);
    esperar(await api(ana).post(sub(), { titulo: ' ' }), 400);
    s1 = esperar(await api(ana).post(sub(), { titulo: 'Sub 1' }), 201);
    s2 = esperar(await api(ana).post(sub(), { titulo: 'Sub 2' }), 201);
    esperar(await api(ana).post(sub(), { titulo: 'Sub 3', completada: true }), 201);
    assert.equal(esperar(await api(ana).get(sub()), 200).length, 3);
  });

  test('el porcentaje refleja las subtareas completadas (1/3 → 2/3)', async () => {
    assert.equal(esperar(await api(ana).get(`/api/tareas/${t.id}`), 200).progreso.porcentaje, 33);
    esperar(await api(ana).put(sub(`/${s1.id}`), { completada: true }), 200);
    assert.equal(esperar(await api(ana).get(`/api/tareas/${t.id}`), 200).progreso.porcentaje, 67);
  });

  test('no permite operar una subtarea desde otra tarea (404)', async () => {
    esperar(await api(ana).put(`/api/tareas/${tarea.id}/subtareas/${s1.id}`, { completada: false }), 404);
  });

  test('CRUD de items de checklist', async () => {
    esperar(await api(ana).post(sub(`/${s2.id}/checklist`), { texto: '' }), 400);
    item = esperar(await api(ana).post(sub(`/${s2.id}/checklist`), { texto: 'Paso A' }), 201);
    assert.equal(esperar(await api(ana).put(sub(`/${s2.id}/checklist/${item.id}`), { completado: true }), 200).completado, true);
    esperar(await api(ana).put(sub(`/${s1.id}/checklist/${item.id}`), { completado: false }), 404);
    const tareaCompleta = esperar(await api(ana).get(`/api/tareas/${t.id}`), 200);
    assert.equal(tareaCompleta.subtareas.find((s) => s.id === s2.id).checklist.length, 1);
    esperar(await api(ana).delete(sub(`/${s2.id}/checklist/${item.id}`)), 204);
  });

  test('al eliminar la subtarea pendiente el progreso llega a 100%', async () => {
    esperar(await api(ana).delete(sub(`/${s2.id}`)), 204);
    assert.equal(esperar(await api(ana).get(`/api/tareas/${t.id}`), 200).progreso.porcentaje, 100);
  });

  test('solo el creador o un admin elimina la tarea', async () => {
    esperar(await api(ana).delete(`/api/tareas/${t.id}`), 403);
    esperar(await api(admin).delete(`/api/tareas/${t.id}`), 204);
    esperar(await api(admin).get(`/api/tareas/${t.id}`), 404);
  });
});

describe('Comentarios', () => {
  test('valida y crea comentarios de distintos usuarios', async () => {
    esperar(await api(ana).post(`/api/tareas/${tarea.id}/comentarios`, { texto: '' }), 400);
    const c = esperar(await api(ana).post(`/api/tareas/${tarea.id}/comentarios`, { texto: 'Listo para QA' }), 201);
    assert.equal(c.usuario.id, SEED.usuarios.ana);
    esperar(await api(admin).post(`/api/tareas/${tarea.id}/comentarios`, { texto: 'Aprobado' }), 201);
  });

  test('lista los comentarios en orden; un no miembro no puede verlos', async () => {
    const lista = esperar(await api(ana).get(`/api/tareas/${tarea.id}/comentarios`), 200);
    assert.deepEqual(lista.map((c) => c.texto), ['Listo para QA', 'Aprobado']);
    esperar(await api(ajeno).get(`/api/tareas/${tarea.id}/comentarios`), 403);
  });
});

describe('Dashboard', () => {
  test('cuenta total, completadas, en progreso y vencidas', async () => {
    const d = esperar(await api(ana).get(`/api/proyectos/${SEED.proyectoId}/dashboard`), 200);
    // Seed (6 tareas) + la tarea de prueba ya completada
    assert.equal(d.total, 7);
    assert.equal(d.completadas, 2);
    assert.equal(d.enProgreso, 3);
    assert.equal(d.vencidas, 1);
  });

  test('un no miembro no ve el dashboard; proyecto inexistente es 404', async () => {
    esperar(await api(ajeno).get(`/api/proyectos/${SEED.proyectoId}/dashboard`), 403);
    esperar(await api(admin).get('/api/proyectos/99999/dashboard'), 404);
  });
});

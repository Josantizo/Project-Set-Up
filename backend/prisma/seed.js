import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const dias = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

async function main() {
  const hash = await bcrypt.hash('Clave123!', 10);

  // Usuarios
  const admin = await prisma.usuario.create({
    data: { nombre: 'Admin Demo', email: 'admin@demo.com', password: hash, rol: 'ADMIN' },
  });
  const ana = await prisma.usuario.create({
    data: { nombre: 'Ana López', email: 'ana@demo.com', password: hash },
  });
  const luis = await prisma.usuario.create({
    data: { nombre: 'Luis Pérez', email: 'luis@demo.com', password: hash },
  });
  const maria = await prisma.usuario.create({
    data: { nombre: 'María Gómez', email: 'maria@demo.com', password: hash },
  });

  // Proyecto, miembros y etiquetas
  const proyecto = await prisma.proyecto.create({
    data: {
      nombre: 'Sistema de Gestión Académica',
      descripcion: 'Proyecto de ejemplo para la demostración.',
      creadorId: admin.id,
      miembros: {
        create: [
          { usuarioId: admin.id, rol: 'ADMIN' },
          { usuarioId: ana.id },
          { usuarioId: luis.id },
          { usuarioId: maria.id },
        ],
      },
      etiquetas: {
        create: [
          { nombre: 'Backend', color: '#2563eb' },
          { nombre: 'Frontend', color: '#16a34a' },
          { nombre: 'Bug', color: '#dc2626' },
        ],
      },
    },
    include: { etiquetas: true },
  });
  const tag = Object.fromEntries(proyecto.etiquetas.map((e) => [e.nombre, e.id]));

  // Tablero y columnas
  const tablero = await prisma.tablero.create({
    data: {
      nombre: 'Sprint 1',
      proyectoId: proyecto.id,
      columnas: {
        create: [
          { nombre: 'Por hacer', tipo: 'POR_HACER', orden: 1 },
          { nombre: 'En progreso', tipo: 'EN_PROGRESO', orden: 2 },
          { nombre: 'En revisión / QA', tipo: 'EN_REVISION', orden: 3 },
          { nombre: 'Completado', tipo: 'COMPLETADO', orden: 4 },
        ],
      },
    },
    include: { columnas: true },
  });
  const col = Object.fromEntries(tablero.columnas.map((c) => [c.tipo, c.id]));

  // Tareas
  const t1 = await prisma.tarea.create({
    data: {
      titulo: 'Diseñar modelo de datos',
      descripcion: 'Definir tablas y relaciones.',
      prioridad: 'ALTA',
      columnaId: col.COMPLETADO,
      creadorId: admin.id,
      responsableId: ana.id,
      fechaInicio: dias(-14),
      fechaLimite: dias(-7),
      fechaCierre: dias(-8),
      etiquetas: { create: [{ etiquetaId: tag.Backend }] },
      subtareas: {
        create: [
          { titulo: 'Diagrama ER', completada: true },
          { titulo: 'Revisión con el equipo', completada: true },
        ],
      },
    },
  });

  const t2 = await prisma.tarea.create({
    data: {
      titulo: 'Implementar login con JWT',
      descripcion: 'Registro, login y recuperación de contraseña.',
      prioridad: 'ALTA',
      columnaId: col.EN_REVISION,
      creadorId: admin.id,
      responsableId: luis.id,
      fechaInicio: dias(-5),
      fechaLimite: dias(2),
      etiquetas: { create: [{ etiquetaId: tag.Backend }] },
      subtareas: {
        create: [
          { titulo: 'Endpoint de registro', completada: true },
          { titulo: 'Endpoint de login', completada: true },
          { titulo: 'Recuperar contraseña', completada: false },
        ],
      },
    },
  });

  const t3 = await prisma.tarea.create({
    data: {
      titulo: 'Maquetar tablero Kanban',
      prioridad: 'MEDIA',
      columnaId: col.EN_PROGRESO,
      creadorId: admin.id,
      responsableId: maria.id,
      fechaInicio: dias(-2),
      fechaLimite: dias(5),
      etiquetas: { create: [{ etiquetaId: tag.Frontend }] },
      subtareas: {
        create: [
          { titulo: 'Columnas', completada: true },
          { titulo: 'Tarjetas', completada: false },
          { titulo: 'Drag & drop', completada: false },
        ],
      },
    },
  });

  // Tarea vencida (fecha límite pasada y sin completar)
  const t4 = await prisma.tarea.create({
    data: {
      titulo: 'Configurar CI con GitHub Actions',
      prioridad: 'MEDIA',
      columnaId: col.EN_PROGRESO,
      creadorId: admin.id,
      responsableId: ana.id,
      fechaInicio: dias(-10),
      fechaLimite: dias(-3),
    },
  });

  // Tarea sin responsable en Por hacer
  await prisma.tarea.create({
    data: {
      titulo: 'Redactar manual de usuario',
      prioridad: 'BAJA',
      columnaId: col.POR_HACER,
      creadorId: admin.id,
      fechaLimite: dias(12),
    },
  });

  // Bug
  const bug = await prisma.tarea.create({
    data: {
      titulo: 'BUG: el dashboard cuenta mal las tareas vencidas',
      descripcion: 'Las tareas completadas con fecha pasada aparecen como vencidas.',
      prioridad: 'ALTA',
      tipo: 'BUG',
      columnaId: col.EN_PROGRESO,
      creadorId: maria.id,
      responsableId: luis.id,
      fechaLimite: dias(1),
      etiquetas: { create: [{ etiquetaId: tag.Bug }] },
    },
  });

  // Bitácora (trazabilidad)
  await prisma.bitacora.createMany({
    data: [
      { tareaId: t2.id, usuarioId: admin.id, accion: 'CREADA', fecha: dias(-6) },
      { tareaId: t2.id, usuarioId: luis.id, accion: 'MOVIDA', estadoAnterior: 'POR_HACER', estadoNuevo: 'EN_PROGRESO', fecha: dias(-5) },
      { tareaId: t2.id, usuarioId: luis.id, accion: 'MOVIDA', estadoAnterior: 'EN_PROGRESO', estadoNuevo: 'EN_REVISION', fecha: dias(-1) },
      { tareaId: t1.id, usuarioId: admin.id, accion: 'CREADA', fecha: dias(-15) },
      { tareaId: t1.id, usuarioId: ana.id, accion: 'MOVIDA', estadoAnterior: 'EN_REVISION', estadoNuevo: 'COMPLETADO', fecha: dias(-8) },
      { tareaId: bug.id, usuarioId: maria.id, accion: 'CREADA', fecha: dias(-1) },
    ],
  });

  // Comentarios
  await prisma.comentario.createMany({
    data: [
      { tareaId: t2.id, usuarioId: admin.id, texto: 'Falta validar la fortaleza de la contraseña.' },
      { tareaId: t2.id, usuarioId: luis.id, texto: 'Corregido, listo para revisión.' },
      { tareaId: t4.id, usuarioId: admin.id, texto: 'Esta tarea ya está vencida, ¿qué bloquea?' },
    ],
  });

  console.log('Seed completado. Usuarios: admin@demo.com, ana@demo.com, luis@demo.com, maria@demo.com (clave: Clave123!)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { accesoProyecto, parseId } from '../lib/permisos.js';
import { includeTarea, formatearTarea } from './tareas.controller.js';

// Columnas que se crean con cada tablero: son los estados que controla /tareas/:id/mover
const COLUMNAS_INICIALES = [
  { nombre: 'Por hacer', tipo: 'POR_HACER', orden: 1 },
  { nombre: 'En progreso', tipo: 'EN_PROGRESO', orden: 2 },
  { nombre: 'En revisión / QA', tipo: 'EN_REVISION', orden: 3 },
  { nombre: 'Completado', tipo: 'COMPLETADO', orden: 4 },
];

const tableroSchema = z.object({
  nombre: z.string({ error: 'El nombre es obligatorio' }).trim().min(1, 'El nombre es obligatorio').max(191, 'Nombre demasiado largo'),
});

const error400 = (res, parsed) => res.status(400).json({ error: parsed.error.issues[0].message });

// Carga el tablero y valida acceso a su proyecto. Si falla, responde y devuelve null.
async function cargarTablero(req, res, opciones) {
  const id = parseId(req.params.id);
  const tablero = id ? await prisma.tablero.findUnique({ where: { id } }) : null;
  if (!tablero) {
    res.status(404).json({ error: 'Tablero no encontrado' });
    return null;
  }
  const ctx = await accesoProyecto(req, res, tablero.proyectoId, opciones);
  return ctx && tablero;
}

export async function listarTableros(req, res) {
  const ctx = await accesoProyecto(req, res, parseId(req.params.id));
  if (!ctx) return;
  const tableros = await prisma.tablero.findMany({
    where: { proyectoId: ctx.proyecto.id },
    include: { columnas: { orderBy: { orden: 'asc' } } },
    orderBy: { creadoEn: 'asc' },
  });
  res.json(tableros);
}

export async function crearTablero(req, res) {
  const ctx = await accesoProyecto(req, res, parseId(req.params.id), { gestionar: true });
  if (!ctx) return;
  const parsed = tableroSchema.safeParse(req.body);
  if (!parsed.success) return error400(res, parsed);
  const tablero = await prisma.tablero.create({
    data: {
      nombre: parsed.data.nombre,
      proyectoId: ctx.proyecto.id,
      columnas: { create: COLUMNAS_INICIALES },
    },
    include: { columnas: { orderBy: { orden: 'asc' } } },
  });
  res.status(201).json(tablero);
}

// Vista Kanban: columnas ordenadas con sus tareas
export async function obtenerTablero(req, res) {
  const tablero = await cargarTablero(req, res);
  if (!tablero) return;
  const completo = await prisma.tablero.findUnique({
    where: { id: tablero.id },
    include: {
      columnas: {
        orderBy: { orden: 'asc' },
        include: { tareas: { include: includeTarea, orderBy: { orden: 'asc' } } },
      },
    },
  });
  res.json({
    ...completo,
    columnas: completo.columnas.map((c) => ({ ...c, tareas: c.tareas.map(formatearTarea) })),
  });
}

export async function editarTablero(req, res) {
  const tablero = await cargarTablero(req, res, { gestionar: true });
  if (!tablero) return;
  const parsed = tableroSchema.safeParse(req.body);
  if (!parsed.success) return error400(res, parsed);
  const actualizado = await prisma.tablero.update({
    where: { id: tablero.id },
    data: parsed.data,
    include: { columnas: { orderBy: { orden: 'asc' } } },
  });
  res.json(actualizado);
}

export async function eliminarTablero(req, res) {
  const tablero = await cargarTablero(req, res, { gestionar: true });
  if (!tablero) return;
  // Tarea -> Columna no tiene cascada, así que las tareas se borran antes que el tablero
  await prisma.$transaction([
    prisma.tarea.deleteMany({ where: { columna: { tableroId: tablero.id } } }),
    prisma.tablero.delete({ where: { id: tablero.id } }),
  ]);
  res.status(204).end();
}

import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { accesoProyecto, parseId } from '../lib/permisos.js';

const proyectoSchema = z.object({
  nombre: z.string({ error: 'El nombre es obligatorio' }).trim().min(1, 'El nombre es obligatorio').max(191, 'Nombre demasiado largo'),
  descripcion: z.string().trim().nullable().optional(),
});

const error400 = (res, parsed) => res.status(400).json({ error: parsed.error.issues[0].message });

export async function listarProyectos(req, res) {
  const where = req.user.rol === 'ADMIN' ? {} : { miembros: { some: { usuarioId: req.user.id } } };
  const proyectos = await prisma.proyecto.findMany({
    where,
    include: {
      creador: { select: { id: true, nombre: true } },
      miembros: { where: { usuarioId: req.user.id }, select: { rol: true } },
      _count: { select: { tableros: true, miembros: true } },
    },
    orderBy: { creadoEn: 'desc' },
  });
  res.json(
    proyectos.map(({ miembros, ...p }) => ({
      ...p,
      miRol: req.user.rol === 'ADMIN' ? 'ADMIN' : miembros[0]?.rol,
    })),
  );
}

export async function obtenerProyecto(req, res) {
  const ctx = await accesoProyecto(req, res, parseId(req.params.id));
  if (!ctx) return;
  const proyecto = await prisma.proyecto.findUnique({
    where: { id: ctx.proyecto.id },
    include: {
      creador: { select: { id: true, nombre: true } },
      miembros: { include: { usuario: { select: { id: true, nombre: true, email: true } } } },
      tableros: { orderBy: { creadoEn: 'asc' } },
      etiquetas: { orderBy: { nombre: 'asc' } },
    },
  });
  res.json({ ...proyecto, miRol: ctx.membresia.rol });
}

// Solo ADMIN global (se valida en la ruta). El creador queda como ADMIN del proyecto.
export async function crearProyecto(req, res) {
  const parsed = proyectoSchema.safeParse(req.body);
  if (!parsed.success) return error400(res, parsed);
  const proyecto = await prisma.proyecto.create({
    data: {
      ...parsed.data,
      creadorId: req.user.id,
      miembros: { create: { usuarioId: req.user.id, rol: 'ADMIN' } },
    },
  });
  res.status(201).json(proyecto);
}

export async function editarProyecto(req, res) {
  const ctx = await accesoProyecto(req, res, parseId(req.params.id), { gestionar: true });
  if (!ctx) return;
  const parsed = proyectoSchema.partial().safeParse(req.body);
  if (!parsed.success) return error400(res, parsed);
  const proyecto = await prisma.proyecto.update({ where: { id: ctx.proyecto.id }, data: parsed.data });
  res.json(proyecto);
}

export async function eliminarProyecto(req, res) {
  const ctx = await accesoProyecto(req, res, parseId(req.params.id), { gestionar: true });
  if (!ctx) return;
  const id = ctx.proyecto.id;
  // Tarea -> Columna no tiene cascada, así que las tareas se borran antes que el proyecto
  await prisma.$transaction([
    prisma.tarea.deleteMany({ where: { columna: { tablero: { proyectoId: id } } } }),
    prisma.proyecto.delete({ where: { id } }),
  ]);
  res.status(204).end();
}

export async function dashboard(req, res) {
  const ctx = await accesoProyecto(req, res, parseId(req.params.id));
  if (!ctx) return;
  const id = ctx.proyecto.id;

  const delProyecto = { columna: { tablero: { proyectoId: id } } };
  const enEstado = (tipo) => ({ columna: { tipo, tablero: { proyectoId: id } } });

  const [total, completadas, enProgreso, enRevision, porHacer, vencidas] = await Promise.all([
    prisma.tarea.count({ where: delProyecto }),
    prisma.tarea.count({ where: enEstado('COMPLETADO') }),
    prisma.tarea.count({ where: enEstado('EN_PROGRESO') }),
    prisma.tarea.count({ where: enEstado('EN_REVISION') }),
    prisma.tarea.count({ where: enEstado('POR_HACER') }),
    prisma.tarea.count({
      where: {
        fechaLimite: { lt: new Date() },
        columna: { tipo: { not: 'COMPLETADO' }, tablero: { proyectoId: id } },
      },
    }),
  ]);

  res.json({
    proyectoId: id,
    total,
    completadas,
    enProgreso,
    vencidas,
    porEstado: { POR_HACER: porHacer, EN_PROGRESO: enProgreso, EN_REVISION: enRevision, COMPLETADO: completadas },
  });
}

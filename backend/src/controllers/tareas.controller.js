import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { obtenerMembresia, parseId } from '../lib/permisos.js';

// Transiciones permitidas: estado actual -> estados destino
const TRANSICIONES = {
  POR_HACER: ['EN_PROGRESO'],
  EN_PROGRESO: ['EN_REVISION'],
  EN_REVISION: ['COMPLETADO', 'EN_PROGRESO'],
  COMPLETADO: [],
};

const fecha = z.coerce
  .date({ error: 'Fecha inválida' })
  .refine((d) => !Number.isNaN(d.getTime()), 'Fecha inválida');

const camposTarea = {
  titulo: z.string({ error: 'El título es obligatorio' }).trim().min(1, 'El título es obligatorio').max(191, 'Título demasiado largo'),
  descripcion: z.string().trim().nullable().optional(),
  prioridad: z.enum(['ALTA', 'MEDIA', 'BAJA'], { error: 'Prioridad debe ser ALTA, MEDIA o BAJA' }).optional(),
  tipo: z.enum(['TAREA', 'BUG'], { error: 'Tipo debe ser TAREA o BUG' }).optional(),
  responsableId: z.number().int().positive().nullable().optional(),
  etiquetas: z.array(z.number().int().positive()).optional(),
  fechaInicio: fecha.nullable().optional(),
  fechaLimite: fecha.nullable().optional(),
};

const fechasCoherentes = (d) => !d.fechaInicio || !d.fechaLimite || d.fechaLimite >= d.fechaInicio;
const msgFechas = { message: 'La fecha límite no puede ser anterior a la fecha de inicio', path: ['fechaLimite'] };

const crearSchema = z
  .object({ ...camposTarea, tableroId: z.number({ error: 'tableroId es obligatorio' }).int().positive() })
  .refine(fechasCoherentes, msgFechas);

const editarSchema = z
  .object(camposTarea)
  .partial()
  .refine(fechasCoherentes, msgFechas);

const moverSchema = z.object({
  columnaDestinoId: z.number({ error: 'columnaDestinoId es obligatorio' }).int().positive(),
});

const subtareaSchema = z.object({
  titulo: z.string({ error: 'El título es obligatorio' }).trim().min(1, 'El título es obligatorio').max(191),
  completada: z.boolean().optional(),
});

const checklistSchema = z.object({
  texto: z.string({ error: 'El texto es obligatorio' }).trim().min(1, 'El texto es obligatorio').max(191),
  completado: z.boolean().optional(),
});

const comentarioSchema = z.object({
  texto: z.string({ error: 'El comentario no puede estar vacío' }).trim().min(1, 'El comentario no puede estar vacío'),
});

export const includeTarea = {
  columna: { select: { id: true, nombre: true, tipo: true, tableroId: true } },
  responsable: { select: { id: true, nombre: true, email: true } },
  creador: { select: { id: true, nombre: true } },
  etiquetas: { include: { etiqueta: true } },
  subtareas: { include: { checklist: true }, orderBy: { id: 'asc' } },
};

export const formatearTarea = (t) => {
  const total = t.subtareas.length;
  const completadas = t.subtareas.filter((s) => s.completada).length;
  return {
    ...t,
    etiquetas: t.etiquetas.map((te) => te.etiqueta),
    // Mismo criterio que el dashboard: fecha límite pasada y no COMPLETADO
    vencida: Boolean(t.fechaLimite && t.fechaLimite < new Date() && t.columna.tipo !== 'COMPLETADO'),
    progreso: {
      total,
      completadas,
      porcentaje: total ? Math.round((completadas / total) * 100) : 0,
    },
  };
};

const error400 = (res, parsed) => res.status(400).json({ error: parsed.error.issues[0].message });

// Carga la tarea y verifica que el usuario sea miembro del proyecto (o ADMIN).
// Si falla, responde y devuelve null.
async function cargarTarea(req, res) {
  const id = parseId(req.params.id);
  const tarea = id
    ? await prisma.tarea.findUnique({
        where: { id },
        include: { columna: { include: { tablero: { select: { proyectoId: true } } } } },
      })
    : null;
  if (!tarea) {
    res.status(404).json({ error: 'Tarea no encontrada' });
    return null;
  }
  const proyectoId = tarea.columna.tablero.proyectoId;
  const membresia = await obtenerMembresia(req.user, proyectoId);
  if (!membresia) {
    res.status(403).json({ error: 'No eres miembro del proyecto de esta tarea' });
    return null;
  }
  return { tarea, proyectoId, membresia };
}

// Valida que responsable y etiquetas pertenezcan al proyecto. Devuelve mensaje de error o null.
async function validarReferencias(proyectoId, { responsableId, etiquetas }) {
  if (responsableId) {
    const miembro = await prisma.proyectoMiembro.findUnique({
      where: { proyectoId_usuarioId: { proyectoId, usuarioId: responsableId } },
    });
    if (!miembro) return 'El responsable debe ser miembro del proyecto';
  }
  if (etiquetas?.length) {
    const unicas = [...new Set(etiquetas)];
    const validas = await prisma.etiqueta.count({ where: { id: { in: unicas }, proyectoId } });
    if (validas !== unicas.length) return 'Alguna etiqueta no existe o no pertenece al proyecto';
  }
  return null;
}

// ---------- Tareas ----------

export async function listarTareas(req, res) {
  const tableroId = parseId(req.query.tableroId);
  if (!tableroId) return res.status(400).json({ error: 'Parámetro tableroId requerido' });

  const tablero = await prisma.tablero.findUnique({ where: { id: tableroId } });
  if (!tablero) return res.status(404).json({ error: 'Tablero no encontrado' });
  if (!(await obtenerMembresia(req.user, tablero.proyectoId))) {
    return res.status(403).json({ error: 'No eres miembro de este proyecto' });
  }

  const tareas = await prisma.tarea.findMany({
    where: { columna: { tableroId } },
    include: includeTarea,
    orderBy: [{ columnaId: 'asc' }, { orden: 'asc' }],
  });
  res.json(tareas.map(formatearTarea));
}

export async function obtenerTarea(req, res) {
  const ctx = await cargarTarea(req, res);
  if (!ctx) return;
  const tarea = await prisma.tarea.findUnique({ where: { id: ctx.tarea.id }, include: includeTarea });
  res.json(formatearTarea(tarea));
}

export async function crearTarea(req, res) {
  const parsed = crearSchema.safeParse(req.body);
  if (!parsed.success) return error400(res, parsed);
  const { tableroId, etiquetas, ...datos } = parsed.data;

  const tablero = await prisma.tablero.findUnique({
    where: { id: tableroId },
    include: { columnas: { where: { tipo: 'POR_HACER' }, orderBy: { orden: 'asc' }, take: 1 } },
  });
  if (!tablero) return res.status(404).json({ error: 'Tablero no encontrado' });
  if (!(await obtenerMembresia(req.user, tablero.proyectoId))) {
    return res.status(403).json({ error: 'Solo los miembros del proyecto pueden crear tareas' });
  }
  const columna = tablero.columnas[0];
  if (!columna) return res.status(400).json({ error: 'El tablero no tiene columna "Por hacer"' });

  const errorRef = await validarReferencias(tablero.proyectoId, { responsableId: datos.responsableId, etiquetas });
  if (errorRef) return res.status(400).json({ error: errorRef });

  const orden = await prisma.tarea.count({ where: { columnaId: columna.id } });

  const tarea = await prisma.$transaction(async (tx) => {
    const nueva = await tx.tarea.create({
      data: {
        ...datos,
        orden,
        columnaId: columna.id,
        creadorId: req.user.id,
        etiquetas: etiquetas?.length
          ? { create: [...new Set(etiquetas)].map((etiquetaId) => ({ etiquetaId })) }
          : undefined,
      },
      include: includeTarea,
    });
    await tx.bitacora.create({
      data: {
        tareaId: nueva.id,
        usuarioId: req.user.id,
        accion: 'CREADA',
        estadoNuevo: columna.tipo,
      },
    });
    return nueva;
  });

  res.status(201).json(formatearTarea(tarea));
}

export async function editarTarea(req, res) {
  const ctx = await cargarTarea(req, res);
  if (!ctx) return;
  const parsed = editarSchema.safeParse(req.body);
  if (!parsed.success) return error400(res, parsed);
  const { etiquetas, ...datos } = parsed.data;
  const { tarea, proyectoId } = ctx;

  // Validar coherencia de fechas contra los valores ya guardados
  const inicio = datos.fechaInicio !== undefined ? datos.fechaInicio : tarea.fechaInicio;
  const limite = datos.fechaLimite !== undefined ? datos.fechaLimite : tarea.fechaLimite;
  if (inicio && limite && limite < inicio) {
    return res.status(400).json({ error: msgFechas.message });
  }

  if (datos.responsableId === null && tarea.columna.tipo !== 'POR_HACER') {
    return res.status(400).json({ error: 'No se puede quitar el responsable a una tarea que ya inició' });
  }

  const errorRef = await validarReferencias(proyectoId, { responsableId: datos.responsableId, etiquetas });
  if (errorRef) return res.status(400).json({ error: errorRef });

  const actualizada = await prisma.tarea.update({
    where: { id: tarea.id },
    data: {
      ...datos,
      etiquetas: etiquetas
        ? { deleteMany: {}, create: [...new Set(etiquetas)].map((etiquetaId) => ({ etiquetaId })) }
        : undefined,
    },
    include: includeTarea,
  });
  res.json(formatearTarea(actualizada));
}

export async function eliminarTarea(req, res) {
  const ctx = await cargarTarea(req, res);
  if (!ctx) return;
  const { tarea, membresia } = ctx;
  if (membresia.rol !== 'ADMIN' && tarea.creadorId !== req.user.id) {
    return res.status(403).json({ error: 'Solo el creador o un administrador puede eliminar la tarea' });
  }
  await prisma.tarea.delete({ where: { id: tarea.id } });
  res.status(204).end();
}

export async function moverTarea(req, res) {
  const ctx = await cargarTarea(req, res);
  if (!ctx) return;
  const parsed = moverSchema.safeParse(req.body);
  if (!parsed.success) return error400(res, parsed);
  const { tarea } = ctx;

  const destino = await prisma.columna.findUnique({ where: { id: parsed.data.columnaDestinoId } });
  if (!destino) return res.status(404).json({ error: 'Columna destino no encontrada' });
  if (destino.tableroId !== tarea.columna.tableroId) {
    return res.status(400).json({ error: 'La columna destino debe pertenecer al mismo tablero' });
  }

  const actual = tarea.columna.tipo;
  const nuevo = destino.tipo;

  if (actual === 'COMPLETADO') {
    return res.status(400).json({ error: 'La tarea está COMPLETADA: es un estado final y no se puede mover' });
  }
  if (actual === nuevo) {
    return res.status(400).json({ error: `La tarea ya está en el estado ${actual}` });
  }
  if (!TRANSICIONES[actual].includes(nuevo)) {
    return res.status(400).json({
      error: `Transición no permitida: ${actual} → ${nuevo}. Desde ${actual} solo se puede mover a: ${TRANSICIONES[actual].join(', ')}`,
    });
  }
  if (actual === 'POR_HACER' && nuevo === 'EN_PROGRESO' && !tarea.responsableId) {
    return res.status(400).json({ error: 'La tarea debe tener un responsable asignado para pasar a EN_PROGRESO' });
  }

  const orden = await prisma.tarea.count({ where: { columnaId: destino.id } });

  const movida = await prisma.$transaction(async (tx) => {
    const t = await tx.tarea.update({
      where: { id: tarea.id },
      data: {
        columnaId: destino.id,
        orden,
        fechaCierre: nuevo === 'COMPLETADO' ? new Date() : undefined,
      },
      include: includeTarea,
    });
    await tx.bitacora.create({
      data: {
        tareaId: tarea.id,
        usuarioId: req.user.id,
        accion: 'MOVIDA',
        estadoAnterior: actual,
        estadoNuevo: nuevo,
        detalle: `${tarea.columna.nombre} → ${destino.nombre}`,
      },
    });
    return t;
  });

  res.json(formatearTarea(movida));
}

// ---------- Subtareas ----------

async function cargarSubtarea(req, res, tareaId) {
  const id = parseId(req.params.subtareaId);
  const subtarea = id ? await prisma.subtarea.findUnique({ where: { id } }) : null;
  if (!subtarea || subtarea.tareaId !== tareaId) {
    res.status(404).json({ error: 'Subtarea no encontrada en esta tarea' });
    return null;
  }
  return subtarea;
}

export async function listarSubtareas(req, res) {
  const ctx = await cargarTarea(req, res);
  if (!ctx) return;
  const subtareas = await prisma.subtarea.findMany({
    where: { tareaId: ctx.tarea.id },
    include: { checklist: true },
    orderBy: { id: 'asc' },
  });
  res.json(subtareas);
}

export async function crearSubtarea(req, res) {
  const ctx = await cargarTarea(req, res);
  if (!ctx) return;
  const parsed = subtareaSchema.safeParse(req.body);
  if (!parsed.success) return error400(res, parsed);
  const subtarea = await prisma.subtarea.create({
    data: { ...parsed.data, tareaId: ctx.tarea.id },
    include: { checklist: true },
  });
  res.status(201).json(subtarea);
}

export async function editarSubtarea(req, res) {
  const ctx = await cargarTarea(req, res);
  if (!ctx) return;
  const subtarea = await cargarSubtarea(req, res, ctx.tarea.id);
  if (!subtarea) return;
  const parsed = subtareaSchema.partial().safeParse(req.body);
  if (!parsed.success) return error400(res, parsed);
  const actualizada = await prisma.subtarea.update({
    where: { id: subtarea.id },
    data: parsed.data,
    include: { checklist: true },
  });
  res.json(actualizada);
}

export async function eliminarSubtarea(req, res) {
  const ctx = await cargarTarea(req, res);
  if (!ctx) return;
  const subtarea = await cargarSubtarea(req, res, ctx.tarea.id);
  if (!subtarea) return;
  await prisma.subtarea.delete({ where: { id: subtarea.id } });
  res.status(204).end();
}

// ---------- Checklist ----------

async function cargarItem(req, res, subtareaId) {
  const id = parseId(req.params.itemId);
  const item = id ? await prisma.checklistItem.findUnique({ where: { id } }) : null;
  if (!item || item.subtareaId !== subtareaId) {
    res.status(404).json({ error: 'Item de checklist no encontrado en esta subtarea' });
    return null;
  }
  return item;
}

export async function crearItemChecklist(req, res) {
  const ctx = await cargarTarea(req, res);
  if (!ctx) return;
  const subtarea = await cargarSubtarea(req, res, ctx.tarea.id);
  if (!subtarea) return;
  const parsed = checklistSchema.safeParse(req.body);
  if (!parsed.success) return error400(res, parsed);
  const item = await prisma.checklistItem.create({ data: { ...parsed.data, subtareaId: subtarea.id } });
  res.status(201).json(item);
}

export async function editarItemChecklist(req, res) {
  const ctx = await cargarTarea(req, res);
  if (!ctx) return;
  const subtarea = await cargarSubtarea(req, res, ctx.tarea.id);
  if (!subtarea) return;
  const item = await cargarItem(req, res, subtarea.id);
  if (!item) return;
  const parsed = checklistSchema.partial().safeParse(req.body);
  if (!parsed.success) return error400(res, parsed);
  const actualizado = await prisma.checklistItem.update({ where: { id: item.id }, data: parsed.data });
  res.json(actualizado);
}

export async function eliminarItemChecklist(req, res) {
  const ctx = await cargarTarea(req, res);
  if (!ctx) return;
  const subtarea = await cargarSubtarea(req, res, ctx.tarea.id);
  if (!subtarea) return;
  const item = await cargarItem(req, res, subtarea.id);
  if (!item) return;
  await prisma.checklistItem.delete({ where: { id: item.id } });
  res.status(204).end();
}

// ---------- Comentarios y bitácora ----------

export async function listarComentarios(req, res) {
  const ctx = await cargarTarea(req, res);
  if (!ctx) return;
  const comentarios = await prisma.comentario.findMany({
    where: { tareaId: ctx.tarea.id },
    include: { usuario: { select: { id: true, nombre: true } } },
    orderBy: { creadoEn: 'asc' },
  });
  res.json(comentarios);
}

export async function crearComentario(req, res) {
  const ctx = await cargarTarea(req, res);
  if (!ctx) return;
  const parsed = comentarioSchema.safeParse(req.body);
  if (!parsed.success) return error400(res, parsed);
  const comentario = await prisma.comentario.create({
    data: { texto: parsed.data.texto, tareaId: ctx.tarea.id, usuarioId: req.user.id },
    include: { usuario: { select: { id: true, nombre: true } } },
  });
  res.status(201).json(comentario);
}

export async function obtenerBitacora(req, res) {
  const ctx = await cargarTarea(req, res);
  if (!ctx) return;
  const registros = await prisma.bitacora.findMany({
    where: { tareaId: ctx.tarea.id },
    include: { usuario: { select: { id: true, nombre: true } } },
    orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
  });
  res.json(registros);
}

import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { accesoProyecto, parseId } from '../lib/permisos.js';

const etiquetaSchema = z.object({
  nombre: z.string({ error: 'El nombre es obligatorio' }).trim().min(1, 'El nombre es obligatorio').max(50, 'Nombre demasiado largo'),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'El color debe tener formato hexadecimal, ej. #2563eb')
    .optional(),
});

const error400 = (res, parsed) => res.status(400).json({ error: parsed.error.issues[0].message });

async function nombreRepetido(proyectoId, nombre, excluirId) {
  const existente = await prisma.etiqueta.findFirst({
    where: { proyectoId, nombre, id: excluirId ? { not: excluirId } : undefined },
  });
  return Boolean(existente);
}

async function cargarEtiqueta(res, proyectoId, etiquetaIdParam) {
  const id = parseId(etiquetaIdParam);
  const etiqueta = id ? await prisma.etiqueta.findUnique({ where: { id } }) : null;
  if (!etiqueta || etiqueta.proyectoId !== proyectoId) {
    res.status(404).json({ error: 'Etiqueta no encontrada en este proyecto' });
    return null;
  }
  return etiqueta;
}

export async function listarEtiquetas(req, res) {
  const ctx = await accesoProyecto(req, res, parseId(req.params.id));
  if (!ctx) return;
  const etiquetas = await prisma.etiqueta.findMany({
    where: { proyectoId: ctx.proyecto.id },
    orderBy: { nombre: 'asc' },
  });
  res.json(etiquetas);
}

// Cualquier miembro puede administrar etiquetas: son parte de clasificar las tareas
export async function crearEtiqueta(req, res) {
  const ctx = await accesoProyecto(req, res, parseId(req.params.id));
  if (!ctx) return;
  const parsed = etiquetaSchema.safeParse(req.body);
  if (!parsed.success) return error400(res, parsed);
  if (await nombreRepetido(ctx.proyecto.id, parsed.data.nombre)) {
    return res.status(409).json({ error: 'Ya existe una etiqueta con ese nombre en el proyecto' });
  }
  const etiqueta = await prisma.etiqueta.create({ data: { ...parsed.data, proyectoId: ctx.proyecto.id } });
  res.status(201).json(etiqueta);
}

export async function editarEtiqueta(req, res) {
  const ctx = await accesoProyecto(req, res, parseId(req.params.id));
  if (!ctx) return;
  const etiqueta = await cargarEtiqueta(res, ctx.proyecto.id, req.params.etiquetaId);
  if (!etiqueta) return;
  const parsed = etiquetaSchema.partial().safeParse(req.body);
  if (!parsed.success) return error400(res, parsed);
  if (parsed.data.nombre && (await nombreRepetido(ctx.proyecto.id, parsed.data.nombre, etiqueta.id))) {
    return res.status(409).json({ error: 'Ya existe una etiqueta con ese nombre en el proyecto' });
  }
  const actualizada = await prisma.etiqueta.update({ where: { id: etiqueta.id }, data: parsed.data });
  res.json(actualizada);
}

export async function eliminarEtiqueta(req, res) {
  const ctx = await accesoProyecto(req, res, parseId(req.params.id));
  if (!ctx) return;
  const etiqueta = await cargarEtiqueta(res, ctx.proyecto.id, req.params.etiquetaId);
  if (!etiqueta) return;
  await prisma.etiqueta.delete({ where: { id: etiqueta.id } });
  res.status(204).end();
}

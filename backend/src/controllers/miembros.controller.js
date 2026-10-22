import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { accesoProyecto, parseId } from '../lib/permisos.js';

const agregarSchema = z
  .object({
    usuarioId: z.number().int().positive().optional(),
    email: z.string().trim().email('Formato de correo inválido').optional(),
    rol: z.enum(['ADMIN', 'MIEMBRO'], { error: 'Rol debe ser ADMIN o MIEMBRO' }).optional(),
  })
  .refine((d) => d.usuarioId || d.email, { message: 'Indica usuarioId o email del usuario' });

const rolSchema = z.object({
  rol: z.enum(['ADMIN', 'MIEMBRO'], { error: 'Rol debe ser ADMIN o MIEMBRO' }),
});

const incluirUsuario = { usuario: { select: { id: true, nombre: true, email: true } } };

const error400 = (res, parsed) => res.status(400).json({ error: parsed.error.issues[0].message });

// Evita dejar un proyecto sin ningún administrador
async function esUltimoAdmin(proyectoId, miembro) {
  if (miembro.rol !== 'ADMIN') return false;
  const admins = await prisma.proyectoMiembro.count({ where: { proyectoId, rol: 'ADMIN' } });
  return admins <= 1;
}

async function cargarMiembro(res, proyectoId, usuarioIdParam) {
  const usuarioId = parseId(usuarioIdParam);
  const miembro = usuarioId
    ? await prisma.proyectoMiembro.findUnique({ where: { proyectoId_usuarioId: { proyectoId, usuarioId } } })
    : null;
  if (!miembro) {
    res.status(404).json({ error: 'El usuario no es miembro de este proyecto' });
    return null;
  }
  return miembro;
}

export async function listarMiembros(req, res) {
  const ctx = await accesoProyecto(req, res, parseId(req.params.id));
  if (!ctx) return;
  const miembros = await prisma.proyectoMiembro.findMany({
    where: { proyectoId: ctx.proyecto.id },
    include: incluirUsuario,
    orderBy: { usuarioId: 'asc' },
  });
  res.json(miembros);
}

export async function agregarMiembro(req, res) {
  const ctx = await accesoProyecto(req, res, parseId(req.params.id), { gestionar: true });
  if (!ctx) return;
  const parsed = agregarSchema.safeParse(req.body);
  if (!parsed.success) return error400(res, parsed);
  const { usuarioId, email, rol } = parsed.data;

  const usuario = await prisma.usuario.findUnique({ where: usuarioId ? { id: usuarioId } : { email } });
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

  const proyectoId = ctx.proyecto.id;
  const existe = await prisma.proyectoMiembro.findUnique({
    where: { proyectoId_usuarioId: { proyectoId, usuarioId: usuario.id } },
  });
  if (existe) return res.status(409).json({ error: 'El usuario ya es miembro del proyecto' });

  const miembro = await prisma.proyectoMiembro.create({
    data: { proyectoId, usuarioId: usuario.id, rol },
    include: incluirUsuario,
  });
  res.status(201).json(miembro);
}

export async function cambiarRolMiembro(req, res) {
  const ctx = await accesoProyecto(req, res, parseId(req.params.id), { gestionar: true });
  if (!ctx) return;
  const parsed = rolSchema.safeParse(req.body);
  if (!parsed.success) return error400(res, parsed);
  const miembro = await cargarMiembro(res, ctx.proyecto.id, req.params.usuarioId);
  if (!miembro) return;

  if (parsed.data.rol === 'MIEMBRO' && (await esUltimoAdmin(ctx.proyecto.id, miembro))) {
    return res.status(400).json({ error: 'El proyecto debe conservar al menos un administrador' });
  }

  const actualizado = await prisma.proyectoMiembro.update({
    where: { proyectoId_usuarioId: { proyectoId: miembro.proyectoId, usuarioId: miembro.usuarioId } },
    data: { rol: parsed.data.rol },
    include: incluirUsuario,
  });
  res.json(actualizado);
}

export async function quitarMiembro(req, res) {
  const ctx = await accesoProyecto(req, res, parseId(req.params.id), { gestionar: true });
  if (!ctx) return;
  const miembro = await cargarMiembro(res, ctx.proyecto.id, req.params.usuarioId);
  if (!miembro) return;

  if (await esUltimoAdmin(ctx.proyecto.id, miembro)) {
    return res.status(400).json({ error: 'No se puede quitar al único administrador del proyecto' });
  }

  await prisma.proyectoMiembro.delete({
    where: { proyectoId_usuarioId: { proyectoId: miembro.proyectoId, usuarioId: miembro.usuarioId } },
  });
  res.status(204).end();
}

import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { parseId } from '../lib/permisos.js';
import { passwordSchema } from './auth.controller.js';

const camposUsuario = {
  nombre: z.string({ error: 'El nombre es obligatorio' }).trim().min(2, 'El nombre es obligatorio'),
  email: z.string({ error: 'El correo es obligatorio' }).trim().email('Formato de correo inválido'),
  rol: z.enum(['ADMIN', 'MIEMBRO'], { error: 'Rol debe ser ADMIN o MIEMBRO' }).optional(),
};

const crearSchema = z.object({ ...camposUsuario, password: passwordSchema });
const editarSchema = z.object(camposUsuario).partial();

const datosPublicos = { id: true, nombre: true, email: true, rol: true, creadoEn: true };

const error400 = (res, parsed) => res.status(400).json({ error: parsed.error.issues[0].message });

// Cualquier usuario autenticado: sirve para buscar a quién agregar a un proyecto
export async function listarUsuarios(req, res) {
  const buscar = String(req.query.buscar || '').trim();
  const usuarios = await prisma.usuario.findMany({
    where: buscar ? { OR: [{ nombre: { contains: buscar } }, { email: { contains: buscar } }] } : undefined,
    select: req.user.rol === 'ADMIN' ? datosPublicos : { id: true, nombre: true, email: true },
    orderBy: { nombre: 'asc' },
  });
  res.json(usuarios);
}

export async function obtenerUsuario(req, res) {
  const id = parseId(req.params.id);
  const usuario = id
    ? await prisma.usuario.findUnique({
        where: { id },
        select: {
          ...datosPublicos,
          membresias: { select: { rol: true, proyecto: { select: { id: true, nombre: true } } } },
          _count: { select: { tareasAsignadas: true, tareasCreadas: true } },
        },
      })
    : null;
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(usuario);
}

export async function crearUsuario(req, res) {
  const parsed = crearSchema.safeParse(req.body);
  if (!parsed.success) return error400(res, parsed);
  const { password, ...datos } = parsed.data;

  const existe = await prisma.usuario.findUnique({ where: { email: datos.email } });
  if (existe) return res.status(409).json({ error: 'El correo ya está registrado' });

  const usuario = await prisma.usuario.create({
    data: { ...datos, password: await bcrypt.hash(password, 10) },
    select: datosPublicos,
  });
  res.status(201).json(usuario);
}

// Evita que el sistema se quede sin administradores globales
async function esUltimoAdmin(usuario) {
  if (usuario.rol !== 'ADMIN') return false;
  return (await prisma.usuario.count({ where: { rol: 'ADMIN' } })) <= 1;
}

export async function editarUsuario(req, res) {
  const id = parseId(req.params.id);
  const usuario = id ? await prisma.usuario.findUnique({ where: { id } }) : null;
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

  const parsed = editarSchema.safeParse(req.body);
  if (!parsed.success) return error400(res, parsed);
  const datos = parsed.data;

  if (datos.email && datos.email !== usuario.email) {
    const existe = await prisma.usuario.findUnique({ where: { email: datos.email } });
    if (existe) return res.status(409).json({ error: 'El correo ya está registrado' });
  }
  if (datos.rol === 'MIEMBRO' && (await esUltimoAdmin(usuario))) {
    return res.status(400).json({ error: 'Debe existir al menos un administrador en el sistema' });
  }

  const actualizado = await prisma.usuario.update({ where: { id }, data: datos, select: datosPublicos });
  res.json(actualizado);
}

// Solo se eliminan usuarios sin actividad, para no romper la trazabilidad (bitácora, comentarios, tareas)
export async function eliminarUsuario(req, res) {
  const id = parseId(req.params.id);
  const usuario = id
    ? await prisma.usuario.findUnique({
        where: { id },
        include: {
          _count: {
            select: { proyectosCreados: true, tareasCreadas: true, tareasAsignadas: true, comentarios: true, bitacora: true },
          },
        },
      })
    : null;
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (usuario.id === req.user.id) {
    return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
  }
  if (await esUltimoAdmin(usuario)) {
    return res.status(400).json({ error: 'Debe existir al menos un administrador en el sistema' });
  }
  if (Object.values(usuario._count).some((n) => n > 0)) {
    return res.status(409).json({
      error: 'El usuario tiene actividad registrada (proyectos, tareas, comentarios o bitácora) y no puede eliminarse',
    });
  }

  await prisma.usuario.delete({ where: { id } });
  res.status(204).end();
}

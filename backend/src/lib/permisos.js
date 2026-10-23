import { prisma } from './prisma.js';

// Devuelve la membresía del usuario en el proyecto. El ADMIN global siempre actúa como ADMIN del proyecto.
// null => sin acceso.
export async function obtenerMembresia(user, proyectoId) {
  const membresia = await prisma.proyectoMiembro.findUnique({
    where: { proyectoId_usuarioId: { proyectoId, usuarioId: user.id } },
  });
  if (user.rol === 'ADMIN') return { proyectoId, usuarioId: user.id, ...membresia, rol: 'ADMIN' };
  return membresia;
}

// Verifica que el proyecto exista y que el usuario tenga acceso (y rol ADMIN si gestionar=true).
// Si falla, responde y devuelve null.
export async function accesoProyecto(req, res, proyectoId, { gestionar = false } = {}) {
  const proyecto = proyectoId ? await prisma.proyecto.findUnique({ where: { id: proyectoId } }) : null;
  if (!proyecto) {
    res.status(404).json({ error: 'Proyecto no encontrado' });
    return null;
  }
  const membresia = await obtenerMembresia(req.user, proyectoId);
  if (!membresia) {
    res.status(403).json({ error: 'No eres miembro de este proyecto' });
    return null;
  }
  if (gestionar && membresia.rol !== 'ADMIN') {
    res.status(403).json({ error: 'Solo un administrador del proyecto puede realizar esta acción' });
    return null;
  }
  return { proyecto, membresia };
}

export const parseId = (valor) => {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
};

import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  // El rol se lee de la base para que un cambio de rol o eliminación aplique de inmediato
  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.id },
    select: { id: true, rol: true, nombre: true },
  });
  if (!usuario) return res.status(401).json({ error: 'El usuario ya no existe' });

  req.user = usuario;
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }
    next();
  };
}
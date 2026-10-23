import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const passwordSchema = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/[A-Z]/, 'Debe incluir una mayúscula')
  .regex(/[a-z]/, 'Debe incluir una minúscula')
  .regex(/[0-9]/, 'Debe incluir un número');

const registroSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre es obligatorio'),
  email: z.string().trim().email('Formato de correo inválido'),
  password: passwordSchema,
});

const loginSchema = z.object({
  email: z.string().trim().email('Formato de correo inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

const firmarToken = (u) =>
  jwt.sign({ id: u.id, rol: u.rol, nombre: u.nombre }, process.env.JWT_SECRET, {
    expiresIn: '8h',
  });

export async function registro(req, res) {
  const parsed = registroSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { nombre, email, password } = parsed.data;

  const existe = await prisma.usuario.findUnique({ where: { email } });
  if (existe) return res.status(409).json({ error: 'El correo ya está registrado' });

  const hash = await bcrypt.hash(password, 10);
  const usuario = await prisma.usuario.create({
    data: { nombre, email, password: hash },
  });

  res.status(201).json({
    token: firmarToken(usuario),
    usuario: { id: usuario.id, nombre, email, rol: usuario.rol },
  });
}

export async function login(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { email, password } = parsed.data;

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  const ok = usuario && (await bcrypt.compare(password, usuario.password));
  if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas' });

  res.json({
    token: firmarToken(usuario),
    usuario: { id: usuario.id, nombre: usuario.nombre, email, rol: usuario.rol },
  });
}

export async function olvideContrasena(req, res) {
  const email = String(req.body.email || '').trim();
  const usuario = await prisma.usuario.findUnique({ where: { email } });

  if (usuario) {
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        resetToken: token,
        resetTokenExpira: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    // TODO: enviar por correo con nodemailer. Por ahora se imprime en consola.
    console.log(`[reset] Token para ${email}: ${token}`);
  }

  // Misma respuesta exista o no el correo
  res.json({ mensaje: 'Si el correo existe, recibirás instrucciones para restablecer tu contraseña' });
}

export async function restablecerContrasena(req, res) {
  const { token, password } = req.body;
  const parsed = passwordSchema.safeParse(password);
  if (!token) return res.status(400).json({ error: 'Token requerido' });
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const usuario = await prisma.usuario.findFirst({
    where: { resetToken: token, resetTokenExpira: { gt: new Date() } },
  });
  if (!usuario) return res.status(400).json({ error: 'Token inválido o expirado' });

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      password: await bcrypt.hash(password, 10),
      resetToken: null,
      resetTokenExpira: null,
    },
  });

  res.json({ mensaje: 'Contraseña actualizada correctamente' });
}

export async function perfil(req, res) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.user.id },
    select: { id: true, nombre: true, email: true, rol: true },
  });
  res.json(usuario);
}
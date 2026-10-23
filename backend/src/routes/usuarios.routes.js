import { Router } from 'express';
import {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  editarUsuario,
  eliminarUsuario,
} from '../controllers/usuarios.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', listarUsuarios);
router.get('/:id', requireRole('ADMIN'), obtenerUsuario);
router.post('/', requireRole('ADMIN'), crearUsuario);
router.put('/:id', requireRole('ADMIN'), editarUsuario);
router.delete('/:id', requireRole('ADMIN'), eliminarUsuario);

export default router;

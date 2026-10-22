import { Router } from 'express';
import {
  registro,
  login,
  olvideContrasena,
  restablecerContrasena,
  perfil,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.post('/registro', registro);
router.post('/login', login);
router.post('/olvide-contrasena', olvideContrasena);
router.post('/restablecer-contrasena', restablecerContrasena);
router.get('/perfil', requireAuth, perfil);

export default router;
import { Router } from 'express';
import { obtenerTablero, editarTablero, eliminarTablero } from '../controllers/tableros.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/:id', obtenerTablero);
router.put('/:id', editarTablero);
router.delete('/:id', eliminarTablero);

export default router;

import { Router } from 'express';
import {
  listarProyectos,
  obtenerProyecto,
  crearProyecto,
  editarProyecto,
  eliminarProyecto,
  dashboard,
} from '../controllers/proyectos.controller.js';
import {
  listarMiembros,
  agregarMiembro,
  cambiarRolMiembro,
  quitarMiembro,
} from '../controllers/miembros.controller.js';
import {
  listarEtiquetas,
  crearEtiqueta,
  editarEtiqueta,
  eliminarEtiqueta,
} from '../controllers/etiquetas.controller.js';
import { listarTableros, crearTablero } from '../controllers/tableros.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', listarProyectos);
router.post('/', requireRole('ADMIN'), crearProyecto);
router.get('/:id', obtenerProyecto);
router.put('/:id', editarProyecto);
router.delete('/:id', eliminarProyecto);
router.get('/:id/dashboard', dashboard);

router.get('/:id/miembros', listarMiembros);
router.post('/:id/miembros', agregarMiembro);
router.put('/:id/miembros/:usuarioId', cambiarRolMiembro);
router.delete('/:id/miembros/:usuarioId', quitarMiembro);

router.get('/:id/etiquetas', listarEtiquetas);
router.post('/:id/etiquetas', crearEtiqueta);
router.put('/:id/etiquetas/:etiquetaId', editarEtiqueta);
router.delete('/:id/etiquetas/:etiquetaId', eliminarEtiqueta);

router.get('/:id/tableros', listarTableros);
router.post('/:id/tableros', crearTablero);

export default router;

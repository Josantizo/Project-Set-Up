import { Router } from 'express';
import {
  listarTareas,
  obtenerTarea,
  crearTarea,
  editarTarea,
  eliminarTarea,
  moverTarea,
  listarSubtareas,
  crearSubtarea,
  editarSubtarea,
  eliminarSubtarea,
  crearItemChecklist,
  editarItemChecklist,
  eliminarItemChecklist,
  listarComentarios,
  crearComentario,
  obtenerBitacora,
} from '../controllers/tareas.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', listarTareas);
router.post('/', crearTarea);
router.get('/:id', obtenerTarea);
router.put('/:id', editarTarea);
router.delete('/:id', eliminarTarea);
router.patch('/:id/mover', moverTarea);

router.get('/:id/subtareas', listarSubtareas);
router.post('/:id/subtareas', crearSubtarea);
router.put('/:id/subtareas/:subtareaId', editarSubtarea);
router.delete('/:id/subtareas/:subtareaId', eliminarSubtarea);

router.post('/:id/subtareas/:subtareaId/checklist', crearItemChecklist);
router.put('/:id/subtareas/:subtareaId/checklist/:itemId', editarItemChecklist);
router.delete('/:id/subtareas/:subtareaId/checklist/:itemId', eliminarItemChecklist);

router.get('/:id/comentarios', listarComentarios);
router.post('/:id/comentarios', crearComentario);
router.get('/:id/bitacora', obtenerBitacora);

export default router;

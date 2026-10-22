import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import tareasRoutes from './routes/tareas.routes.js';
import proyectosRoutes from './routes/proyectos.routes.js';
import tablerosRoutes from './routes/tableros.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/tareas', tareasRoutes);
app.use('/api/proyectos', proyectosRoutes);
app.use('/api/tableros', tablerosRoutes);
app.use('/api/usuarios', usuariosRoutes);

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Respuestas de error siempre en JSON y sin exponer el stack
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

export default app;

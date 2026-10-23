import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import tareasRoutes from './routes/tareas.routes.js';
import proyectosRoutes from './routes/proyectos.routes.js';
import tablerosRoutes from './routes/tableros.routes.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/tareas', tareasRoutes);
app.use('/api/proyectos', proyectosRoutes);
app.use('/api/tableros', tablerosRoutes);

app.listen(process.env.PORT, () =>
  console.log(`API en http://localhost:${process.env.PORT}`));
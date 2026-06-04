import express from 'express';
import cors from 'cors';

import authRoutes from './src/routes/auth.routes.js';
import usersRoutes from './src/routes/users.routes.js';
import professionalsRoutes from './src/routes/professionals.routes.js';
import servicesRoutes from './src/routes/services.routes.js';
import patientsRoutes from './src/routes/patients.routes.js';
import appointmentsRoutes from './src/routes/appointments.routes.js';
import reportsRoutes from './src/routes/reports.routes.js';
import paymentsRoutes from './src/routes/payments.routes.js';
import iniciarRecordatorios from './src/utils/reminders.js';
import remindersRoutes from './src/routes/reminders.routes.js';

const app = express();

// --- CONFIGURACIÓN DE CORS (El patovica) ---
const dominiosPermitidos = [
  'http://localhost:5173', // Para cuando prueben el frontend con Vite
  'http://localhost:3000', // Por si alguno usa Create React App
  // Acá vamos a agregar la URL de Vercel cuando subamos el frontend
];

app.use(cors({
  origin: function (origin, callback) {
    // Permitimos peticiones sin origen (como Postman) o las que estén en nuestra lista
    if (!origin || dominiosPermitidos.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado por CORS'));
    }
  },
  credentials: true // Importante para que pasen los Tokens de autorización
}));

// --- MIDDLEWARES GLOBALES ---
app.use(express.json());

// --- RUTAS ---
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/professionals', professionalsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/reminders', remindersRoutes);

// --- TEST ---
app.get('/', (req, res) => {
  res.send('API de Espacio Senda funcionando correctamente');
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada'
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Error interno del servidor'
  });
});

// --- SERVIDOR ---
const PORT = process.env.PORT || 3000;

//  QA: Solo levantamos el puerto y los crons si NO estamos corriendo tests
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
  });
  
  iniciarRecordatorios();
}

// Exportamos la app para que Supertest pueda hacer sus simulaciones
export default app;
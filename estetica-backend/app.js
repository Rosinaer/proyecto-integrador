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
import errorHandler from './src/middleware/errorHandler.js';

import iniciarSincronizacionGoogle from './src/utils/googleSync.js';
import googleRoutes from './src/routes/google.routes.js';

import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./src/config/swagger.js";

const app = express();


const dominiosPermitidos = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || dominiosPermitidos.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado por CORS'));
    }
  },
  credentials: true
}));


app.use(express.json());

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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
app.use('/api/google', googleRoutes);

// --- TEST ---
app.get('/', (req, res) => {
  res.send('API de Espacio Senda funcionando correctamente');
});

// --- 404 ---
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada'
  });
});



app.use(errorHandler);

const PORT = process.env.PORT || 3000;


if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
  });

  iniciarRecordatorios();
  iniciarSincronizacionGoogle();
}


export default app;
import express from 'express';
import {
  obtenerHorariosDisponibles,
  obtenerOpcionesPorServicio,
  obtenerDiasDisponibles,
  obtenerTurnos,
  obtenerTurnoPorId,
  crearTurno,
  crearSobreturno,
  cambiarEstadoTurno,
  reprogramarTurno,
} from '../controllers/appointments.controller.js';
import verificarToken from '../middleware/verificarToken.js';
import autorizarRoles from '../middleware/autorizarRoles.js';

const router = express.Router();

router.get('/available-slots', verificarToken, autorizarRoles(['ADMIN', 'RECEPTIONIST', 'PROFESSIONAL']), obtenerHorariosDisponibles);
router.get('/service-options', verificarToken, autorizarRoles(['ADMIN', 'RECEPTIONIST', 'PROFESSIONAL']), obtenerOpcionesPorServicio);
router.get('/available-days', verificarToken, autorizarRoles(['ADMIN', 'RECEPTIONIST', 'PROFESSIONAL']), obtenerDiasDisponibles);
router.get('/', verificarToken, autorizarRoles(['ADMIN', 'RECEPTIONIST', 'PROFESSIONAL']), obtenerTurnos);
router.post('/overbook', verificarToken, autorizarRoles(['ADMIN', 'RECEPTIONIST', 'PROFESSIONAL']), crearSobreturno);
router.post('/', verificarToken, autorizarRoles(['ADMIN', 'RECEPTIONIST', 'PROFESSIONAL']), crearTurno);
router.get('/:id', verificarToken, autorizarRoles(['ADMIN', 'RECEPTIONIST', 'PROFESSIONAL']), obtenerTurnoPorId);
router.patch('/:id/status',    verificarToken, autorizarRoles(['ADMIN', 'RECEPTIONIST', 'PROFESSIONAL']), cambiarEstadoTurno);
router.patch('/:id/reschedule', verificarToken, autorizarRoles(['ADMIN', 'RECEPTIONIST', 'PROFESSIONAL']), reprogramarTurno);

export default router;
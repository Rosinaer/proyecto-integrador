import { Router } from 'express';
import verificarToken from '../middleware/verificarToken.js';
import autorizarRoles from '../middleware/autorizarRoles.js';
import {
  crearPago,
  obtenerPagosPorTurno,
  registrarReembolso,
  eliminarPago,
  obtenerHistorialPagos,
} from '../controllers/payments.controller.js';

const router = Router();


router.use(verificarToken);
router.get('/historial', autorizarRoles(['ADMIN']), obtenerHistorialPagos);
router.post('/:appointmentId', autorizarRoles(['ADMIN', 'RECEPTIONIST']), crearPago);
router.get('/:appointmentId', autorizarRoles(['ADMIN', 'RECEPTIONIST']), obtenerPagosPorTurno);
router.post('/:appointmentId/refund', autorizarRoles(['ADMIN', 'RECEPTIONIST']), registrarReembolso);
router.delete('/:id/delete', autorizarRoles(['ADMIN']), eliminarPago);

export default router;

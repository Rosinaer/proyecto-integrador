import { Router } from 'express';
import verificarToken from '../middleware/verificarToken.js';
import autorizarRoles from '../middleware/autorizarRoles.js';
import {
  estadoGoogle,
  sincronizarUno,
  reintentar,
} from '../controllers/google.controller.js';

const router = Router();


router.use(verificarToken, autorizarRoles(['ADMIN']));
router.get('/status', estadoGoogle);
router.post('/sync/:appointmentId', sincronizarUno);
router.post('/retry', reintentar);

export default router;

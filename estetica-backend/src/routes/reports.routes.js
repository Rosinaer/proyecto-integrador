import express from 'express';
import {
    reporteIngresos,
    reporteTurnos,
    reporteServicios,
} from '../controllers/reports.controller.js';
import verificarToken from '../middleware/verificarToken.js';
import autorizarRoles from '../middleware/autorizarRoles.js';

const router = express.Router();


router.get('/income', verificarToken, autorizarRoles(['ADMIN']), reporteIngresos);
router.get('/appointments', verificarToken, autorizarRoles(['ADMIN']), reporteTurnos);
router.get('/services', verificarToken, autorizarRoles(['ADMIN']), reporteServicios);

export default router;
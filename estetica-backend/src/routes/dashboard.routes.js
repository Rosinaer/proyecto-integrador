import express from 'express';
import { getDashboard } from '../controllers/dashboard.controller.js';
import verificarToken from '../middleware/verificarToken.js';
import autorizarRoles from '../middleware/autorizarRoles.js';

const router = express.Router();

router.get("/", verificarToken, autorizarRoles(["ADMIN"]), getDashboard);

export default router;

import { Router } from 'express';
import verificarToken from '../middleware/verificarToken.js';
import autorizarRoles from '../middleware/autorizarRoles.js';
import { procesarRecordatorios, enviarRecordatorioTurno } from '../utils/reminders.js';

const router = Router();

router.post(
  '/enviar',
  verificarToken,
  autorizarRoles(['ADMIN']),
  async (req, res) => {
    try {
      await procesarRecordatorios();
      res.json({ mensaje: 'Recordatorios procesados correctamente' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.post(
  '/turno/:id',
  verificarToken,
  autorizarRoles(['ADMIN', 'RECEPTIONIST', 'PROFESSIONAL']),
  async (req, res) => {
    try {
      const r = await enviarRecordatorioTurno(req.params.id);
      if (!r.ok) return res.status(404).json({ mensaje: r.error });
      res.json({ mensaje: 'Recordatorio enviado', resultados: r.resultados });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
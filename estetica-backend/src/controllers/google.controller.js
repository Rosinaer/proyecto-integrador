import { googleHabilitado } from '../config/google.js';
import {
  sincronizarTurno,
  reintentarPendientes,
} from '../services/appointmentSync.service.js';


export const estadoGoogle = async (req, res) => {
  res.json({ habilitado: googleHabilitado });
};


export const sincronizarUno = async (req, res) => {
  try {
    if (!googleHabilitado) {
      return res.status(503).json({ mensaje: 'La integración con Google Calendar no está configurada' });
    }
 
    
    const r = await sincronizarTurno(req.params.appointmentId);
    if (!r?.ok) {
      return res.status(502).json({ mensaje: 'La sincronización falló', detalle: r?.error });
    }
    res.json({ mensaje: 'Sincronización ejecutada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


export const reintentar = async (req, res) => {
  try {
    if (!googleHabilitado) {
      return res.status(503).json({ mensaje: 'La integración con Google Calendar no está configurada' });
    }
    const r = await reintentarPendientes();
    res.json({ mensaje: 'Reintentos ejecutados', ...r });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
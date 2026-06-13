import cron from 'node-cron';
import { googleHabilitado } from '../config/google.js';
import { reintentarPendientes } from '../services/appointmentSync.service.js';

const iniciarSincronizacionGoogle = () => {
  if (!googleHabilitado) {
    console.log('ℹ️  Sincronización con Google Calendar desactivada (sin credenciales).');
    return;
  }

  // Cada 15 minutos reintenta lo que haya quedado PENDING o FAILED
  cron.schedule(
    '*/15 * * * *',
    async () => {
      const r = await reintentarPendientes();
      if (r.intentados) {
        console.log(`🔄 Google Calendar: ${r.ok}/${r.intentados} turnos resincronizados`);
      }
    },
    { timezone: 'America/Argentina/Buenos_Aires' }
  );

  console.log('✅ Sincronización con Google Calendar iniciada (reintentos cada 15 min)');
};

export default iniciarSincronizacionGoogle;

import prisma from '../config/prisma.js';
import { googleHabilitado, DEFAULT_CALENDAR_ID } from '../config/google.js';
import {
  construirEvento,
  crearEvento,
  actualizarEvento,
  eliminarEvento,
} from './googleCalendar.service.js';

const turnoConRelaciones = (id) =>
  prisma.appointment.findUnique({
    where: { id },
    include: {
      professionalService: {
        include: {
          professional: { include: { person: true } },
          service: true,
        },
      },
      patient: { include: { person: true } },
    },
  });

  
const calendarIdDe = (turno) =>
  turno.professionalService?.professional?.googleCalendarId || DEFAULT_CALENDAR_ID;


export const sincronizarTurno = async (appointmentId) => {
  if (!googleHabilitado) {
    return { ok: false, error: 'La integración con Google Calendar no está configurada' };
  }

  try {
    const turno = await turnoConRelaciones(appointmentId);
    if (!turno) return { ok: false, error: 'Turno no encontrado' };

    const calendarId = calendarIdDe(turno);

    if (turno.status === 'CANCELLED') {
      if (turno.googleEventId) {
        await eliminarEvento(calendarId, turno.googleEventId);
      }
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { googleEventId: null, googleSyncStatus: 'SYNCHRONIZED' },
      });
      return { ok: true };
    }

    const evento = construirEvento(turno);

    if (turno.googleEventId) {
      await actualizarEvento(calendarId, turno.googleEventId, evento);
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { googleSyncStatus: 'SYNCHRONIZED' },
      });
    } else {
      const eventId = await crearEvento(calendarId, evento);
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { googleEventId: eventId, googleSyncStatus: 'SYNCHRONIZED' },
      });
    }

    return { ok: true };
  } catch (error) {
    const detalle = error?.response?.data?.error?.message || error?.message || String(error);
    console.error(
      `🔴 Error sincronizando turno ${appointmentId} con Google Calendar:`,
      detalle
    );
    try {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { googleSyncStatus: 'FAILED' },
      });
    } catch {
      /* si ni siquiera se puede marcar FAILED, lo agarra el cron de reintentos */
    }
    return { ok: false, error: detalle };
  }
};

export const sincronizarTurnoAsync = (appointmentId) => {
  sincronizarTurno(appointmentId).catch(() => {});
};


export const reintentarPendientes = async () => {
  if (!googleHabilitado) return { intentados: 0, ok: 0 };

  const inicioDeHoy = new Date();
  inicioDeHoy.setHours(0, 0, 0, 0);

  const pendientes = await prisma.appointment.findMany({
    where: {
      googleSyncStatus: { in: ['PENDING', 'FAILED'] },
      startsAt: { gte: inicioDeHoy },
    },
    select: { id: true },
    take: 100,
  });

  let ok = 0;
  let ultimoError = null;
  for (const { id } of pendientes) {
    const r = await sincronizarTurno(id);
    if (r?.ok) ok += 1;
    else if (r?.error) ultimoError = r.error;
  }
  
  return { intentados: pendientes.length, ok, ...(ultimoError && { ultimoError }) };
};
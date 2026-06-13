import calendar, { CALENDAR_TZ } from '../config/google.js';

const ESTADO_LABEL = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'No asistió',
};

const pad = (n) => String(n).padStart(2, '0');


const aHoraLocal = (d) => {
  const x = new Date(d);
  return (
    `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}` +
    `T${pad(x.getUTCHours())}:${pad(x.getUTCMinutes())}:${pad(x.getUTCSeconds())}`
  );
};


export const construirEvento = (turno) => {
  const paciente = turno.patient?.person?.name || 'Paciente';
  const servicio = turno.professionalService?.service?.name || 'Servicio';
  const profesional = turno.professionalService?.professional?.person?.name || '';
  const tel = turno.patient?.person?.phone || '';
  const email = turno.patient?.person?.email || '';
  const estado = ESTADO_LABEL[turno.status] || turno.status;

  const descripcion = [
    `Servicio: ${servicio}`,
    profesional && `Profesional: ${profesional}`,
    `Estado: ${estado}`,
    tel && `Tel: ${tel}`,
    email && `Email: ${email}`,
    turno.notes && `Notas: ${turno.notes}`,
    '',
    `(Sincronizado automáticamente desde Espacio Senda · turno ${turno.id})`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    summary: `${paciente} · ${servicio}`,
    description: descripcion,
   
    
    start: { dateTime: aHoraLocal(turno.startsAt), timeZone: CALENDAR_TZ },
    end: { dateTime: aHoraLocal(turno.endsAt), timeZone: CALENDAR_TZ },
    
    
    extendedProperties: {
      private: { appointmentId: turno.id, sistema: 'espacio-senda' },
    },
  };
};

export const crearEvento = async (calendarId, evento) => {
  const { data } = await calendar.events.insert({ calendarId, requestBody: evento });
  return data.id; 
};

export const actualizarEvento = async (calendarId, eventId, evento) => {
  await calendar.events.update({ calendarId, eventId, requestBody: evento });
};

export const eliminarEvento = async (calendarId, eventId) => {
  try {
    await calendar.events.delete({ calendarId, eventId });
  } catch (err) {
    const code = err?.response?.status || err?.code;
    if (code !== 404 && code !== 410) throw err;
  }
};
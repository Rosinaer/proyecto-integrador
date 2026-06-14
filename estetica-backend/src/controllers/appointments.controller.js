import prisma from '../config/prisma.js';
import { verificarProfesional, professionalIdDelUsuario, SIN_COINCIDENCIAS } from '../middleware/checkProfessional.js';
import { sincronizarTurnoAsync } from '../services/appointmentSync.service.js';
import { instanteDesdeParedLocal, minutoDelDiaEnZona } from '../utils/tiempo.js';


const toMinutes = (d) => d.getUTCHours() * 60 + d.getUTCMinutes();
const fmtDate = (d) => new Date(d).toISOString().slice(0, 10);
const ESTADOS_OCUPAN = ['PENDING', 'CONFIRMED', 'IN_PROGRESS'];

const ahoraInstante = () => new Date();

function calcularSlots(availability, turnosOcupados, duracionMin, dateStr, ahora) {
  const availabilityStart = toMinutes(availability.startTime);
  const availabilityEnd = toMinutes(availability.endTime);
 
  const bloques = turnosOcupados.map((t) => ({
    inicio: minutoDelDiaEnZona(t.startsAt),
    fin: minutoDelDiaEnZona(t.endsAt),
  }));

  
  const slots = [];
  let cursor = availabilityStart;
 
  while (cursor + duracionMin <= availabilityEnd) {
    const conflicto = bloques.find((b) => b.inicio < cursor + duracionMin && b.fin > cursor);
    if (conflicto) {
      cursor = conflicto.fin;
    } else {
      const hh = Math.floor(cursor / 60).toString().padStart(2, '0');
      const mm = (cursor % 60).toString().padStart(2, '0');
      const slotDate = instanteDesdeParedLocal(dateStr, `${hh}:${mm}`);
      if (slotDate > ahora) {
        slots.push({
          startsAt: slotDate,
          endsAt: new Date(slotDate.getTime() + duracionMin * 60000),
          availabilityId: availability.id,
        });
      }
      cursor += duracionMin;
    }
  }
  return slots;
}

async function reservarMultiplesServicios(professionalId, serviceIds) {
  const rows = await prisma.professionalService.findMany({
    where: { professionalId, serviceId: { in: serviceIds }, active: true },
  });
  if (rows.length !== serviceIds.length) return null;
 
  const duracionTotal = rows.reduce((acc, r) => acc + r.durationMinutes, 0);
  const precioTotal = rows.reduce((acc, r) => acc + Number(r.price), 0);
  return { rows, duracionTotal, precioTotal };
}

function parseServiceIds(query) {
  if (query.serviceIds) return query.serviceIds.split(',').map((s) => s.trim()).filter(Boolean);
  if (query.serviceId) return [query.serviceId];
  return [];
}

async function primerTurnoDisponible(professionalId, duracionMin, fromStr, windowDays = 28) {
  const desde = new Date(`${fromStr}T00:00:00Z`);
  const hasta = new Date(desde.getTime() + windowDays * 24 * 60 * 60000);
 
  const avs = await prisma.availability.findMany({
    where: { professionalId, active: true, date: { gte: desde, lte: hasta } },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });
  if (!avs.length) return null;
 
  const appts = await prisma.appointment.findMany({
    where: { availabilityId: { in: avs.map((a) => a.id) }, status: { in: ESTADOS_OCUPAN } },
  });
  const porAvail = {};
  for (const a of appts) (porAvail[a.availabilityId] ||= []).push(a);
 
  const ahora = ahoraInstante();
  for (const av of avs) {
    const slots = calcularSlots(av, porAvail[av.id] || [], duracionMin, fmtDate(av.date), ahora);
    if (slots.length) return slots[0];
  }
  return null;
}


export const obtenerHorariosDisponibles = async (req, res) => {
  try {
    const { professionalId, date } = req.query;
    const serviceIds = parseServiceIds(req.query);
 
    if (!professionalId || !serviceIds.length || !date) {
      return res.status(400).json({
        mensaje: 'professionalId, serviceId(s) y date son obligatorios',
      });
    }
 
    const resueltos = await reservarMultiplesServicios(professionalId, serviceIds);
    if (!resueltos) {
      return res.status(404).json({
        mensaje: 'El profesional no ofrece alguno de los servicios solicitados',
      });
    }
    const { duracionTotal, precioTotal } = resueltos;
 
     const availability = await prisma.availability.findFirst({
      where: { professionalId, date: new Date(date), active: true },
    });
    if (!availability) {
      return res.status(404).json({
        mensaje: 'El profesional no tiene disponibilidad para esa fecha',
      });
    }
 
    const turnosOcupados = await prisma.appointment.findMany({
      where: { availabilityId: availability.id, status: { in: ESTADOS_OCUPAN } },
      orderBy: { startsAt: 'asc' },
    });
 
    const slots = calcularSlots(availability, turnosOcupados, duracionTotal, date, ahoraInstante());
 
    res.json({
      date,
      professionalId,
      serviceIds,
      durationMinutes: duracionTotal,
      totalPrice: precioTotal,
      availabilityId: availability.id,
      slots,
    });
  } catch (error) {
    console.error('Error en obtenerHorariosDisponibles:', error);
    res.status(500).json({ error: 'Error interno del servidor al calcular horarios' });
  }
};
 

export const obtenerDiasDisponibles = async (req, res) => {
  try {
    const { professionalId, year, month } = req.query;
    const serviceIds = parseServiceIds(req.query);
 
    if (!professionalId || !serviceIds.length || !year || !month) {
      return res.status(400).json({
        mensaje: 'professionalId, serviceId(s), year y month son obligatorios',
      });
    }
 
    const resueltos = await reservarMultiplesServicios(professionalId, serviceIds);
    if (!resueltos) {
      return res.status(404).json({ mensaje: 'El profesional no ofrece alguno de los servicios' });
    }
    const { duracionTotal } = resueltos;
 
    const y = Number(year);
    const m = Number(month);
    const inicio = new Date(Date.UTC(y, m - 1, 1));
    const fin = new Date(Date.UTC(y, m, 0)); // último día del mes
 
    const avs = await prisma.availability.findMany({
      where: { professionalId, active: true, date: { gte: inicio, lte: fin } },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
 
    const appts = avs.length
      ? await prisma.appointment.findMany({
          where: { availabilityId: { in: avs.map((a) => a.id) }, status: { in: ESTADOS_OCUPAN } },
        })
      : [];
    const porAvail = {};
    for (const a of appts) (porAvail[a.availabilityId] ||= []).push(a);
 
    const ahora = ahoraInstante();
    const dias = new Set();
    for (const av of avs) {
      const fecha = fmtDate(av.date);
      const slots = calcularSlots(av, porAvail[av.id] || [], duracionTotal, fecha, ahora);
      if (slots.length) dias.add(fecha);
    }
 
    res.json({ year: y, month: m, durationMinutes: duracionTotal, days: [...dias] });
  } catch (error) {
    console.error('Error en obtenerDiasDisponibles:', error);
    res.status(500).json({ error: 'Error interno del servidor al calcular días' });
  }
};
 

export const obtenerOpcionesPorServicio = async (req, res) => {
  try {
    const { serviceId } = req.query;
    const from = req.query.from || fmtDate(new Date());
 
    if (!serviceId) {
      return res.status(400).json({ mensaje: 'serviceId es obligatorio' });
    }
 
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) {
      return res.status(404).json({ mensaje: 'Servicio no encontrado' });
    }
 
    const ofertas = await prisma.professionalService.findMany({
      where: { serviceId, active: true },
      include: { professional: { include: { person: true } } },
    });
 
    const opciones = await Promise.all(
      ofertas
        .filter((ps) => ps.professional?.active)
        .map(async (ps) => {
          const nextSlot = await primerTurnoDisponible(ps.professionalId, ps.durationMinutes, from);
          return {
            professionalId: ps.professionalId,
            professionalServiceId: ps.id,
            professionalName: ps.professional.person.name,
            specialty: ps.professional.specialty,
            durationMinutes: ps.durationMinutes,
            price: Number(ps.price),
            nextSlot, // null si no tiene turnos en la ventana
          };
        })
    );
 
    
    opciones.sort((a, b) => {
      if (!a.nextSlot && !b.nextSlot) return 0;
      if (!a.nextSlot) return 1;
      if (!b.nextSlot) return -1;
      return new Date(a.nextSlot.startsAt) - new Date(b.nextSlot.startsAt);
    });
 
    res.json({
      serviceId,
      service: {
        name: service.name,
        reminderNote: service.reminderNote,
        requiresPreConsult: service.requiresPreConsult,
      },
      options: opciones,
    });
  } catch (error) {
    console.error('Error en obtenerOpcionesPorServicio:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener opciones' });
  }
};
 

export const obtenerTurnos = async (req, res) => {
  try {
    const { professionalId, patientId, status, desde, hasta, needsReschedule } = req.query;

    const where = {};
    if (professionalId) where.professionalService = { professionalId };

    if (req.user?.role === 'PROFESSIONAL') {
      const miId = await professionalIdDelUsuario(req.user);
      where.professionalService = { professionalId: miId ?? SIN_COINCIDENCIAS };
    }

    if (patientId) where.patientId = patientId;
    if (status) where.status = status;
    if (needsReschedule === 'true')  where.rescheduleRequestedAt = { not: null };
    if (needsReschedule === 'false') where.rescheduleRequestedAt = null;
    if (desde || hasta) {
      where.startsAt = {
        ...(desde && { gte: new Date(desde) }),
        ...(hasta && { lte: new Date(hasta) }),
      };
    }

    const turnos = await prisma.appointment.findMany({
      where,
      include: {
        professionalService: { include: { professional: { include: { person: true } }, service: true } },
        patient: { include: { person: true } },
        availability: true,
        payments: true,
        reminders: true,
      },
      orderBy: needsReschedule === 'true' ? { rescheduleRequestedAt: 'asc' } : { startsAt: 'asc' },
    });

    res.json(turnos);
  } catch (error) {
    console.error('Error en obtenerTurnos:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener los turnos' });
  }
};
 
export const obtenerTurnoPorId = async (req, res) => {
  try {
    const { id } = req.params;
 
    const turno = await prisma.appointment.findUnique({
      where: { id },
      include: {
        professionalService: {
          include: { professional: { include: { person: true } }, service: true },
        },
        patient: { include: { person: true } },
        availability: true,
        payments: true,
        audits: true,
        reminders: true,
      },
    });
 
    if (!turno) {
      return res.status(404).json({ mensaje: 'Turno no encontrado' });
    }
    res.json(turno);
  } catch (error) {
    console.error('Error en obtenerTurnoPorId:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener el turno' });
  }
};

export const crearTurno = async (req, res) => {
  try {
    const { professionalServiceId, professionalServiceIds, availabilityId, patientId, startsAt, notes } = req.body;
 
    const idsServicio = Array.isArray(professionalServiceIds) && professionalServiceIds.length
      ? professionalServiceIds
      : professionalServiceId
        ? [professionalServiceId]
        : [];
 
    if (!idsServicio.length || !availabilityId || !patientId || !startsAt) {
      return res.status(400).json({
        mensaje: 'professionalServiceId(s), availabilityId, patientId y startsAt son obligatorios',
      });
    }
 

    const psRows = await prisma.professionalService.findMany({
      where: { id: { in: idsServicio } },
    });
    if (psRows.length !== idsServicio.length) {
      return res.status(404).json({ mensaje: 'Algún servicio del profesional no fue encontrado' });
    }
    const psPorId = Object.fromEntries(psRows.map((r) => [r.id, r]));
    const serviciosOrdenados = idsServicio.map((id) => psPorId[id]);
 
    // Multi-servicio sólo tiene sentido dentro de un mismo profesional.
    const profIds = new Set(serviciosOrdenados.map((s) => s.professionalId));
    if (profIds.size > 1) {
      return res.status(400).json({
        mensaje: 'Todos los servicios deben ser del mismo profesional para agendarlos juntos',
      });
    }

    
    if (!await verificarProfesional(serviciosOrdenados[0].professionalId, req.user)) {
      return res.status(403).json({ mensaje: 'Solo podés agendar en tu propia agenda' });
    }
 
    const availability = await prisma.availability.findUnique({ where: { id: availabilityId } });
    if (!availability || !availability.active) {
      return res.status(404).json({ mensaje: 'Disponibilidad no encontrada o inactiva' });
    }
 
    const paciente = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!paciente) {
      return res.status(404).json({ mensaje: 'Paciente no encontrado' });
    }
 
    const start = new Date(startsAt);
    let cursor = new Date(start);
    const tramos = serviciosOrdenados.map((ps) => {
      const tramoInicio = new Date(cursor);
      const tramoFin = new Date(cursor.getTime() + ps.durationMinutes * 60000);
      cursor = tramoFin;
      return { ps, startsAt: tramoInicio, endsAt: tramoFin };
    });
    const bloqueFin = cursor; 
    
    const conflicto = await prisma.appointment.findFirst({
      where: {
        availabilityId,
        status: { in: ESTADOS_OCUPAN },
        AND: [{ startsAt: { lt: bloqueFin } }, { endsAt: { gt: start } }],
      },
    });
    if (conflicto) {
      return res.status(409).json({ mensaje: 'El horario solicitado se superpone con un turno existente' });
    }
 
    const esGrupo = tramos.length > 1;
 
    const creados = await prisma.$transaction(async (tx) => {
      const out = [];
      for (let i = 0; i < tramos.length; i++) {
        const { ps, startsAt: s, endsAt: e } = tramos[i];
        const turno = await tx.appointment.create({
          data: {
            professionalServiceId: ps.id,
            availabilityId,
            patientId,
            createdByUserId: req.user.id,
            startsAt: s,
            endsAt: e,
            priceSnapshot: ps.price,
            notes: i === 0 ? notes || null : null, 
          },
          include: {
            professionalService: {
              include: { professional: { include: { person: true } }, service: true },
            },
            patient: { include: { person: true } },
          },
        });
 
        await tx.appointmentAudit.create({
          data: {
            appointmentId: turno.id,
            action: 'CREATE',
            prevStatus: null,
            newStatus: 'PENDING',
            performedBy: req.user.id,
          },
        });
 
        out.push(turno);
      }
      return out;
    });
 
    creados.forEach((t) => sincronizarTurnoAsync(t.id));

    res.status(201).json(esGrupo ? { appointments: creados } : creados[0]);
  } catch (error) {
    console.error('Error en crearTurno:', error);
    res.status(500).json({ error: 'Error interno del servidor al crear el turno' });
  }
};


export const crearSobreturno = async (req, res) => {
  try {
    const { professionalServiceId, professionalServiceIds, patientId, startsAt, notes } = req.body;

    const idsServicio = Array.isArray(professionalServiceIds) && professionalServiceIds.length
      ? professionalServiceIds
      : professionalServiceId
        ? [professionalServiceId]
        : [];

    if (!idsServicio.length || !patientId || !startsAt) {
      return res.status(400).json({
        mensaje: 'professionalServiceId(s), patientId y startsAt son obligatorios',
      });
    }

    
    const psRows = await prisma.professionalService.findMany({
      where: { id: { in: idsServicio } },
    });
    if (psRows.length !== idsServicio.length) {
      return res.status(404).json({ mensaje: 'Algún servicio del profesional no fue encontrado' });
    }
    const psPorId = Object.fromEntries(psRows.map((r) => [r.id, r]));
    const serviciosOrdenados = idsServicio.map((id) => psPorId[id]);

    
    const profIds = new Set(serviciosOrdenados.map((s) => s.professionalId));
    if (profIds.size > 1) {
      return res.status(400).json({
        mensaje: 'Todos los servicios deben ser del mismo profesional para agendarlos juntos',
      });
    }

    
    if (!await verificarProfesional(serviciosOrdenados[0].professionalId, req.user)) {
      return res.status(403).json({ mensaje: 'Solo podés agendar en tu propia agenda' });
    }

    const paciente = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!paciente) {
      return res.status(404).json({ mensaje: 'Paciente no encontrado' });
    }

   
    const start = new Date(startsAt);
    let cursor = new Date(start);
    const tramos = serviciosOrdenados.map((ps) => {
      const tramoInicio = new Date(cursor);
      const tramoFin = new Date(cursor.getTime() + ps.durationMinutes * 60000);
      cursor = tramoFin;
      return { ps, startsAt: tramoInicio, endsAt: tramoFin };
    });

    const esGrupo = tramos.length > 1;

    const creados = await prisma.$transaction(async (tx) => {
      const out = [];
      for (let i = 0; i < tramos.length; i++) {
        const { ps, startsAt: s, endsAt: e } = tramos[i];
        const turno = await tx.appointment.create({
          data: {
            professionalServiceId: ps.id,
            availabilityId: null,   // sobreturno: sin agenda
            isOverbook: true,
            patientId,
            createdByUserId: req.user.id,
            startsAt: s,
            endsAt: e,
            priceSnapshot: ps.price,
            notes: i === 0 ? notes || null : null,
          },
          include: {
            professionalService: {
              include: { professional: { include: { person: true } }, service: true },
            },
            patient: { include: { person: true } },
          },
        });

        await tx.appointmentAudit.create({
          data: {
            appointmentId: turno.id,
            action: 'CREATE',
            prevStatus: null,
            newStatus: 'PENDING',
            performedBy: req.user.id,
          },
        });

        out.push(turno);
      }
      return out;
    });

    creados.forEach((t) => sincronizarTurnoAsync(t.id));

    res.status(201).json(esGrupo ? { appointments: creados } : creados[0]);
  } catch (error) {
    console.error('Error en crearSobreturno:', error);
    res.status(500).json({ error: 'Error interno del servidor al crear el sobreturno' });
  }
};
 
export const cambiarEstadoTurno = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
 
    if (!status) {
      return res.status(400).json({ mensaje: 'status es obligatorio' });
    }
 
    const turno = await prisma.appointment.findUnique({
      where: { id },
      include: { professionalService: { select: { professionalId: true } } },
    });
    if (!turno) {
      return res.status(404).json({ mensaje: 'Turno no encontrado' });
    }


    if (!await verificarProfesional(turno.professionalService.professionalId, req.user)) {
      return res.status(403).json({ mensaje: 'Solo podés gestionar turnos propios' });
    }


    const ESTADOS_VALIDOS = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
    if (!ESTADOS_VALIDOS.includes(status)) {
      return res.status(400).json({
        mensaje: `Estado inválido: ${status}`,
        estadosValidos: ESTADOS_VALIDOS,
      });
    }
 
    const resultado = await prisma.$transaction(async (tx) => {
      const turnoActualizado = await tx.appointment.update({
        where: { id },
        data: { status, ...(status === 'CANCELLED' ? { rescheduleRequestedAt: null } : {}) },
      });
      await tx.appointmentAudit.create({
        data: {
          appointmentId: id,
          action: status === 'CANCELLED' ? 'CANCEL' : 'UPDATE',
          prevStatus: turno.status,
          newStatus: status,
          performedBy: req.user.id,
        },
      });
      return turnoActualizado;
    });
 
    sincronizarTurnoAsync(id);

    res.json(resultado);
  } catch (error) {
    console.error('Error en cambiarEstadoTurno:', error);
    res.status(500).json({ error: 'Error interno del servidor al actualizar el estado' });
  }
};


export const reprogramarTurno = async (req, res) => {
  try {
    const { id } = req.params;
    const { availabilityId, startsAt } = req.body;

    if (!availabilityId || !startsAt) {
      return res.status(400).json({ mensaje: 'availabilityId y startsAt son obligatorios' });
    }

    const turno = await prisma.appointment.findUnique({
      where: { id },
      include: { professionalService: true },
    });
    if (!turno) return res.status(404).json({ mensaje: 'Turno no encontrado' });


    if (!await verificarProfesional(turno.professionalService.professionalId, req.user)) {
      return res.status(403).json({ mensaje: 'Solo podés reprogramar turnos propios' });
    }

    const availability = await prisma.availability.findUnique({ where: { id: availabilityId } });
    if (!availability || !availability.active) {
      return res.status(404).json({ mensaje: 'Disponibilidad no encontrada o inactiva' });
    }
    if (availability.professionalId !== turno.professionalService.professionalId) {
      return res.status(400).json({ mensaje: 'La disponibilidad no corresponde al profesional del turno' });
    }

    const start = new Date(startsAt);
    const end = new Date(start.getTime() + turno.professionalService.durationMinutes * 60000);


    const conflicto = await prisma.appointment.findFirst({
      where: {
        id: { not: id },
        availabilityId,
        status: { in: ESTADOS_OCUPAN },
        AND: [{ startsAt: { lt: end } }, { endsAt: { gt: start } }],
      },
    });
    if (conflicto) {
      return res.status(409).json({ mensaje: 'El nuevo horario se superpone con un turno existente' });
    }

    const actualizado = await prisma.$transaction(async (tx) => {
      const t = await tx.appointment.update({
        where: { id },
        data: { availabilityId, startsAt: start, endsAt: end, rescheduleRequestedAt: null },
        include: {
          professionalService: { include: { professional: { include: { person: true } }, service: true } },
          patient: { include: { person: true } },
        },
      });
      await tx.appointmentAudit.create({
        data: {
          appointmentId: id,
          action: 'RESCHEDULE',
          prevStatus: turno.status,
          newStatus: turno.status,
          performedBy: req.user.id,
        },
      });
      return t;
    });

    sincronizarTurnoAsync(id);

    res.json(actualizado);
  } catch (error) {
    console.error('Error en reprogramarTurno:', error);
    res.status(500).json({ error: 'Error interno del servidor al reprogramar el turno' });
  }
};
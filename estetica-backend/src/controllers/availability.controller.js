import { PrismaClient } from '@prisma/client';
import { verificarProfesional } from '../middleware/checkProfessional.js';

const prisma = new PrismaClient();

export const generarDisponibilidad = async (req, res) => {
  try {
    const { id } = req.params;
    const { year, month } = req.body;

    if (!year || !month) {
      return res.status(400).json({ mensaje: 'year y month son obligatorios' });
    }

    const profesional = await prisma.professional.findUnique({ where: { id } });
    if (!profesional) {
      return res.status(404).json({ mensaje: 'Profesional no encontrado' });
    }

    const horarios = await prisma.recurringSchedule.findMany({
      where: { professionalId: id, active: true },
    });

    if (horarios.length === 0) {
      return res.status(400).json({ mensaje: 'El profesional no tiene horarios recurrentes activos' });
    }

    const inicioMes = new Date(year, month - 1, 1);
    const finMes    = new Date(year, month, 0);

    const excepciones = await prisma.availabilityException.findMany({
      where: { professionalId: id, exceptionDate: { gte: inicioMes, lte: finMes } },
    });

    const diasBloqueados = new Set(
      excepciones.map((e) => e.exceptionDate.toISOString().slice(0, 10))
    );

    const slotsACrear = [];
    const cursor = new Date(inicioMes);

    while (cursor <= finMes) {
      const diaSemana = cursor.getDay();
      const fechaStr  = cursor.toISOString().slice(0, 10);

      if (!diasBloqueados.has(fechaStr)) {
        const horariosDelDia = horarios.filter((h) => h.dayOfWeek === diaSemana);

        for (const h of horariosDelDia) {
          const existe = await prisma.availability.findFirst({
            where: { professionalId: id, date: new Date(fechaStr) },
          });

          if (!existe) {
            slotsACrear.push({
              professionalId: id,
              date:      new Date(fechaStr),
              startTime: h.startTime,
              endTime:   h.endTime,
            });
          }
        }
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    await prisma.availability.createMany({ data: slotsACrear });

    res.status(201).json({
      mensaje: 'Disponibilidad generada correctamente',
      slotsCreados: slotsACrear.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const revertirDisponibilidad = async (req, res) => {
  try {
    const { id } = req.params;
    const { year, month } = req.body;

    if (!year || !month) {
      return res.status(400).json({ mensaje: 'year y month son obligatorios' });
    }

    const inicioMes = new Date(year, month - 1, 1);
    const finMes    = new Date(year, month, 0);

    // Solo se eliminan los slots SIN ningún turno asociado (de cualquier estado).
    // Un slot con turnos no puede borrarse por la relación con Appointment.
    const resultado = await prisma.availability.deleteMany({
      where: {
        professionalId: id,
        date: { gte: inicioMes, lte: finMes },
        appointments: { none: {} },
      },
    });

    res.json({ mensaje: 'Disponibilidad revertida correctamente', slotsEliminados: resultado.count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const obtenerDisponibilidad = async (req, res) => {
  try {
    const { id } = req.params;
    const { year, month } = req.query;

    const profesional = await prisma.professional.findUnique({ where: { id } });
    if (!profesional) {
      return res.status(404).json({ mensaje: 'Profesional no encontrado' });
    }

    // Si vienen year y month filtra por mes, sino devuelve todo
    let where = { professionalId: id };
    if (year && month) {
      const inicioMes = new Date(year, month - 1, 1);
      const finMes    = new Date(year, month, 0);
      where.date = { gte: inicioMes, lte: finMes };
    }

    const slots = await prisma.availability.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: { appointments: { select: { id: true, status: true } } },
    });

    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const crearSlotManual = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, startTime, endTime } = req.body;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({ mensaje: 'date, startTime y endTime son obligatorios' });
    }

    // Parseamos las horas en UTC (sufijo Z) para que coincidan con cómo se
    // guardan los horarios recurrentes y cómo las lee el frontend. Sin la Z se
    // interpretaban en hora local del servidor y el slot quedaba corrido.
    const start = new Date(`1970-01-01T${startTime}:00Z`);
    const end   = new Date(`1970-01-01T${endTime}:00Z`);

    if (end <= start) {
      return res.status(400).json({ mensaje: 'endTime debe ser posterior a startTime' });
    }

    const profesional = await prisma.professional.findUnique({ where: { id } });
    if (!profesional) {
      return res.status(404).json({ mensaje: 'Profesional no encontrado' });
    }

    if (!await verificarProfesional(id, req.user)) {
      return res.status(403).json({ mensaje: 'Solo podés gestionar tu propia agenda' });
    }

    // Se permiten varios slots por día siempre que NO se superpongan en horario.
    // (Antes se bloqueaba cualquier slot existente en la fecha, lo que impedía
    // cargar un rango posterior que no se pisaba con el ya creado.)
    const slotsDelDia = await prisma.availability.findMany({
      where: { professionalId: id, date: new Date(date) },
    });

    const seSuperpone = slotsDelDia.find((s) => start < s.endTime && end > s.startTime);
    if (seSuperpone) {
      return res.status(409).json({
        mensaje: 'Ese horario se superpone con un slot ya existente en esa fecha. Editá el slot existente o elegí un rango que no se pise.',
        id: seSuperpone.id,
      });
    }

    const slot = await prisma.availability.create({
      data: {
        professionalId: id,
        date:      new Date(date),
        startTime: start,
        endTime:   end,
      },
    });

    res.status(201).json(slot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const actualizarSlot = async (req, res) => {
  try {
    const { availabilityId } = req.params;
    const { startTime, endTime, active } = req.body;

    const slot = await prisma.availability.findUnique({
      where: { id: availabilityId },
      include: { appointments: { select: { id: true } } },
    });
    if (!slot) {
      return res.status(404).json({ mensaje: 'Slot de disponibilidad no encontrado' });
    }

    if (!await verificarProfesional(slot.professionalId, req.user)) {
      return res.status(403).json({ mensaje: 'Solo podés gestionar tu propia agenda' });
    }

    // No se puede modificar el horario de un slot que ya tiene turnos asociados:
    // cambiaría el rango bajo turnos ya reservados.
    if (slot.appointments.length > 0) {
      return res.status(409).json({
        mensaje: 'No se puede modificar un slot que ya tiene turnos asociados. Gestioná los turnos primero.',
      });
    }

    if (startTime && endTime) {
      const start = new Date(`1970-01-01T${startTime}:00Z`);
      const end   = new Date(`1970-01-01T${endTime}:00Z`);
      if (end <= start) {
        return res.status(400).json({ mensaje: 'endTime debe ser posterior a startTime' });
      }
    }

    const slotActualizado = await prisma.availability.update({
      where: { id: availabilityId },
      data: {
        ...(startTime !== undefined && { startTime: new Date(`1970-01-01T${startTime}:00Z`) }),
        ...(endTime   !== undefined && { endTime:   new Date(`1970-01-01T${endTime}:00Z`) }),
        ...(active    !== undefined && { active }),
      },
    });

    res.json(slotActualizado);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ mensaje: 'Slot no encontrado' });
    }
    res.status(500).json({ error: error.message });
  }
};

// ════════════════════════════════════════════════════════════════
// ELIMINAR UN SLOT INDIVIDUAL
// ════════════════════════════════════════════════════════════════
export const eliminarSlot = async (req, res) => {
  try {
    const { availabilityId } = req.params;

    const slot = await prisma.availability.findUnique({
      where: { id: availabilityId },
      include: { appointments: { select: { id: true } } },
    });

    if (!slot) {
      return res.status(404).json({ mensaje: 'Slot de disponibilidad no encontrado' });
    }

    if (!await verificarProfesional(slot.professionalId, req.user)) {
      return res.status(403).json({ mensaje: 'Solo podés gestionar tu propia agenda' });
    }

    // No se puede borrar un slot que tiene turnos asociados (de cualquier estado),
    // porque rompería la relación con Appointment.
    if (slot.appointments.length > 0) {
      return res.status(409).json({
        mensaje: 'No se puede eliminar un slot que tiene turnos asociados. Gestioná los turnos primero.',
      });
    }

    await prisma.availability.delete({ where: { id: availabilityId } });

    res.json({ mensaje: 'Slot eliminado correctamente' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ mensaje: 'Slot no encontrado' });
    }
    res.status(500).json({ error: error.message });
  }
};

const ESTADOS_PEND = ['PENDING', 'CONFIRMED', 'IN_PROGRESS'];

// Archiva un slot (baja lógica) y manda sus turnos pendientes a la bandeja de reprogramación.
export const archivarSlot = async (req, res) => {
  try {
    const { availabilityId } = req.params;

    const slot = await prisma.availability.findUnique({
      where: { id: availabilityId },
      include: { appointments: { select: { id: true, status: true } } },
    });
    if (!slot) return res.status(404).json({ mensaje: 'Slot no encontrado' });

    if (!await verificarProfesional(slot.professionalId, req.user)) {
      return res.status(403).json({ mensaje: 'Solo podés gestionar tu propia agenda' });
    }

    const pendientes = slot.appointments
      .filter((a) => ESTADOS_PEND.includes(a.status))
      .map((a) => a.id);

    const marcados = await prisma.$transaction(async (tx) => {
      await tx.availability.update({ where: { id: availabilityId }, data: { active: false } });
      if (!pendientes.length) return 0;
      const r = await tx.appointment.updateMany({
        where: { id: { in: pendientes }, rescheduleRequestedAt: null },
        data: { rescheduleRequestedAt: new Date() },
      });
      return r.count;
    });

    res.json({ mensaje: 'Slot archivado', turnosAReprogramar: marcados });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Archiva todos los slots con turnos del mes y manda sus pendientes a la bandeja.
// (Los slots libres se eliminan con revertirDisponibilidad; esto es para los que tienen turnos.)
export const archivarMes = async (req, res) => {
  try {
    const { id } = req.params;
    const { year, month } = req.body;
    if (!year || !month) return res.status(400).json({ mensaje: 'year y month son obligatorios' });

    if (!await verificarProfesional(id, req.user)) {
      return res.status(403).json({ mensaje: 'Solo podés gestionar tu propia agenda' });
    }

    const inicioMes = new Date(Date.UTC(year, month - 1, 1));
    const finMes = new Date(Date.UTC(year, month, 0));

    const slots = await prisma.availability.findMany({
      where: { professionalId: id, date: { gte: inicioMes, lte: finMes }, appointments: { some: {} } },
      include: { appointments: { select: { id: true, status: true } } },
    });

    const ids = slots.map((s) => s.id);
    const pendientes = slots.flatMap((s) =>
      s.appointments.filter((a) => ESTADOS_PEND.includes(a.status)).map((a) => a.id));

    const resultado = await prisma.$transaction(async (tx) => {
      let slotsArchivados = 0;
      if (ids.length) {
        const r1 = await tx.availability.updateMany({ where: { id: { in: ids } }, data: { active: false } });
        slotsArchivados = r1.count;
      }
      let marcados = 0;
      if (pendientes.length) {
        const r2 = await tx.appointment.updateMany({
          where: { id: { in: pendientes }, rescheduleRequestedAt: null },
          data: { rescheduleRequestedAt: new Date() },
        });
        marcados = r2.count;
      }
      return { slotsArchivados, marcados };
    });

    res.json({ mensaje: 'Agenda archivada', slotsArchivados: resultado.slotsArchivados, turnosAReprogramar: resultado.marcados });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
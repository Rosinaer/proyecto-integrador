import prisma from '../config/prisma.js';
import { verificarProfesional } from '../middleware/checkProfessional.js';

export const obtenerHorarios = async (req, res) => {
  try {
    const { id } = req.params;

    const profesional = await prisma.professional.findUnique({ where: { id } });
    if (!profesional) {
      return res.status(404).json({ mensaje: 'Profesional no encontrado' });
    }

    const horarios = await prisma.recurringSchedule.findMany({
      where: { professionalId: id },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    res.json(horarios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const crearHorario = async (req, res) => {
  try {
    const { id } = req.params;
    const { dayOfWeek, startTime, endTime } = req.body;

    if (dayOfWeek === undefined || !startTime || !endTime) {
      return res.status(400).json({ mensaje: 'dayOfWeek, startTime y endTime son obligatorios' });
    }

    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({ mensaje: 'dayOfWeek debe ser entre 0 (domingo) y 6 (sábado)' });
    }

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

    const mismosDelDia = await prisma.recurringSchedule.findMany({
      where: { professionalId: id, dayOfWeek: Number(dayOfWeek), active: true },
    });

    const seSuperpone = mismosDelDia.some((h) => start < h.endTime && end > h.startTime);
    if (seSuperpone) {
      return res.status(409).json({
        mensaje: 'El horario se superpone con otro ya existente para ese día de la semana',
      });
    }

    const horario = await prisma.recurringSchedule.create({
      data: {
        professionalId: id,
        dayOfWeek: Number(dayOfWeek),
        startTime: start,
        endTime: end,
      },
    });

    res.status(201).json(horario);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const actualizarHorario = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { dayOfWeek, startTime, endTime, active } = req.body;

    const horario = await prisma.recurringSchedule.findUnique({ where: { id: scheduleId } });
    if (!horario) {
      return res.status(404).json({ mensaje: 'Horario no encontrado' });
    }

    if (!await verificarProfesional(horario.professionalId, req.user)) {
      return res.status(403).json({ mensaje: 'Solo podés gestionar tu propia agenda' });
    }

    if (startTime && endTime) {
      const start = new Date(`1970-01-01T${startTime}:00Z`);
      const end   = new Date(`1970-01-01T${endTime}:00Z`);
      if (end <= start) {
        return res.status(400).json({ mensaje: 'endTime debe ser posterior a startTime' });
      }
    }

    const horarioActualizado = await prisma.recurringSchedule.update({
      where: { id: scheduleId },
      data: {
        ...(dayOfWeek !== undefined && { dayOfWeek: Number(dayOfWeek) }),
        ...(startTime !== undefined && { startTime: new Date(`1970-01-01T${startTime}:00Z`) }),
        ...(endTime   !== undefined && { endTime:   new Date(`1970-01-01T${endTime}:00Z`) }),
        ...(active    !== undefined && { active }),
      },
    });

    res.json(horarioActualizado);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ mensaje: 'Horario no encontrado' });
    }
    res.status(500).json({ error: error.message });
  }
};

export const eliminarHorario = async (req, res) => {
  try {
    const { scheduleId } = req.params;

    const horario = await prisma.recurringSchedule.findUnique({ where: { id: scheduleId } });
    if (!horario) {
      return res.status(404).json({ mensaje: 'Horario no encontrado' });
    }

    if (!await verificarProfesional(horario.professionalId, req.user)) {
      return res.status(403).json({ mensaje: 'Solo podés gestionar tu propia agenda' });
    }

    await prisma.recurringSchedule.delete({ where: { id: scheduleId } });

    res.json({ mensaje: 'Horario eliminado correctamente' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ mensaje: 'Horario no encontrado' });
    }
    res.status(500).json({ error: error.message });
  }
};
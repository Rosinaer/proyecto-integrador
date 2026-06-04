import prisma from '../config/prisma.js';

// ── MOTOR DE CÁLCULO DE HORARIOS DISPONIBLES ─────────────────

export const obtenerHorariosDisponibles = async (req, res) => {
  try {
    const {
      professionalId,
      serviceId,
      date
    } = req.query;

    if (!professionalId || !serviceId || !date) {
      return res.status(400).json({
        mensaje: 'professionalId, serviceId y date son obligatorios'
      });
    }

    const professionalService = await prisma.professionalService.findFirst({
      where: {
        professionalId,
        serviceId
      },
    });

    if (!professionalService) {
      return res.status(404).json({
        mensaje: 'El profesional no ofrece ese servicio'
      });
    }

    const duracionMin = professionalService.durationMinutes;

    const availability = await prisma.availability.findFirst({
      where: {
        professionalId,
        date: new Date(date),
        active: true,
      },
    });

    if (!availability) {
      return res.status(404).json({
        mensaje: 'El profesional no tiene disponibilidad para esa fecha'
      });
    }

    const fechaInicio = new Date(`${date}T00:00:00Z`);
    const fechaFin = new Date(`${date}T23:59:59Z`);

    const turnosExistentes = await prisma.appointment.findMany({
      where: {
        availabilityId: availability.id,
        status: {
          in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS']
        },
        startsAt: {
          gte: fechaInicio,
          lte: fechaFin
        },
      },
      orderBy: {
        startsAt: 'asc'
      },
    });

    const slots = [];
    const ahora = new Date();

    const toMinutes = (d) => d.getUTCHours() * 60 + d.getUTCMinutes();

    const avStartMin = toMinutes(availability.startTime);
    const avEndMin = toMinutes(availability.endTime);

    const bloques = turnosExistentes.map(t => ({
      inicio: toMinutes(t.startsAt),
      fin: toMinutes(t.endsAt),
    }));

    let cursor = avStartMin;

    while (cursor + duracionMin <= avEndMin) {
      const conflicto = bloques.find(b => b.inicio < cursor + duracionMin && b.fin > cursor);

      if (conflicto) {
        cursor = conflicto.fin;
      } else {
        const horas = Math.floor(cursor / 60).toString().padStart(2, '0');
        const minutos = (cursor % 60).toString().padStart(2, '0');
        const slotDate = new Date(`${date}T${horas}:${minutos}:00Z`);

        if (slotDate > ahora) {
          slots.push({
            startsAt: slotDate,
            endsAt: new Date(slotDate.getTime() + duracionMin * 60000),
          });
        }

        cursor += duracionMin;
      }
    }

    res.json({
      date,
      professionalId,
      serviceId,
      durationMinutes: duracionMin,
      availabilityId: availability.id,
      slots,
    });
  } catch (error) {
    console.error("Error en obtenerHorariosDisponibles:", error);
    res.status(500).json({
      error: 'Error interno del servidor al calcular horarios'
    });
  }
};

// ── CRUD DE TURNOS ────────────────────────────────────────────

export const obtenerTurnos = async (req, res) => {
  try {
    const {
      professionalId,
      patientId,
      status,
      desde,
      hasta
    } = req.query;

    const where = {};

    if (professionalId) where.professionalService = {
      professionalId
    };
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;
    if (desde || hasta) {
      where.startsAt = {
        ...(desde && {
          gte: new Date(desde)
        }),
        ...(hasta && {
          lte: new Date(hasta)
        }),
      };
    }

    const turnos = await prisma.appointment.findMany({
      where,
      include: {
        professionalService: {
          include: {
            professional: {
              include: {
                person: true
              }
            },
            service: true,
          },
        },
        patient: {
          include: {
            person: true
          }
        },
        availability: true,
        payments: true,
      },
      orderBy: {
        startsAt: 'asc'
      },
    });

    res.json(turnos);
  } catch (error) {
    console.error("Error en obtenerTurnos:", error);
    res.status(500).json({
      error: 'Error interno del servidor al obtener los turnos'
    });
  }
};

export const obtenerTurnoPorId = async (req, res) => {
  try {
    const {
      id
    } = req.params;

    const turno = await prisma.appointment.findUnique({
      where: {
        id
      },
      include: {
        professionalService: {
          include: {
            professional: {
              include: {
                person: true
              }
            },
            service: true,
          },
        },
        patient: {
          include: {
            person: true
          }
        },
        availability: true,
        payments: true,
        audits: true,
      },
    });

    if (!turno) {
      return res.status(404).json({
        mensaje: 'Turno no encontrado'
      });
    }

    res.json(turno);
  } catch (error) {
    console.error("Error en obtenerTurnoPorId:", error);
    res.status(500).json({
      error: 'Error interno del servidor al obtener el turno'
    });
  }
};

export const crearTurno = async (req, res) => {
  try {
    const {
      professionalServiceId,
      availabilityId,
      patientId,
      startsAt,
      notes
    } = req.body;

    if (!professionalServiceId || !availabilityId || !patientId || !startsAt) {
      return res.status(400).json({
        mensaje: 'professionalServiceId, availabilityId, patientId y startsAt son obligatorios',
      });
    }

    const professionalService = await prisma.professionalService.findUnique({
      where: {
        id: professionalServiceId
      },
    });
    if (!professionalService) {
      return res.status(404).json({
        mensaje: 'Servicio del profesional no encontrado'
      });
    }

    const availability = await prisma.availability.findUnique({
      where: {
        id: availabilityId
      },
    });
    if (!availability || !availability.active) {
      return res.status(404).json({
        mensaje: 'Disponibilidad no encontrada o inactiva'
      });
    }

    const start = new Date(startsAt);
    const endsAt = new Date(start.getTime() + professionalService.durationMinutes * 60000);

    const conflicto = await prisma.appointment.findFirst({
      where: {
        availabilityId,
        status: {
          in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS']
        },
        AND: [{
            startsAt: {
              lt: endsAt
            }
          },
          {
            endsAt: {
              gt: start
            }
          },
        ],
      },
    });
    if (conflicto) {
      return res.status(409).json({
        mensaje: 'El horario solicitado se superpone con un turno existente'
      });
    }

    const paciente = await prisma.patient.findUnique({
      where: {
        id: patientId
      }
    });
    if (!paciente) {
      return res.status(404).json({
        mensaje: 'Paciente no encontrado'
      });
    }

    const turno = await prisma.$transaction(async (tx) => {
      const nuevoTurno = await tx.appointment.create({
        data: {
          professionalServiceId,
          availabilityId,
          patientId,
          createdByUserId: req.user.id, // 🔥 Corregido a req.user.id
          startsAt: start,
          endsAt,
          priceSnapshot: professionalService.price,
          notes: notes || null,
        },
        include: {
          professionalService: {
            include: {
              professional: {
                include: {
                  person: true
                }
              },
              service: true,
            },
          },
          patient: {
            include: {
              person: true
            }
          },
        },
      });

      await tx.appointmentAudit.create({
        data: {
          appointmentId: nuevoTurno.id,
          action: 'CREATE',
          prevStatus: null,
          newStatus: 'PENDING',
          performedBy: req.user.id, // 🔥 Corregido a req.user.id
        },
      });

      return nuevoTurno;
    });

    res.status(201).json(turno);
  } catch (error) {
    console.error("Error en crearTurno:", error);
    res.status(500).json({
      error: 'Error interno del servidor al crear el turno'
    });
  }
};

export const cambiarEstadoTurno = async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const {
      status
    } = req.body;

    if (!status) {
      return res.status(400).json({
        mensaje: 'status es obligatorio'
      });
    }

    const turno = await prisma.appointment.findUnique({
      where: {
        id
      }
    });
    if (!turno) {
      return res.status(404).json({
        mensaje: 'Turno no encontrado'
      });
    }

    const transicionesValidas = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['COMPLETED', 'CANCELLED', 'NO_SHOW', 'IN_PROGRESS'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
      NO_SHOW: [],
    };

    const permitidos = transicionesValidas[turno.status] || [];
    if (!permitidos.includes(status)) {
      return res.status(400).json({
        mensaje: `Transición inválida: no se puede pasar de ${turno.status} a ${status}`,
        transicionesPermitidas: permitidos,
      });
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const turnoActualizado = await tx.appointment.update({
        where: {
          id
        },
        data: {
          status
        },
      });

      await tx.appointmentAudit.create({
        data: {
          appointmentId: id,
          action: status === 'CANCELLED' ? 'CANCEL' : 'UPDATE',
          prevStatus: turno.status,
          newStatus: status,
          performedBy: req.user.id, // 🔥 Corregido a req.user.id
        },
      });

      return turnoActualizado;
    });

    res.json(resultado);
  } catch (error) {
    console.error("Error en cambiarEstadoTurno:", error);
    res.status(500).json({
      error: 'Error interno del servidor al actualizar el estado'
    });
  }
};
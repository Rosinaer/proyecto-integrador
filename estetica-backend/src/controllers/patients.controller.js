import prisma from '../config/prisma.js';

export const obtenerPacientes = async (req, res) => {
  try {
    const { search } = req.query;

    const pacientes = await prisma.patient.findMany({
      where: search
        ? {
            person: {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
              ],
            },
          }
        : undefined,
      include: { person: true },
      orderBy: { person: { name: "asc" } },
    });

    res.json(pacientes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const obtenerPacientePorId = async (req, res) => {
  try {
    const { id } = req.params;

    const paciente = await prisma.patient.findUnique({
      where: { id },
      include: { person: true },
    });

    if (!paciente) {
      return res.status(404).json({ mensaje: "Paciente no encontrado" });
    }

    res.json(paciente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const crearPaciente = async (req, res) => {
  try {
    const { name, documentType, document, email, phone, cuilCuit, clinicalNotes } = req.body;

    if (!name || !documentType || !document || !email || !phone) {
      return res.status(400).json({
        mensaje: "name, documentType, document, email y phone son obligatorios",
      });
    }

    const documentTypesValidos = ["DNI", "PASSPORT", "CUIL", "CUIT"];
    if (!documentTypesValidos.includes(documentType)) {
      return res.status(400).json({
        mensaje: `documentType debe ser uno de: ${documentTypesValidos.join(", ")}`,
      });
    }

    const personaExistente = await prisma.people.findUnique({
      where: { email },
    });

    if (personaExistente) {
      const pacienteExistente = await prisma.patient.findUnique({
        where: { peopleId: personaExistente.id },
      });

      if (pacienteExistente) {
        return res.status(409).json({
          mensaje: "Ya existe un paciente registrado con ese email",
        });
      }

      const paciente = await prisma.patient.create({
        data: {
          peopleId: personaExistente.id,
          cuilCuit: cuilCuit ?? "",
          clinicalNotes: clinicalNotes ?? "",
        },
        include: { person: true },
      });

      return res.status(201).json(paciente);
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const persona = await tx.people.create({
        data: { name, documentType, document, email, phone },
      });

      const paciente = await tx.patient.create({
        data: {
          peopleId: persona.id,
          cuilCuit: cuilCuit ?? "",
          clinicalNotes: clinicalNotes || null,
        },
        include: { person: true },
      });

      return paciente;
    });

    res.status(201).json(resultado);
  } catch (error) {
    if (error.code === "P2002") {
      return res
        .status(409)
        .json({ mensaje: "Ya existe una persona con ese email" });
    }
    res.status(500).json({ error: error.message });
  }
};

export const actualizarPaciente = async (req, res) => {
  try {
    const { id } = req.params;
    const { cuilCuit, name, phone, document, documentType, clinicalNotes } = req.body;

    const paciente = await prisma.patient.findUnique({
      where: { id },
    });

    if (!paciente) {
      return res.status(404).json({ mensaje: "Paciente no encontrado" });
    }

    if (documentType) {
      const documentTypesValidos = ["DNI", "PASSPORT", "CUIL", "CUIT"];
      if (!documentTypesValidos.includes(documentType)) {
        return res.status(400).json({
          mensaje: `documentType debe ser uno de: ${documentTypesValidos.join(", ")}`,
        });
      }
    }

    const actualizado = await prisma.$transaction(async (tx) => {
      if (
        name !== undefined ||
        phone !== undefined ||
        document !== undefined ||
        documentType !== undefined
      ) {
        await tx.people.update({
          where: { id: paciente.peopleId },
          data: {
            ...(name !== undefined && { name }),
            ...(phone !== undefined && { phone }),
            ...(document !== undefined && { document }),
            ...(documentType !== undefined && { documentType }),
          },
        });
      }

      if (cuilCuit !== undefined  || clinicalNotes !== undefined) {
        await tx.patient.update({
          where: { id },
          data: {
            ...(cuilCuit !== undefined && { cuilCuit }),
            ...(clinicalNotes !== undefined && { clinicalNotes }),
          },
        });
      }

      return tx.patient.findUnique({
        where: { id },
        include: { person: true },
      });
    });

    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const obtenerHistorialTurnos = async (req, res) => {
  try {
    const { id } = req.params;

    const paciente = await prisma.patient.findUnique({ where: { id } });
    if (!paciente) {
      return res.status(404).json({ mensaje: "Paciente no encontrado" });
    }

    const turnos = await prisma.appointment.findMany({
      where: { patientId: id },
      include: {
        professionalService: {
          include: {
            professional: { include: { person: true } },
            service: { include: { category: true } },
          },
        },
        availability: true,
        payments: true,
      },
      orderBy: { startsAt: "desc" },
    });

    res.json(turnos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const obtenerHistorialPagos = async (req, res) => {
  try {
    const { id } = req.params;

    const paciente = await prisma.patient.findUnique({ where: { id } });
    if (!paciente) {
      return res.status(404).json({ mensaje: "Paciente no encontrado" });
    }

    const pagos = await prisma.payment.findMany({
      where: { appointment: { patientId: id } },
      include: {
        appointment: {
          include: {
            professionalService: {
              include: {
                service: true,
                professional: { include: { person: true } },
              },
            },
          },
        },
      },
      orderBy: { paidAt: "desc" },
    });

    res.json(pagos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

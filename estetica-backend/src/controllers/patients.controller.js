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
    const { name, documentType, document, email, phone, cuilCuit, clinicalNotes, confirmLink } = req.body;

    if (!name || !documentType || !document || !email || !phone) {
      return res.status(400).json({
        mensaje: "name, documentType, document, email y phone son obligatorios",
      });
    }

    const documentTypesValidos = ["DNI", "PASSPORT", "OTHER"];
    if (!documentTypesValidos.includes(documentType)) {
      return res.status(400).json({
        mensaje: `documentType debe ser uno de: ${documentTypesValidos.join(", ")}`,
      });
    }

    // La identidad es el documento (tipo + número). Buscamos si ya existe la
    // persona para no duplicarla.
    const personaExistente = await prisma.people.findFirst({
      where: { documentType, document },
      include: { patient: true, professional: true, user: true },
    });

    if (personaExistente) {
      if (personaExistente.patient) {
        return res.status(409).json({
          mensaje: "Ya existe un paciente con ese tipo y número de documento",
        });
      }

      // La persona existe (ej. ya es profesional/usuario) pero no es paciente.
      // No la asociamos en silencio: pedimos confirmación explícita.
      if (!confirmLink) {
        return res.status(409).json({
          needsConfirmation: true,
          mensaje: `Ya existe una persona con ese documento: ${personaExistente.name}. ¿Querés registrarla también como paciente?`,
          person: {
            id: personaExistente.id,
            name: personaExistente.name,
            email: personaExistente.email,
            documentType: personaExistente.documentType,
            document: personaExistente.document,
            isProfessional: !!personaExistente.professional,
            isUser: !!personaExistente.user,
          },
        });
      }

      // Confirmado: asociamos el paciente a la persona existente (y completamos
      // cuilCuit en people si se cargó).
      const paciente = await prisma.$transaction(async (tx) => {
        if (cuilCuit !== undefined && cuilCuit !== "") {
          await tx.people.update({ where: { id: personaExistente.id }, data: { cuilCuit } });
        }
        return tx.patient.create({
          data: {
            peopleId: personaExistente.id,
            clinicalNotes: clinicalNotes ?? null,
          },
          include: { person: true },
        });
      });

      return res.status(201).json(paciente);
    }

    // Persona nueva: creamos people (con cuilCuit) + patient.
    const resultado = await prisma.$transaction(async (tx) => {
      const persona = await tx.people.create({
        data: { name, documentType, document, email, phone, cuilCuit: cuilCuit ?? "" },
      });

      const paciente = await tx.patient.create({
        data: {
          peopleId: persona.id,
          clinicalNotes: clinicalNotes || null,
        },
        include: { person: true },
      });

      return paciente;
    });

    res.status(201).json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const actualizarPaciente = async (req, res) => {
  try {
    const { id } = req.params;
    const { cuilCuit, name, phone, document, documentType, email, clinicalNotes } = req.body;

    const paciente = await prisma.patient.findUnique({
      where: { id },
    });

    if (!paciente) {
      return res.status(404).json({ mensaje: "Paciente no encontrado" });
    }

    if (documentType) {
      const documentTypesValidos = ["DNI", "PASSPORT", "OTHER"];
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
        documentType !== undefined ||
        email !== undefined ||
        cuilCuit !== undefined
      ) {
        await tx.people.update({
          where: { id: paciente.peopleId },
          data: {
            ...(name !== undefined && { name }),
            ...(phone !== undefined && { phone }),
            ...(document !== undefined && { document }),
            ...(documentType !== undefined && { documentType }),
            ...(email !== undefined && { email }),
            ...(cuilCuit !== undefined && { cuilCuit }),
          },
        });
      }

      if (clinicalNotes !== undefined) {
        await tx.patient.update({
          where: { id },
          data: { clinicalNotes },
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
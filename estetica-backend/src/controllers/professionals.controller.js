import bcrypt from 'bcrypt';
import prisma from '../config/prisma.js';
import {
  verificarProfesional
} from '../middleware/checkProfessional.js';


export const obtenerProfesionales = async (req, res) => {
  try {
    const profesionales = await prisma.professional.findMany({
      include: {
        person: true
      },
      orderBy: {
        person: {
          name: 'asc'
        }
      },
    });
    res.json(profesionales);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};

export const obtenerProfesionalPorId = async (req, res) => {
  try {
    const {
      id
    } = req.params;

    const profesional = await prisma.professional.findUnique({
      where: {
        id
      },
      include: {
        person: true,
        services: {
          include: {
            service: {
              include: {
                category: true
              }
            }
          }
        },
        schedules: true,
      },
    });

    if (!profesional) {
      return res.status(404).json({
        mensaje: 'Profesional no encontrado'
      });
    }

    res.json(profesional);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};



export const crearProfesional = async (req, res) => {
  try {
    const {
      name,
      documentType,
      document,
      email,
      phone,
      specialty,
      bio,
      googleCalendarId,
      password,
      cuilCuit,
      confirmLink
    } = req.body;


    if (!name || !documentType || !document || !email || !phone || !specialty) {
      return res.status(400).json({
        mensaje: 'name, documentType, document, email, phone y specialty son obligatorios',
      });
    }

    const documentTypesValidos = ['DNI', 'PASSPORT', 'OTHER'];
    if (!documentTypesValidos.includes(documentType)) {
      return res.status(400).json({
        mensaje: `documentType debe ser uno de: ${documentTypesValidos.join(', ')}`
      });
    }


    const passwordHash = password ? await bcrypt.hash(password, 10) : null;


    const existente = await prisma.people.findFirst({
      where: {
        documentType: documentType || "DNI",
        document,
      },
      include: {
        professional: true,
        patient: true,
        user: true,
      },
    });

    if (existente) {
      // Si ya existe el profesional no se crea
      if (existente.professional) {
        return res.status(409).json({
          mensaje: 'Ya existe un profesional registrado con ese documento'
        });
      }


      if (!confirmLink) {
        return res.status(409).json({
          needsConfirmation: true,
          mensaje: `Ya existe una persona con ese documento: ${existente.name}. ¿Querés registrarla también como profesional?`,
          person: {
            id: existente.id,
            name: existente.name,
            email: existente.email,
            documentType: existente.documentType,
            document: existente.document,
            isPatient: !!existente.patient,
            isUser: !!existente.user,
          },
        });
      }


      const creado = await prisma.$transaction(async (tx) => {
        if (cuilCuit !== undefined && cuilCuit !== "") {
          await tx.people.update({ where: { id: existente.id }, data: { cuilCuit } });
        }

        const prof = await tx.professional.create({
          data: {
            peopleId: existente.id,
            specialty,
            bio: bio ? bio : null,
            googleCalendarId: googleCalendarId ? googleCalendarId : null,
          },
          include: {
            person: true
          },
        });

        if (passwordHash && !existente.user) {
          await tx.user.create({
            data: { peopleId: existente.id, passwordHash, role: 'PROFESSIONAL' },
          });
        }

        return prof;
      });

      return res.status(201).json({
        id: creado.id,
        nombre: creado.person.name,
        email: creado.person.email,
        specialty: creado.specialty,
      });
    }

    const nuevaPersona = await prisma.people.create({
      data: {
        name,
        documentType,
        document,
        email,
        phone,
        cuilCuit: cuilCuit ?? "",
        professional: {
          create: {
            specialty,
            bio: bio ? bio : null,
            googleCalendarId: googleCalendarId ? googleCalendarId : null,
          },
        },

        ...(passwordHash && {
          user: {
            create: {
              passwordHash,
              role: 'PROFESSIONAL'
            },
          },
        }),
      },
      include: {
        professional: true,
        user: true
      },
    });

    res.status(201).json({
      id: nuevaPersona.professional.id,
      nombre: nuevaPersona.name,
      email: nuevaPersona.email,
      specialty: nuevaPersona.professional.specialty,
      rol: nuevaPersona.user?.role ?? null, // null = quedó sin acceso al sistema
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        mensaje: 'Ya existe una persona con ese email o documento'
      });
    }
    res.status(500).json({
      error: error.message
    });
  }
};

export const actualizarProfesional = async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const {
      name,
      phone,
      document,
      documentType,
      specialty,
      bio,
      googleCalendarId,
      active
    } = req.body;

    const profesional = await prisma.professional.findUnique({
      where: {
        id
      }
    });
    if (!profesional) {
      return res.status(404).json({
        mensaje: 'Profesional no encontrado'
      });
    }

    if (!await verificarProfesional(id, req.user)) {
      return res.status(403).json({
        mensaje: 'Solo podés editar tu propio perfil'
      });
    }

    if (req.user.rol === 'PROFESSIONAL' && active !== undefined) {
      return res.status(403).json({
        mensaje: 'No tenés permisos para activar o desactivar un profesional'
      });
    }


    if (documentType) {
      const documentTypesValidos = ['DNI', 'PASSPORT', 'OTHER'];
      if (!documentTypesValidos.includes(documentType)) {
        return res.status(400).json({
          mensaje: `documentType debe ser uno de: ${documentTypesValidos.join(', ')}`
        });
      }
    }

    const actualizado = await prisma.$transaction(async (tx) => {
      if (name !== undefined || phone !== undefined || document !== undefined || documentType !== undefined) {
        await tx.people.update({
          where: {
            id: profesional.peopleId
          },
          data: {
            ...(name !== undefined && {
              name
            }),
            ...(phone !== undefined && {
              phone
            }),
            ...(document !== undefined && {
              document
            }),
            ...(documentType !== undefined && {
              documentType
            }),
          },
        });
      }

      return tx.professional.update({
        where: {
          id
        },
        data: {
          ...(specialty !== undefined && {
            specialty
          }),
          ...(bio !== undefined && {
            bio
          }),
          ...(googleCalendarId !== undefined && {
            googleCalendarId
          }),
          ...(active !== undefined && {
            active
          }),
        },
        include: {
          person: true
        },
      });
    });

    res.json(actualizado);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};
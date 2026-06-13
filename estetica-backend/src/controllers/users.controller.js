import bcrypt from 'bcrypt';
import prisma from '../config/prisma.js';


export const obtenerMiPerfil = async (req, res) => {
  try {
    const usuario = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { person: true },
    });
    if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado" });


    const profesional = await prisma.professional.findUnique({
      where: { peopleId: usuario.peopleId },
      select: { id: true, specialty: true, bio: true, active: true },
    });

    res.json({
      id: usuario.id,
      role: usuario.role,
      active: usuario.active,
      person: {
        name: usuario.person.name,
        email: usuario.person.email,
        phone: usuario.person.phone,
        document: usuario.person.document,
        documentType: usuario.person.documentType,
      },
      professional: profesional || null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const actualizarMiPerfil = async (req, res) => {
  try {
    const { name, email, phone, document, documentType } = req.body;

    if (documentType) {
      const documentTypesValidos = ["DNI", "PASSPORT", "OTHER"];
      if (!documentTypesValidos.includes(documentType)) {
        return res.status(400).json({ mensaje: `documentType debe ser uno de: ${documentTypesValidos.join(", ")}` });
      }
    }

    const usuario = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado" });

    const actualizado = await prisma.people.update({
      where: { id: usuario.peopleId },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(document !== undefined && { document }),
        ...(documentType !== undefined && { documentType }),
      },
    });

    res.json({
      id: usuario.id,
      role: usuario.role,
      person: {
        name: actualizado.name,
        email: actualizado.email,
        phone: actualizado.phone,
        document: actualizado.document,
        documentType: actualizado.documentType,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const obtenerUsuarios = async (req, res) => {
  try {
    const usuarios = await prisma.user.findMany({
      include: {
        person: true
      }
    });

    const usuariosLimpios = usuarios.map(u => ({
      id: u.id,
      nombre: u.person.name,
      email: u.person.email,
      rol: u.role,
      activo: u.active
    }));

    res.json(usuariosLimpios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const obtenerUsuarioPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await prisma.user.findUnique({
      where: { id: String(id) },
      include: { person: true }
    });

    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    
    const profesional = await prisma.professional.findUnique({
      where: { peopleId: usuario.peopleId },
      select: { specialty: true, bio: true },
    });

    res.json({
      id: usuario.id,
      nombre: usuario.person.name,
      email: usuario.person.email,
      rol: usuario.role,
      activo: usuario.active,
      specialty: profesional?.specialty || "",
      bio: profesional?.bio || "",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const crearUsuario = async (req, res) => {
  try {
    const { nombre, email, document, documentType, phone, password, rol, cuilCuit, confirmLink, specialty, bio } = req.body;


    const yaEsUsuario = await prisma.people.findFirst({
      where: { email, user: { isNot: null } }
    });
    if (yaEsUsuario) {
      return res.status(400).json({ mensaje: "El email ya está registrado para un usuario" });
    }

    const hash = await bcrypt.hash(password, 10);
    const esProfesional = rol === 'PROFESSIONAL';

    
    const docReal = document && document.trim() && document.trim() !== "00000000";
    if (docReal) {
      const tipo = documentType || "DNI";
      const existente = await prisma.people.findFirst({
        where: { documentType: tipo, document: document.trim() },
        include: { user: true, patient: true, professional: true },
      });

      if (existente) {
        if (existente.user) {
          return res.status(400).json({ mensaje: "Esa persona ya tiene un usuario asociado" });
        }
        if (!confirmLink) {
          return res.status(409).json({
            needsConfirmation: true,
            mensaje: `Ya existe una persona con ese documento: ${existente.name}. ¿Querés darle acceso (crear su usuario)?`,
            person: {
              id: existente.id,
              name: existente.name,
              email: existente.email,
              documentType: existente.documentType,
              document: existente.document,
              isPatient: !!existente.patient,
              isProfessional: !!existente.professional,
            },
          });
        }

        
        const user = await prisma.$transaction(async (tx) => {
          const u = await tx.user.create({
            data: { peopleId: existente.id, passwordHash: hash, role: rol },
            include: { person: true },
          });
          if (esProfesional && !existente.professional) {
            await tx.professional.create({
              data: { peopleId: existente.id, specialty: specialty || "", bio: bio || null },
            });
          }
          return u;
        });
        return res.status(201).json({
          id: user.id, nombre: user.person.name, email: user.person.email, rol: user.role,
        });
      }
    }


    const nuevaPersona = await prisma.$transaction(async (tx) => {
      const persona = await tx.people.create({
        data: {
          name: nombre,
          email: email,
          document: docReal ? document.trim() : "00000000",
          documentType: documentType || "DNI",
          phone: phone || "",
          cuilCuit: cuilCuit ?? "",
          user: {
            create: {
              passwordHash: hash,
              role: rol
            }
          }
        },
        include: { user: true }
      });
      if (esProfesional) {
        await tx.professional.create({
          data: { peopleId: persona.id, specialty: specialty || "", bio: bio || null },
        });
      }
      return persona;
    });

    res.status(201).json({
      id: nuevaPersona.user.id,
      nombre: nuevaPersona.name,
      email: nuevaPersona.email,
      rol: nuevaPersona.user.role
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, password, rol, active, specialty, bio } = req.body;

    const userData = {
      ...(rol !== undefined && { role: rol }),
      ...(active !== undefined && { active }),
    };
    if (password) {
      userData.passwordHash = await bcrypt.hash(password, 10);
    }

    await prisma.$transaction(async (tx) => {
      const usuarioActualizado = await tx.user.update({
        where: { id: String(id) },
        data: userData,
        include: { person: true },
      });

      if (nombre || email) {
        await tx.people.update({
          where: { id: usuarioActualizado.peopleId },
          data: {
            name: nombre || usuarioActualizado.person.name,
            email: email || usuarioActualizado.person.email,
          },
        });
      }

      
      if (rol !== undefined) {
        const ficha = await tx.professional.findUnique({
          where: { peopleId: usuarioActualizado.peopleId },
        });

        if (rol === 'PROFESSIONAL') {
          
          if (!ficha) {
            await tx.professional.create({
              data: {
                peopleId: usuarioActualizado.peopleId,
                specialty: specialty || '',
                bio: bio || null,
              },
            });
          } else {
            await tx.professional.update({
              where: { id: ficha.id },
              data: {
                active: true,
                ...(specialty !== undefined && { specialty }),
                ...(bio !== undefined && { bio: bio || null }),
              },
            });
          }
        } else if (rol !== 'ADMIN' && ficha && ficha.active !== false) {
          
          await tx.professional.update({ where: { id: ficha.id }, data: { active: false } });
        }
        
      }
    });

    res.json({ mensaje: "Usuario actualizado correctamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


export const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id: String(id) }
    });

    res.json({ mensaje: "Usuario eliminado del sistema" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const cambiarPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { passwordActual, passwordNueva } = req.body;

    if (req.user.role !== 'ADMIN' && req.user.id !== id) {
      return res.status(403).json({ mensaje: 'Solo podés cambiar tu propia contraseña' });
    }

    if (!passwordActual || !passwordNueva) {
      return res.status(400).json({ mensaje: 'passwordActual y passwordNueva son obligatorios' });
    }

    const usuario = await prisma.user.findUnique({ where: { id } });
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const valida = await bcrypt.compare(passwordActual, usuario.passwordHash);
    if (!valida) {
      return res.status(401).json({ mensaje: 'La contraseña actual es incorrecta' });
    }

    const passwordHash = await bcrypt.hash(passwordNueva, 10);
    await prisma.user.update({ where: { id }, data: { passwordHash } });

    res.json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const desactivarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await prisma.user.findUnique({ where: { id: String(id) } });
    if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado" });

    
    if (usuario.role === 'ADMIN') {
      const adminsActivos = await prisma.user.count({
        where: { role: 'ADMIN', active: true }
      });

      if (adminsActivos <= 1) {
        return res.status(400).json({
          mensaje: "¡Cuidado! No podés desactivar al último administrador activo del sistema."
        });
      }
    }

    await prisma.user.update({
      where: { id: String(id) },
      data: { active: false }
    });

    res.json({ mensaje: "Usuario desactivado correctamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const activarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.user.update({
      where: { id: String(id) },
      data: { active: true }
    });

    res.json({ mensaje: "Usuario activado correctamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const verificarDocumento = async (req, res) => {
  try {
    const { documentType, document } = req.query;
    const doc = (document || "").trim();
  
    if (!doc || doc === "00000000") {
      return res.json({ existe: false });
    }
    const tipo = documentType || "DNI";
    const persona = await prisma.people.findFirst({
      where: { documentType: tipo, document: doc },
      include: { user: true, patient: true, professional: true },
    });
    if (!persona) {
      return res.json({ existe: false });
    }

    return res.json({
      existe: true,
      tieneUser: !!persona.user,
      esPaciente: !!persona.patient,
      esProfesional: !!persona.professional,
      persona: {
        id: persona.id,
        name: persona.name,
        email: persona.email,
        phone: persona.phone,
        documentType: persona.documentType,
        document: persona.document,
        specialty: persona.professional?.specialty || "",
        bio: persona.professional?.bio || "",
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const buscarPersonas = async (req, res) => {
  try {
    const { nombre, email, documento } = req.query;

    const personas = await prisma.people.findMany({
      where: {
        ...(nombre && { name: { contains: nombre, mode: 'insensitive' } }),
        ...(email && { email: { contains: email, mode: 'insensitive' } }),
        ...(documento && { document: { contains: documento } })
      }
    });

    res.json(personas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
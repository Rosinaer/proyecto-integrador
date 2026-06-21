import prisma from '../config/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import transporter from '../config/mailer.js';


const validarEmail = (email) => {
  const regex = /\S+@\S+\.\S+/;
  return regex.test(email);
};

const validarPassword = (password) => {
  return password.length >= 6;
};

export const register = async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      email,
      password,
      documento
    } = req.body;

    if (!nombre || !apellido || !email || !password) {
      return res.status(400).json({
        message: "Todos los campos son obligatorios"
      });
    }

    if (!validarEmail(email)) {
      return res.status(400).json({
        message: "Email inválido"
      });
    }

    if (!validarPassword(password)) {
      return res.status(400).json({
        message: "La contraseña debe tener al menos 6 caracteres"
      });
    }

    const personaExistente = await prisma.people.findFirst({
      where: {
        email,
        user: {
          isNot: null
        }
      }
    });

    if (personaExistente) {
      return res.status(400).json({
        message: "El email ya está registrado"
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const nuevaPersona = await prisma.people.create({
      data: {
        name: `${nombre} ${apellido}`,
        email: email,
        documentType: "DNI",
        document: documento || "00000000",
        phone: "",
        user: {
          create: {
            passwordHash: passwordHash,
            role: "PATIENT"
          }
        },
        patient: {
          create: {}
        }
      },
      include: {
        user: true
      }
    });

    res.status(201).json({
      message: "Paciente registrado correctamente",
      user: {
        id: nuevaPersona.user.id,
        role: nuevaPersona.user.role,
        person: {
          name: nuevaPersona.name,
          email: nuevaPersona.email
        }
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error en el servidor"
    });
  }
};

export const login = async (req, res) => {
  try {
    const {
      email,
      password
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email y contraseña obligatorios"
      });
    }

    const persona = await prisma.people.findFirst({
      where: {
        email,
        user: {
          isNot: null
        }
      },
      include: {
        user: true,
        professional: {
          select: {
            id: true
          }
        }
      }
    });

    if (!persona || !persona.user) {
      return res.status(401).json({
        message: "Credenciales inválidas"
      });
    }

    const passwordValida = await bcrypt.compare(password, persona.user.passwordHash);

    if (!passwordValida) {
      return res.status(401).json({
        message: "Credenciales inválidas"
      });
    }

    const token = jwt.sign({
        id: persona.user.id,
        role: persona.user.role,
        email: persona.email,
        peopleId: persona.id
      },
      process.env.JWT_SECRET, {
        expiresIn: "1d",
        issuer: "estetica-app"
      }
    );

    res.json({
      message: "Login exitoso",
      token,
      user: {
        id: persona.user.id,
        role: persona.user.role,
        professionalId: persona.professional?.id ?? null,
        person: {
          name: persona.name,
          email: persona.email
        }
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error en el servidor"
    });
  }
};

export const perfil = async (req, res) => {
  try {
    const persona = await prisma.people.findFirst({
      where: {
        user: {
          id: req.user.id
        }
      },
      include: {
        user: true,
        professional: {
          select: {
            id: true
          }
        }
      }
    });

    if (!persona) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    res.json({
      user: {
        id: persona.user.id,
        role: persona.user.role,
        professionalId: persona.professional?.id ?? null,
        person: {
          name: persona.name,
          email: persona.email
        }
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error al obtener perfil"
    });
  }
};


export const forgotPassword = async (req, res) => {
  try {
    const {
      email
    } = req.body;

    const persona = await prisma.people.findFirst({
      where: {
        email,
        user: {
          isNot: null
        }
      },
      include: {
        user: true
      }
    });

    if (!persona || !persona.user) {
      return res.status(404).json({
        mensaje: "No existe un usuario registrado con ese email"
      });
    }

    const resetToken = jwt.sign({
        id: persona.user.id
      },
      process.env.JWT_SECRET, {
        expiresIn: '15m'
      }
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      from: `"Espacio Senda" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Recuperación de Contraseña - Espacio Senda',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #6b21a8; text-align: center;">Recuperación de contraseña</h2>
          <p>Hola <b>${persona.name}</b>,</p>
          <p>Recibimos una solicitud para restablecer tu contraseña en Espacio Senda. Hacé clic en el siguiente botón para crear una nueva:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="padding: 12px 24px; background-color: #6b21a8; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Restablecer mi contraseña</a>
          </div>
          <p style="color: #64748b; font-size: 14px;">⚠️ Este enlace es válido por 15 minutos.</p>
          <p style="color: #64748b; font-size: 14px;">Si no solicitaste este cambio, podés ignorar este correo tranquilamente.</p>
        </div>
      `
    });

    res.json({
      mensaje: "Te enviamos un correo con las instrucciones."
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const {
      token,
      nuevaPassword
    } = req.body;

    if (!token || !nuevaPassword) {
      return res.status(400).json({
        mensaje: "El token y la nueva contraseña son obligatorios"
      });
    }

    const decodificado = jwt.verify(token, process.env.JWT_SECRET);
    const passwordHash = await bcrypt.hash(nuevaPassword, 10);

    await prisma.user.update({
      where: {
        id: decodificado.id
      },
      data: {
        passwordHash
      }
    });

    res.json({
      mensaje: "¡Contraseña restablecida correctamente! Ya podés iniciar sesión."
    });

  } catch (error) {
    res.status(400).json({
      mensaje: "El enlace es inválido o ha expirado. Volvé a solicitar uno nuevo."
    });
  }
};
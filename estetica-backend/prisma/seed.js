import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log(' Iniciando la siembra de datos REALES y SEGUROS para Espacio Senda...');

  // Generamos el hash encriptado para la contraseña "123456"
  // El número 10 es el "salt rounds", que define qué tan compleja es la encriptación
  const hashedDefaultPassword = await bcrypt.hash('123456', 10);

  // 1. Usuarios de Prueba (Administrador y Paciente)
  await prisma.people.create({
    data: {
      name: 'Admin Senda',
      documentType: 'DNI',
      document: '11111111',
      cuilCuit: '20111111110',
      email: 'admin@espaciosenda.com',
      phone: '1111111111',
      user: {
        create: {
          passwordHash: hashedDefaultPassword, // Usamos la clave encriptada
          role: 'ADMIN',
        }
      }
    }
  });

  await prisma.people.create({
    data: {
      name: 'Paciente Prueba',
      documentType: 'DNI',
      document: '99999999',
      cuilCuit: '20999999992',
      email: 'paciente@prueba.com',
      phone: '1199999999',
      patient: {
      },
      user: {
        create: {
          passwordHash: hashedDefaultPassword, // Usamos la clave encriptada
          role: 'PATIENT',
        }
      }
    }
  });
  console.log(' Admin y Paciente creados con contraseñas ENCRIPTADAS.');

  // 2. Staff de Profesionales Reales
  const profesionales = [
    {
      name: 'Dra. Leila Belén Senger', document: '20000001', email: 'lsenger@espaciosenda.com',
      specialty: 'Cardiología', bio: 'UBA. MN 156.746'
    },
    {
      name: 'Dra. Julieta Busso', document: '20000002', email: 'jbusso@espaciosenda.com',
      specialty: 'Odontología', bio: 'UNR. MN 31995'
    },
    {
      name: 'Dra. Jaquelina Grassetti', document: '20000003', email: 'jgrassetti@espaciosenda.com',
      specialty: 'Medicina estética y armonización facial', bio: 'MP 23.602'
    },
    {
      name: 'Dra. Valeria Montero', document: '20000004', email: 'vmontero@espaciosenda.com',
      specialty: 'Ginecología', bio: 'UBA. MN 108.536'
    }
  ];

  for (const prof of profesionales) {
    await prisma.people.create({
      data: {
        name: prof.name,
        documentType: 'DNI',
        document: prof.document,
        cuilCuit: `20${prof.document}0`,
        email: prof.email,
        phone: '1100000000', 
        professional: {
          create: {
            specialty: prof.specialty,
            bio: prof.bio,
          }
        }
      }
    });
  }
  console.log(' Staff de profesionales cargado.');

  // 3. Categorías y Servicios Reales
  const categoriasConServicios = [
    {
      name: "Bioestimulación cutánea",
      services: [
        "Plasma rico en plaquetas", "Dermoray (tecnología arco de plasma)"
      ]
    },
    {
      name: "Armonización orofacial",
      services: [
        "Tratamiento del contorno mandibular con ácido hialurónico", "Rinomodelación con ácido hialurónico", 
        "Blefaroplastía no quirúrgica (Dermoray)"
      ]
    },
    {
      name: "Dermatología estética",
      services: [
        "Peeling químico", "Botox para arrugas dinámicas", "Toxina botulínica para bruxismo"
      ]
    },
    {
      name: "Clínica de la sonrisa",
      services: [
        "Blanqueamiento dental"
      ]
    }
  ];

  for (let i = 0; i < categoriasConServicios.length; i++) {
    const cat = categoriasConServicios[i];
    await prisma.serviceCategory.create({
      data: {
        name: cat.name,
        displayOrder: i + 1,
        services: {
          create: cat.services.map(srvName => ({
            name: srvName,
            defaultDurationMinutes: 60
          }))
        }
      }
    });
  }
  console.log(' Categorías y todos los tratamientos cargados.');

  console.log(' ¡Base de datos sembrada con éxito y asegurada!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
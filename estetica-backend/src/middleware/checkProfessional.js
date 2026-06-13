import prisma from '../config/prisma.js';

export const verificarProfesional = async (professionalId, usuario) => {
  if (usuario.role !== 'PROFESSIONAL') return true; 
  

  const profesional = await prisma.professional.findUnique({
    where: { id: professionalId }
  });

  return profesional && profesional.peopleId === usuario.peopleId;
};


export const professionalIdDelUsuario = async (usuario) => {
  if (!usuario || usuario.role !== 'PROFESSIONAL') return null;

  const profesional = await prisma.professional.findUnique({
    where: { peopleId: usuario.peopleId },
    select: { id: true },
  });

  return profesional?.id ?? null;
};


export const SIN_COINCIDENCIAS = '00000000-0000-0000-0000-000000000000';
import prisma from '../config/prisma.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getDashboard = asyncHandler(async (req, res) => {
  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);

  const finDia = new Date();
  finDia.setHours(23, 59, 59, 999);

  
  const turnosHoy = await prisma.appointment.count({
    where: {
      startsAt: {
        gte: inicioDia,
        lte: finDia,
      },
    },
  });

  
  const ingresos = await prisma.payment.aggregate({
    _sum: {
      amount: true,
    },
  });

  
  const cancelados = await prisma.appointment.count({
    where: {
      status: 'CANCELLED',
    },
  });

  res.json({
    turnosHoy,
    ingresos: ingresos._sum.amount || 0,
    cancelados,
  });
});

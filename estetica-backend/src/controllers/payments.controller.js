import prisma from '../config/prisma.js';
import asyncHandler from '../utils/asyncHandler.js';
import { PAYMENT_METHODS, PAYMENT_TYPES } from '../constants/payments.js';


export const crearPago = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const { amount, method, type } = req.body;

  
  if (!amount || !method || !type) {
    return res.status(400).json({
      mensaje: 'amount, method y type son obligatorios',
    });
  }

  if (!PAYMENT_METHODS.includes(method)) {
    return res.status(400).json({
      mensaje: `Método de pago inválido. Valores permitidos: ${PAYMENT_METHODS.join(', ')}`,
    });
  }

  if (!PAYMENT_TYPES.includes(type)) {
    return res.status(400).json({
      mensaje: `Tipo de pago inválido. Valores permitidos: ${PAYMENT_TYPES.join(', ')}`,
    });
  }

  if (isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({
      mensaje: 'El monto debe ser un número mayor a 0',
    });
  }

  
  const turno = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { payments: true },
  });

  if (!turno) {
    return res.status(404).json({ mensaje: 'Turno no encontrado' });
  }

  
  if (turno.status === 'CANCELLED') {
    return res.status(400).json({
      mensaje: 'No se puede registrar un pago en un turno cancelado',
    });
  }

  
  const totalPagado = turno.payments
    .filter((p) => !p.isRefund)
    .reduce((acc, p) => acc + Number(p.amount), 0);

  const precioFinal =
    Number(turno.priceSnapshot) - Number(turno.discountAmount || 0);

  const nuevoTotal = totalPagado + Number(amount);

  if (nuevoTotal > precioFinal) {
    return res.status(400).json({
      mensaje: `El monto supera el precio del turno. Precio: $${precioFinal}, Ya pagado: $${totalPagado}, Disponible: $${(precioFinal - totalPagado).toFixed(2)}`,
    });
  }

  
  let nuevoPaymentStatus = 'PARTIAL';
  if (nuevoTotal >= precioFinal) {
    nuevoPaymentStatus = 'COMPLETED';
  }

  
  const resultado = await prisma.$transaction(async (tx) => {
    const pago = await tx.payment.create({
      data: {
        appointmentId,
        amount: Number(amount),
        method,
        type,
        isRefund: false,
      },
    });

    await tx.appointment.update({
      where: { id: appointmentId },
      data: { paymentStatus: nuevoPaymentStatus },
    });

    return pago;
  });

  res.status(201).json({
    mensaje: 'Pago registrado correctamente',
    pago: resultado,
    estadoPago: nuevoPaymentStatus,
  });
});

// OBTENER PAGOS DE UN TURNO

export const obtenerPagosPorTurno = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;

  const turno = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!turno) {
    return res.status(404).json({ mensaje: 'Turno no encontrado' });
  }

  const pagos = await prisma.payment.findMany({
    where: { appointmentId },
    orderBy: { paidAt: 'asc' },
  });

  // Calcular resumen financiero del turno
  const precioFinal =
    Number(turno.priceSnapshot) - Number(turno.discountAmount || 0);

  const totalPagado = pagos
    .filter((p) => !p.isRefund)
    .reduce((acc, p) => acc + Number(p.amount), 0);

  const totalReembolsado = pagos
    .filter((p) => p.isRefund)
    .reduce((acc, p) => acc + Number(p.amount), 0);

  const saldoPendiente = precioFinal - totalPagado + totalReembolsado;

  res.json({
    appointmentId,
    resumen: {
      precioOriginal: Number(turno.priceSnapshot),
      descuento: Number(turno.discountAmount || 0),
      precioFinal,
      totalPagado,
      totalReembolsado,
      saldoPendiente: saldoPendiente < 0 ? 0 : saldoPendiente,
      estadoPago: turno.paymentStatus,
    },
    pagos,
  });
});

// REGISTRAR REEMBOLSO

export const registrarReembolso = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const { amount, method } = req.body;

  if (!amount || !method) {
    return res.status(400).json({
      mensaje: 'amount y method son obligatorios',
    });
  }

  if (isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({
      mensaje: 'El monto debe ser un número mayor a 0',
    });
  }

  if (!PAYMENT_METHODS.includes(method)) {
    return res.status(400).json({
      mensaje: `Método inválido. Valores permitidos: ${PAYMENT_METHODS.join(', ')}`,
    });
  }

  const turno = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { payments: true },
  });

  if (!turno) {
    return res.status(404).json({ mensaje: 'Turno no encontrado' });
  }

  const totalPagado = turno.payments
    .filter((p) => !p.isRefund)
    .reduce((acc, p) => acc + Number(p.amount), 0);

  const totalReembolsadoAntes = turno.payments
    .filter((p) => p.isRefund)
    .reduce((acc, p) => acc + Number(p.amount), 0);

  const disponibleParaReembolso = totalPagado - totalReembolsadoAntes;

  if (Number(amount) > disponibleParaReembolso) {
    return res.status(400).json({
      mensaje: `No se puede reembolsar más de lo pagado. Disponible para reembolso: $${disponibleParaReembolso.toFixed(2)}`,
    });
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const reembolso = await tx.payment.create({
      data: {
        appointmentId,
        amount: Number(amount),
        method,
        type: 'FULL_PAYMENT',
        isRefund: true,
      },
    });

    await tx.appointment.update({
      where: { id: appointmentId },
      data: { paymentStatus: 'REFUNDED' },
    });

    return reembolso;
  });

  res.status(201).json({
    mensaje: 'Reembolso registrado correctamente',
    reembolso: resultado,
  });
});

// HISTORIAL DE PAGOS

export const obtenerHistorialPagos = asyncHandler(async (req, res) => {
  const {
    patientId,
    professionalId,
    method,
    type,
    isRefund,
    desde,
    hasta,
  } = req.query;

  // Construir filtros dinámicamente
  const where = {};

  // Filtro por método de pago
  if (method) {
    if (!PAYMENT_METHODS.includes(method)) {
      return res.status(400).json({
        mensaje: `Método inválido. Valores permitidos: ${PAYMENT_METHODS.join(', ')}`,
      });
    }
    where.method = method;
  }

  // Filtro por tipo de pago
  if (type) {
    if (!PAYMENT_TYPES.includes(type)) {
      return res.status(400).json({
        mensaje: `Tipo inválido. Valores permitidos: ${PAYMENT_TYPES.join(', ')}`,
      });
    }
    where.type = type;
  }

  // Filtro por reembolsos
  if (isRefund !== undefined) {
    where.isRefund = isRefund === 'true';
  }

  // Filtro por rango de fechas
  if (desde || hasta) {
    where.paidAt = {
      ...(desde && { gte: new Date(desde) }),
      ...(hasta && { lte: new Date(hasta) }),
    };
  }

  // Filtro por paciente o profesional (van anidados en appointment)
  if (patientId || professionalId) {
    where.appointment = {
      ...(patientId && { patientId }),
      ...(professionalId && {
        professionalService: { professionalId },
      }),
    };
  }

  const pagos = await prisma.payment.findMany({
    where,
    include: {
      appointment: {
        include: {
          patient: { include: { person: true } },
          professionalService: {
            include: {
              professional: { include: { person: true } },
              service: true,
            },
          },
        },
      },
    },
    orderBy: { paidAt: 'desc' },
  });

  // Calcular totales del resultado
  const totalCobrado = pagos
    .filter((p) => !p.isRefund)
    .reduce((acc, p) => acc + Number(p.amount), 0);

  const totalReembolsado = pagos
    .filter((p) => p.isRefund)
    .reduce((acc, p) => acc + Number(p.amount), 0);

  res.json({
    resumen: {
      cantidadRegistros: pagos.length,
      totalCobrado,
      totalReembolsado,
      neto: totalCobrado - totalReembolsado,
    },
    pagos,
  });
});

// ELIMINAR PAGO

export const eliminarPago = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const pago = await prisma.payment.findUnique({
    where: { id },
    include: { appointment: { include: { payments: true } } },
  });

  if (!pago) {
    return res.status(404).json({ mensaje: 'Pago no encontrado' });
  }

  // Recalcular estado de pago del turno tras eliminar
  const turno = pago.appointment;
  const precioFinal =
    Number(turno.priceSnapshot) - Number(turno.discountAmount || 0);

  const pagosRestantes = turno.payments.filter((p) => p.id !== id);

  const totalPagadoRestante = pagosRestantes
    .filter((p) => !p.isRefund)
    .reduce((acc, p) => acc + Number(p.amount), 0);

  let nuevoPaymentStatus = 'PENDING';
  if (totalPagadoRestante >= precioFinal) {
    nuevoPaymentStatus = 'COMPLETED';
  } else if (totalPagadoRestante > 0) {
    nuevoPaymentStatus = 'PARTIAL';
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.delete({ where: { id } });

    await tx.appointment.update({
      where: { id: turno.id },
      data: { paymentStatus: nuevoPaymentStatus },
    });
  });

  res.json({ mensaje: 'Pago eliminado correctamente' });
});

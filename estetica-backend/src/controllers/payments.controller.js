// estetica-backend/src/controllers/payments.controller.js
import prisma from '../config/prisma.js';
import asyncHandler from '../utils/asyncHandler.js';
import { PAYMENT_METHODS, PAYMENT_TYPES } from '../constants/payments.js';
import { rangoDiaClinica } from '../utils/tiempo.js';

// Neto pagado de un turno (pagos menos reembolsos).
const netoPagado = (payments = []) =>
  payments.reduce((acc, p) => acc + (p.isRefund ? -1 : 1) * Number(p.amount), 0);

// Estado de pago a partir del neto y el precio final.
const estadoSegunNeto = (neto, precioFinal) => {
  if (neto <= 0) return 'PENDING';
  if (neto >= precioFinal) return 'COMPLETED';
  return 'PARTIAL';
};

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

  const precioFinal =
    Number(turno.priceSnapshot) - Number(turno.discountAmount || 0);

  // Neto actual (descontando reembolsos previos) para no bloquear de más.
  const totalNeto = netoPagado(turno.payments);
  const nuevoTotal = totalNeto + Number(amount);

  if (nuevoTotal > precioFinal) {
    return res.status(400).json({
      mensaje: `El monto supera el precio del turno. Precio: $${precioFinal}, Ya pagado (neto): $${totalNeto}, Disponible: $${(precioFinal - totalNeto).toFixed(2)}`,
    });
  }

  const nuevoPaymentStatus = estadoSegunNeto(nuevoTotal, precioFinal);

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

  // Estado correcto tras un reembolso (parcial o total).
  const precioFinal =
    Number(turno.priceSnapshot) - Number(turno.discountAmount || 0);
  const netoDespues = totalPagado - (totalReembolsadoAntes + Number(amount));

  let nuevoEstado = 'REFUNDED';
  if (netoDespues >= precioFinal) nuevoEstado = 'COMPLETED';
  else if (netoDespues > 0) nuevoEstado = 'PARTIAL';
  // netoDespues <= 0 => REFUNDED

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
      data: { paymentStatus: nuevoEstado },
    });

    return reembolso;
  });

  res.status(201).json({
    mensaje: 'Reembolso registrado correctamente',
    reembolso: resultado,
    estadoPago: nuevoEstado,
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

  const where = {};

  if (method) {
    if (!PAYMENT_METHODS.includes(method)) {
      return res.status(400).json({
        mensaje: `Método inválido. Valores permitidos: ${PAYMENT_METHODS.join(', ')}`,
      });
    }
    where.method = method;
  }

  if (type) {
    if (!PAYMENT_TYPES.includes(type)) {
      return res.status(400).json({
        mensaje: `Tipo inválido. Valores permitidos: ${PAYMENT_TYPES.join(', ')}`,
      });
    }
    where.type = type;
  }

  if (isRefund !== undefined) {
    where.isRefund = isRefund === 'true';
  }

  // Filtro por rango de fechas EN HORA DE LA CLÍNICA (arregla los cobros
  // de las 23 hs que "no aparecían" salvo poniendo el día siguiente).
  if (desde || hasta) {
    where.paidAt = rangoDiaClinica(desde, hasta);
  }

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

  const turno = pago.appointment;
  const precioFinal =
    Number(turno.priceSnapshot) - Number(turno.discountAmount || 0);

  const pagosRestantes = turno.payments.filter((p) => p.id !== id);

  // Neto restante (descontando reembolsos) para fijar el estado correcto.
  const netoRestante = netoPagado(pagosRestantes);

  let nuevoPaymentStatus = estadoSegunNeto(netoRestante, precioFinal);
  // Si quedaron solo reembolsos (neto negativo) lo dejamos como REFUNDED.
  if (netoRestante < 0) nuevoPaymentStatus = 'REFUNDED';

  await prisma.$transaction(async (tx) => {
    await tx.payment.delete({ where: { id } });

    await tx.appointment.update({
      where: { id: turno.id },
      data: { paymentStatus: nuevoPaymentStatus },
    });
  });

  res.json({ mensaje: 'Pago eliminado correctamente' });
});
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/* ════════════════════════════════════════════════════════════════
 *  CONFIG GENERAL
 *  - Mismo manejo de horas/fechas que los controllers:
 *    · startTime/endTime  -> Date('1970-01-01T HH:MM :00Z')  (hora en UTC, fecha epoch)
 *    · availability.date  -> Date('YYYY-MM-DD T00:00:00Z')   (medianoche UTC)
 *    · appointment starts -> Date('YYYY-MM-DD T HH:MM :00Z') (UTC)
 *  Todo se construye en UTC para que coincida con calcularSlots() (getUTCHours).
 * ════════════════════════════════════════════════════════════════ */
const YEAR = 2026;
const MONTH = 6; // Junio
const NOW = new Date(); // referencia para decidir pasado/futuro (hoy ≈ 11/06/2026)

// Helpers de tiempo/fecha
const timeUTC = (hhmm) => new Date(`1970-01-01T${hhmm}:00Z`);
const dateUTC = (ymd) => new Date(`${ymd}T00:00:00Z`);
const dtUTC = (ymd, hhmm) => new Date(`${ymd}T${hhmm}:00Z`);
const addMin = (date, min) => new Date(date.getTime() + min * 60000);
const money = (n) => Number(n).toFixed(2);
const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const fromMin = (mins) => {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

async function main() {
  console.log('🌱 SEED2 · Poblando base con agendas de junio, turnos y pagos...');

  const hashedPassword = await bcrypt.hash('123456', 10);

  /* ────────────────────────────────────────────────────────────
   * 1. USUARIOS BASE (admin + recepción + paciente de prueba)
   * ──────────────────────────────────────────────────────────── */
  
  // Función auxiliar para crear persona si no existe por email
  async function findOrCreateUser(email, data) {
    const existing = await prisma.people.findFirst({ where: { email }, include: { user: true } });
    if (existing) return existing;
    return await prisma.people.create({ data, include: { user: true } });
  }

  const admin = await findOrCreateUser('admin@espaciosenda.com', {
    name: 'Admin Senda',
    documentType: 'DNI',
    document: '11111111',
    cuilCuit: '20111111110', // Campo obligatorio agregado
    email: 'admin@espaciosenda.com',
    phone: '1111111111',
    user: { create: { passwordHash: hashedPassword, role: 'ADMIN' } },
  });

  const recep = await findOrCreateUser('recepcion@espaciosenda.com', {
    name: 'Recepción Senda',
    documentType: 'DNI',
    document: '22222222',
    cuilCuit: '20222222220', // Campo obligatorio agregado
    email: 'recepcion@espaciosenda.com',
    phone: '1122222222',
    user: { create: { passwordHash: hashedPassword, role: 'RECEPTIONIST' } },
  });

  await findOrCreateUser('paciente@prueba.com', {
    name: 'Paciente Prueba',
    documentType: 'DNI',
    document: '99999999',
    cuilCuit: '20999999992', // Campo obligatorio agregado
    email: 'paciente@prueba.com',
    phone: '1199999999',
    patient: { }, // Nota: si paciente tiene cuil, asegurate que coincida con People
    user: { create: { passwordHash: hashedPassword, role: 'PATIENT' } },
  });

  const adminUserId = admin.user.id;
  const recepUserId = recep.user.id;
  const creadores = [adminUserId, recepUserId];
  console.log('✅ Admin, recepción y paciente de prueba listos.');
  /* ────────────────────────────────────────────────────────────
   * 2. CATEGORÍAS Y SERVICIOS (MENOS categorías y DISTINTOS a seed1)
   *    seed1 tenía 4 categorías. Acá usamos 2.
   * ──────────────────────────────────────────────────────────── */
  const categoriasConServicios = [
    {
      name: 'Estética corporal',
      services: [
        { name: 'Drenaje linfático', dur: 60 },
        { name: 'Mesoterapia corporal', dur: 45 },
        { name: 'Criolipólisis', dur: 60 },
      ],
    },
    {
      name: 'Cuidado facial',
      services: [
        { name: 'Limpieza facial profunda', dur: 60 },
        { name: 'Hidratación facial', dur: 45 },
        { name: 'Microneedling', dur: 60 },
      ],
    },
  ];

  const serviceByName = {};
  for (let i = 0; i < categoriasConServicios.length; i++) {
    const cat = categoriasConServicios[i];
    const created = await prisma.serviceCategory.create({
      data: {
        name: cat.name,
        displayOrder: i + 1,
        services: {
          create: cat.services.map((s) => ({
            name: s.name,
            defaultDurationMinutes: s.dur,
          })),
        },
      },
      include: { services: true },
    });
    for (const s of created.services) serviceByName[s.name] = s;
  }
  console.log(`✅ ${categoriasConServicios.length} categorías y servicios cargados.`);

  /* ────────────────────────────────────────────────────────────
   * 3. PROFESIONALES + sus servicios (precio/duración) + horarios
   *    dayOfWeek: 0=Dom ... 6=Sáb  (igual que getUTCDay)
   * ──────────────────────────────────────────────────────────── */
  const profesionalesData = [
    {
      name: 'Dra. Carla Méndez',
      document: '30000001',
      email: 'cmendez@espaciosenda.com',
      specialty: 'Estética corporal',
      bio: 'MP 18.220',
      servicios: [
        { name: 'Drenaje linfático', dur: 60, price: 18000 },
        { name: 'Mesoterapia corporal', dur: 45, price: 25000 },
        { name: 'Criolipólisis', dur: 60, price: 40000 },
      ],
      horarios: [
        { dow: 1, start: '09:00', end: '13:00' }, // Lunes
        { dow: 3, start: '09:00', end: '13:00' }, // Miércoles
        { dow: 5, start: '09:00', end: '13:00' }, // Viernes
      ],
    },
    {
      name: 'Lic. Sofía Romero',
      document: '30000002',
      email: 'sromero@espaciosenda.com',
      specialty: 'Cosmetología facial',
      bio: 'Cosmetóloga · Mat. 4521',
      servicios: [
        { name: 'Limpieza facial profunda', dur: 60, price: 15000 },
        { name: 'Hidratación facial', dur: 45, price: 14000 },
        { name: 'Microneedling', dur: 60, price: 30000 },
      ],
      horarios: [
        { dow: 2, start: '14:00', end: '18:00' }, // Martes
        { dow: 4, start: '14:00', end: '18:00' }, // Jueves
        { dow: 6, start: '10:00', end: '14:00' }, // Sábado
      ],
    },
    {
      name: 'Dra. Paula Ferreyra',
      document: '30000003',
      email: 'pferreyra@espaciosenda.com',
      specialty: 'Dermatología estética',
      bio: 'UNC · MP 22.910',
      servicios: [
        { name: 'Microneedling', dur: 60, price: 32000 },
        { name: 'Limpieza facial profunda', dur: 50, price: 16000 },
      ],
      horarios: [
        { dow: 1, start: '10:00', end: '14:00' }, // Lunes
        { dow: 2, start: '10:00', end: '14:00' }, // Martes
        { dow: 4, start: '10:00', end: '14:00' }, // Jueves
      ],
    },
  ];

  // profesionales[] = { id, horarios, servicios:[{ professionalServiceId, name, dur, price }] }
  const profesionales = [];
  for (const p of profesionalesData) {
    const persona = await prisma.people.create({
      data: {
        name: p.name,
        documentType: 'DNI',
        document: p.document,
        email: p.email,
        phone: '1100000000',
        professional: { create: { specialty: p.specialty, bio: p.bio } },
      },
      include: { professional: true },
    });
    const profId = persona.professional.id;

    // Servicios del profesional (ProfessionalService)
    const servicios = [];
    for (const sv of p.servicios) {
      const baseService = serviceByName[sv.name];
      const ps = await prisma.professionalService.create({
        data: {
          professionalId: profId,
          serviceId: baseService.id,
          durationMinutes: sv.dur,
          price: money(sv.price),
          active: true,
        },
      });
      servicios.push({ professionalServiceId: ps.id, name: sv.name, dur: sv.dur, price: sv.price });
    }

    // Horarios recurrentes (RecurringSchedule)
    for (const h of p.horarios) {
      await prisma.recurringSchedule.create({
        data: {
          professionalId: profId,
          dayOfWeek: h.dow,
          startTime: timeUTC(h.start),
          endTime: timeUTC(h.end),
          active: true,
        },
      });
    }

    profesionales.push({ id: profId, name: p.name, horarios: p.horarios, servicios });
  }
  console.log(`✅ ${profesionales.length} profesionales con servicios y horarios recurrentes.`);

  /* ────────────────────────────────────────────────────────────
   * 4. DISPONIBILIDAD DE JUNIO (replica generarDisponibilidad)
   *    Para cada profesional, por cada horario recurrente, se crea
   *    un slot Availability en cada día de junio que coincida.
   * ──────────────────────────────────────────────────────────── */
  const diasDelMes = [];
  {
    const d = new Date(Date.UTC(YEAR, MONTH - 1, 1));
    while (d.getUTCMonth() === MONTH - 1) {
      diasDelMes.push({ ymd: d.toISOString().slice(0, 10), dow: d.getUTCDay() });
      d.setUTCDate(d.getUTCDate() + 1);
    }
  }

  // availabilities[] = { id, profId, ymd, startHHMM, endHHMM, profRef }
  const availabilities = [];
  for (const prof of profesionales) {
    for (const dia of diasDelMes) {
      const horariosDelDia = prof.horarios.filter((h) => h.dow === dia.dow);
      for (const h of horariosDelDia) {
        const av = await prisma.availability.create({
          data: {
            professionalId: prof.id,
            date: dateUTC(dia.ymd),
            startTime: timeUTC(h.start),
            endTime: timeUTC(h.end),
          },
        });
        availabilities.push({
          id: av.id,
          ymd: dia.ymd,
          startHHMM: h.start,
          endHHMM: h.end,
          prof,
        });
      }
    }
  }
  console.log(`✅ ${availabilities.length} slots de disponibilidad creados para junio ${YEAR}.`);

  /* ────────────────────────────────────────────────────────────
   * 5. PACIENTES (más que en seed1)
   * ──────────────────────────────────────────────────────────── */
  const pacientesData = [
    { name: 'Lucía Fernández', doc: '40100001', tel: '1140100001' },
    { name: 'Martina López', doc: '40100002', tel: '1140100002' },
    { name: 'Sol Gutiérrez', doc: '40100003', tel: '1140100003' },
    { name: 'Camila Ramírez', doc: '40100004', tel: '1140100004' },
    { name: 'Florencia Díaz', doc: '40100005', tel: '1140100005' },
    { name: 'Valentina Sosa', doc: '40100006', tel: '1140100006' },
    { name: 'Agustina Torres', doc: '40100007', tel: '1140100007' },
    { name: 'Brenda Acosta', doc: '40100008', tel: '1140100008' },
    { name: 'Rocío Herrera', doc: '40100009', tel: '1140100009' },
    { name: 'Micaela Vega', doc: '40100010', tel: '1140100010' },
    { name: 'Julieta Castro', doc: '40100011', tel: '1140100011' },
    { name: 'Daniela Romero', doc: '40100012', tel: '1140100012' },
  ];

  const pacientes = [];
  for (let i = 0; i < pacientesData.length; i++) {
    const pd = pacientesData[i];
    const persona = await prisma.people.create({
      data: {
        name: pd.name,
        documentType: 'DNI',
        document: pd.doc,
        cuilCuit: `27${pd.doc}4`, // Campo obligatorio agregado (27...4 para evitar colisión con profesionales)
        email: `paciente${i + 1}@mail.com`,
        phone: pd.tel,
        patient: { create: {  } },
      },
      include: { patient: true },
    });
    pacientes.push({ id: persona.patient.id, name: pd.name });
  }
  console.log(`✅ ${pacientes.length} pacientes creados.`);

  /* ────────────────────────────────────────────────────────────
   * 6. TURNOS + PAGOS + AUDITORÍA + RECORDATORIOS
   *    Reglas:
   *    · Turno en el PASADO  -> COMPLETED / NO_SHOW / CANCELLED
   *    · Turno en el FUTURO  -> CONFIRMED (con seña) / PENDING
   *    · Pagos según estado (full, seña/parcial, reembolso, ninguno)
   *    Los turnos se ubican secuencialmente dentro del slot (sin solaparse).
   * ──────────────────────────────────────────────────────────── */
  let slotIdx = 0; // cuenta slots (decide cuántos turnos por slot)
  let apptSeq = 0; // cuenta turnos creados (decide estado/pago/paciente)
  let totalTurnos = 0;
  let totalPagos = 0;

  for (const av of availabilities) {
    const servicios = av.prof.servicios;
    const windowStart = toMin(av.startHHMM);
    const windowEnd = toMin(av.endHHMM);

    // Cuántos turnos en este slot (0, 1 o 2) para variar la ocupación
    const cuantos = slotIdx % 4 === 0 ? 0 : slotIdx % 3 === 0 ? 2 : 1;
    let cursor = windowStart;

    for (let k = 0; k < cuantos; k++) {
      const svc = servicios[(slotIdx + k) % servicios.length];
      if (cursor + svc.dur > windowEnd) break;

      const startHHMM = fromMin(cursor);
      const startsAt = dtUTC(av.ymd, startHHMM);
      const endsAt = addMin(startsAt, svc.dur);
      const esPasado = endsAt < NOW;
      const paciente = pacientes[apptSeq % pacientes.length];
      const creador = creadores[apptSeq % creadores.length];

      // Descuento ocasional
      const tieneDescuento = apptSeq % 7 === 0;
      const discountAmount = tieneDescuento ? Math.round(svc.price * 0.1) : null;
      const neto = svc.price - (discountAmount || 0);

      // Estado: el pasado mezcla completados / no-show / cancelados;
      // el futuro alterna confirmados / pendientes.
      let status;
      if (esPasado) {
        const r = apptSeq % 5; // 0,1,2 -> COMPLETED ; 3 -> NO_SHOW ; 4 -> CANCELLED
        status = r === 3 ? 'NO_SHOW' : r === 4 ? 'CANCELLED' : 'COMPLETED';
      } else {
        status = apptSeq % 2 === 0 ? 'CONFIRMED' : 'PENDING';
      }

      // Estado de pago + seña según estado del turno
      let paymentStatus = 'PENDING';
      let depositAmount = null;
      const pagos = [];

      if (status === 'COMPLETED') {
        depositAmount = Math.round(neto * 0.3);
        if (apptSeq % 3 === 0) {
          // Pago completo de una
          paymentStatus = 'COMPLETED';
          pagos.push({ amount: neto, method: 'CASH', type: 'FULL_PAYMENT', paidAt: startsAt });
        } else {
          // Seña + pago final
          paymentStatus = 'COMPLETED';
          pagos.push({ amount: depositAmount, method: 'TRANSFER', type: 'DEPOSIT', paidAt: addMin(startsAt, -2880) });
          pagos.push({ amount: neto - depositAmount, method: 'DEBIT_CARD', type: 'FINAL_PAYMENT', paidAt: startsAt });
        }
      } else if (status === 'NO_SHOW') {
        // Pagó seña y no se presentó (seña retenida)
        depositAmount = Math.round(neto * 0.3);
        paymentStatus = 'PARTIAL';
        pagos.push({ amount: depositAmount, method: 'TRANSFER', type: 'DEPOSIT', paidAt: addMin(startsAt, -2880) });
      } else if (status === 'CANCELLED') {
        // Pagó seña y se le reembolsó
        depositAmount = Math.round(neto * 0.3);
        paymentStatus = 'REFUNDED';
        pagos.push({ amount: depositAmount, method: 'TRANSFER', type: 'DEPOSIT', paidAt: addMin(startsAt, -4320) });
        pagos.push({ amount: depositAmount, method: 'TRANSFER', type: 'DEPOSIT', paidAt: addMin(startsAt, -1440), isRefund: true });
      } else if (status === 'CONFIRMED') {
        // Futuro confirmado con seña
        depositAmount = Math.round(neto * 0.3);
        paymentStatus = 'PARTIAL';
        pagos.push({ amount: depositAmount, method: 'CREDIT_CARD', type: 'DEPOSIT', paidAt: NOW });
      }
      // PENDING -> sin pagos

      const turno = await prisma.appointment.create({
        data: {
          professionalServiceId: svc.professionalServiceId,
          availabilityId: av.id,
          patientId: paciente.id,
          createdByUserId: creador,
          startsAt,
          endsAt,
          status,
          priceSnapshot: money(svc.price),
          discountAmount: discountAmount != null ? money(discountAmount) : null,
          discountReason: discountAmount != null ? 'Promo paciente frecuente' : null,
          depositAmount: depositAmount != null ? money(depositAmount) : null,
          paymentStatus,
          notes: status === 'NO_SHOW' ? 'No asistió' : null,
        },
      });
      totalTurnos++;

      // Pagos
      for (const pago of pagos) {
        await prisma.payment.create({
          data: {
            appointmentId: turno.id,
            amount: money(pago.amount),
            method: pago.method,
            type: pago.type,
            paidAt: pago.paidAt,
            isRefund: pago.isRefund || false,
          },
        });
        totalPagos++;
      }

      // Auditoría: alta del turno
      await prisma.appointmentAudit.create({
        data: {
          appointmentId: turno.id,
          action: 'CREATE',
          newStatus: 'PENDING',
          performedBy: creador,
          performedAt: addMin(startsAt, -5760),
        },
      });
      // Auditoría: cambio de estado (cuando corresponde)
      if (status !== 'PENDING') {
        await prisma.appointmentAudit.create({
          data: {
            appointmentId: turno.id,
            action: status === 'CANCELLED' ? 'CANCEL' : 'UPDATE',
            prevStatus: 'PENDING',
            newStatus: status,
            performedBy: creador,
            performedAt: addMin(startsAt, -2880),
          },
        });
      }

      // Recordatorio para turnos confirmados a futuro
      if (status === 'CONFIRMED') {
        await prisma.reminderLog.create({
          data: {
            appointmentId: turno.id,
            channel: 'WHATSAPP',
            status: 'SENT',
            sentAt: NOW,
          },
        });
      }

      cursor += svc.dur; // siguiente turno arranca al terminar el anterior (sin solapar)
      apptSeq++;
    }

    slotIdx++;
  }

  console.log(`✅ ${totalTurnos} turnos creados.`);
  console.log(`✅ ${totalPagos} pagos registrados.`);

  /* ────────────────────────────────────────────────────────────
   * RESUMEN
   * ──────────────────────────────────────────────────────────── */
  const [cTurnos, cPagos, cAvail, cPac] = await Promise.all([
    prisma.appointment.count(),
    prisma.payment.count(),
    prisma.availability.count(),
    prisma.patient.count(),
  ]);
  console.log('────────────────────────────────────────');
  console.log(`📊 Resumen total en DB:`);
  console.log(`   · Disponibilidades: ${cAvail}`);
  console.log(`   · Pacientes:        ${cPac}`);
  console.log(`   · Turnos:           ${cTurnos}`);
  console.log(`   · Pagos:            ${cPagos}`);
  console.log('🎉 SEED2 finalizado con éxito.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
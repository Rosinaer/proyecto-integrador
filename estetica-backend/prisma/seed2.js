import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/* ════════════════════════════════════════════════════════════════
 *  SEED2 · Carga servicios, horarios, agendas, pacientes y turnos.
 *
 *  CAMBIO IMPORTANTE: este seed NO crea profesionales. Usa las que ya
 *  existen en la base (las hayas creado con seed1 o desde la app), así
 *  no se duplican. A cada profesional existente le asigna un set de
 *  servicios y horarios (rotando por índice) y le genera disponibilidad.
 *
 *  SIN DESCUENTOS: discountAmount / discountReason quedan en null porque
 *  el módulo de descuentos todavía no está contemplado en la app.
 *
 *  CONVENCIÓN DE TIEMPO (igual que la app):
 *  - recurringSchedule / availability startTime,endTime -> @db.Time
 *      timeUTC('HH:MM') = hora de pared de la clínica (no se convierte).
 *  - availability.date -> @db.Date (medianoche UTC del día).
 *  - appointment.startsAt / endsAt -> instante UTC real (instanteBA()).
 * ════════════════════════════════════════════════════════════════ */
const YEAR = 2026;
const MESES = [6, 7]; // Junio y Julio
const NOW = new Date();

// Helpers de tiempo/fecha
const timeUTC = (hhmm) => new Date(`1970-01-01T${hhmm}:00Z`);
const dateUTC = (ymd) => new Date(`${ymd}T00:00:00Z`);
const addMin = (date, min) => new Date(date.getTime() + min * 60000);

const CLINIC_TZ = process.env.GOOGLE_CALENDAR_TZ || 'America/Argentina/Buenos_Aires';
const _partesEnZona = (ms) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: CLINIC_TZ, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
    .formatToParts(new Date(ms))
    .reduce((o, p) => ((o[p.type] = p.value), o), {});
const _offsetMs = (ms) => {
  const p = _partesEnZona(ms);
  return Date.UTC(+p.year, p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - ms;
};
const instanteBA = (ymd, hhmm) => {
  const [y, mo, d] = ymd.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi, 0);
  const off1 = _offsetMs(guess);
  let ms = guess - off1;
  const off2 = _offsetMs(ms);
  if (off2 !== off1) ms = guess - off2;
  return new Date(ms);
};
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

/* Catálogo de servicios (el real del seed1). Se asegura con find-or-create. */
const CATALOGO = [
  {
    name: 'Bioestimulación cutánea',
    services: [
      { name: 'Plasma rico en plaquetas', dur: 60 },
      { name: 'Dermoray (tecnología arco de plasma)', dur: 60 },
    ],
  },
  {
    name: 'Armonización orofacial',
    services: [
      { name: 'Tratamiento del contorno mandibular con ácido hialurónico', dur: 60 },
      { name: 'Rinomodelación con ácido hialurónico', dur: 60 },
      { name: 'Blefaroplastía no quirúrgica (Dermoray)', dur: 60 },
    ],
  },
  {
    name: 'Dermatología estética',
    services: [
      { name: 'Peeling químico', dur: 60 },
      { name: 'Botox para arrugas dinámicas', dur: 60 },
      { name: 'Toxina botulínica para bruxismo', dur: 60 },
    ],
  },
  {
    name: 'Clínica de la sonrisa',
    services: [{ name: 'Blanqueamiento dental', dur: 60 }],
  },
];

/* Paquetes de servicios que se asignan a cada profesional existente,
 * rotando por índice (prof 0 -> BUNDLES[0], prof 1 -> BUNDLES[1], etc). */
const BUNDLES = [
  [
    { name: 'Tratamiento del contorno mandibular con ácido hialurónico', dur: 60, price: 45000 },
    { name: 'Rinomodelación con ácido hialurónico', dur: 60, price: 50000 },
    { name: 'Blefaroplastía no quirúrgica (Dermoray)', dur: 45, price: 38000 },
    { name: 'Plasma rico en plaquetas', dur: 60, price: 35000 },
  ],
  [
    { name: 'Peeling químico', dur: 45, price: 22000 },
    { name: 'Botox para arrugas dinámicas', dur: 30, price: 30000 },
    { name: 'Toxina botulínica para bruxismo', dur: 45, price: 32000 },
  ],
  [
    { name: 'Plasma rico en plaquetas', dur: 60, price: 33000 },
    { name: 'Dermoray (tecnología arco de plasma)', dur: 60, price: 40000 },
  ],
  [
    { name: 'Blanqueamiento dental', dur: 60, price: 28000 },
    { name: 'Toxina botulínica para bruxismo', dur: 45, price: 32000 },
  ],
];

/* Plantillas de horarios recurrentes, también rotando por índice.
 * dayOfWeek: 0=Dom ... 6=Sáb (igual que getUTCDay). */
const HORARIOS_TPL = [
  [
    { dow: 1, start: '09:00', end: '13:00' },
    { dow: 3, start: '09:00', end: '13:00' },
    { dow: 5, start: '14:00', end: '18:00' },
  ],
  [
    { dow: 2, start: '09:00', end: '13:00' },
    { dow: 4, start: '14:00', end: '18:00' },
    { dow: 6, start: '10:00', end: '14:00' },
  ],
  [
    { dow: 1, start: '14:00', end: '18:00' },
    { dow: 3, start: '14:00', end: '18:00' },
  ],
  [
    { dow: 2, start: '14:00', end: '18:00' },
    { dow: 4, start: '09:00', end: '13:00' },
    { dow: 5, start: '09:00', end: '13:00' },
  ],
];

async function main() {
  console.log('🌱 SEED2 · Servicios, agendas (jun+jul), turnos y pagos · sin descuentos.');

  const hashedPassword = await bcrypt.hash('123456', 10);

  /* ────────────────────────────────────────────────────────────
   * 1. USUARIOS BASE (admin + recepción + paciente de prueba)
   * ──────────────────────────────────────────────────────────── */
  async function findOrCreateUser(email, data) {
    const existing = await prisma.people.findFirst({ where: { email }, include: { user: true } });
    if (existing) return existing;
    return await prisma.people.create({ data, include: { user: true } });
  }

  const admin = await findOrCreateUser('admin@espaciosenda.com', {
    name: 'Admin Senda', documentType: 'DNI', document: '11111111',
    cuilCuit: '20111111110', email: 'admin@espaciosenda.com', phone: '1111111111',
    user: { create: { passwordHash: hashedPassword, role: 'ADMIN' } },
  });

  const recep = await findOrCreateUser('recepcion@espaciosenda.com', {
    name: 'Recepción Senda', documentType: 'DNI', document: '22222222',
    cuilCuit: '20222222220', email: 'recepcion@espaciosenda.com', phone: '1122222222',
    user: { create: { passwordHash: hashedPassword, role: 'RECEPTIONIST' } },
  });

  await findOrCreateUser('paciente@prueba.com', {
    name: 'Paciente Prueba', documentType: 'DNI', document: '99999999',
    cuilCuit: '20999999992', email: 'paciente@prueba.com', phone: '1199999999',
    patient: {}, user: { create: { passwordHash: hashedPassword, role: 'PATIENT' } },
  });

  const creadores = [admin.user.id, recep.user.id];
  console.log('✅ Admin, recepción y paciente de prueba listos.');

  /* ────────────────────────────────────────────────────────────
   * 2. CATÁLOGO DE SERVICIOS (find-or-create; ServiceCategory.name es @unique)
   * ──────────────────────────────────────────────────────────── */
  const serviceByName = {};
  for (let i = 0; i < CATALOGO.length; i++) {
    const cat = CATALOGO[i];
    let categoria = await prisma.serviceCategory.findUnique({
      where: { name: cat.name }, include: { services: true },
    });
    if (!categoria) {
      categoria = await prisma.serviceCategory.create({
        data: {
          name: cat.name, displayOrder: i + 1,
          services: { create: cat.services.map((s) => ({ name: s.name, defaultDurationMinutes: s.dur })) },
        },
        include: { services: true },
      });
    } else {
      for (const s of cat.services) {
        if (!categoria.services.find((x) => x.name === s.name)) {
          await prisma.service.create({
            data: { categoryId: categoria.id, name: s.name, defaultDurationMinutes: s.dur },
          });
        }
      }
      categoria = await prisma.serviceCategory.findUnique({
        where: { name: cat.name }, include: { services: true },
      });
    }
    for (const s of categoria.services) serviceByName[s.name] = s;
  }
  console.log(`✅ Catálogo asegurado (${Object.keys(serviceByName).length} servicios).`);

  /* ────────────────────────────────────────────────────────────
   * 3. PROFESIONALES EXISTENTES (NO se crean) + servicios + horarios
   *    Se leen de la base. A cada una se le asigna un bundle de
   *    servicios y una plantilla de horarios, rotando por índice.
   *    ProfessionalService y RecurringSchedule usan find-or-create.
   * ──────────────────────────────────────────────────────────── */
  const profesionalesDB = await prisma.professional.findMany({
    where: { active: true },
    include: { person: true },
    orderBy: { person: { name: 'asc' } },
  });

  if (profesionalesDB.length === 0) {
    console.warn(
      '⚠️  No hay profesionales en la base. Creá las profesionales primero ' +
      '(desde la app o corriendo seed1) y volvé a ejecutar seed2.\n' +
      '    Se omiten servicios, horarios, disponibilidad y turnos.'
    );
  } else {
    console.log(`ℹ️  Usando ${profesionalesDB.length} profesionales ya existentes (no se crean nuevas).`);
  }

  // profesionales[] = { id, name, horarios, servicios:[{ professionalServiceId, name, dur, price }] }
  const profesionales = [];
  for (let i = 0; i < profesionalesDB.length; i++) {
    const prof = profesionalesDB[i];
    const profId = prof.id;
    const bundle = BUNDLES[i % BUNDLES.length];
    const horarios = HORARIOS_TPL[i % HORARIOS_TPL.length];

    // Servicios del profesional (find-or-create por profesional+servicio).
    const servicios = [];
    for (const sv of bundle) {
      const baseService = serviceByName[sv.name];
      if (!baseService) throw new Error(`Servicio de catálogo no encontrado: "${sv.name}"`);

      let ps = await prisma.professionalService.findFirst({
        where: { professionalId: profId, serviceId: baseService.id },
      });
      if (!ps) {
        ps = await prisma.professionalService.create({
          data: {
            professionalId: profId, serviceId: baseService.id,
            durationMinutes: sv.dur, price: money(sv.price), active: true,
          },
        });
      }
      servicios.push({ professionalServiceId: ps.id, name: sv.name, dur: sv.dur, price: sv.price });
    }

    // Horarios recurrentes (find-or-create para no duplicar).
    for (const h of horarios) {
      const yaExiste = await prisma.recurringSchedule.findFirst({
        where: {
          professionalId: profId, dayOfWeek: h.dow,
          startTime: timeUTC(h.start), endTime: timeUTC(h.end),
        },
      });
      if (!yaExiste) {
        await prisma.recurringSchedule.create({
          data: {
            professionalId: profId, dayOfWeek: h.dow,
            startTime: timeUTC(h.start), endTime: timeUTC(h.end), active: true,
          },
        });
      }
    }

    profesionales.push({ id: profId, name: prof.person?.name || '—', horarios, servicios });
    console.log(`   · ${prof.person?.name || '—'} → ${servicios.length} servicios, ${horarios.length} horarios.`);
  }
  if (profesionales.length) console.log('✅ Servicios y horarios asignados a las profesionales existentes.');

  /* ────────────────────────────────────────────────────────────
   * 4. DISPONIBILIDAD DE JUNIO Y JULIO (find-or-create por slot)
   * ──────────────────────────────────────────────────────────── */
  const diasDelPeriodo = [];
  for (const mes of MESES) {
    const d = new Date(Date.UTC(YEAR, mes - 1, 1));
    while (d.getUTCMonth() === mes - 1) {
      diasDelPeriodo.push({ ymd: d.toISOString().slice(0, 10), dow: d.getUTCDay() });
      d.setUTCDate(d.getUTCDate() + 1);
    }
  }

  const availabilities = [];
  for (const prof of profesionales) {
    for (const dia of diasDelPeriodo) {
      const horariosDelDia = prof.horarios.filter((h) => h.dow === dia.dow);
      for (const h of horariosDelDia) {
        let av = await prisma.availability.findFirst({
          where: {
            professionalId: prof.id, date: dateUTC(dia.ymd),
            startTime: timeUTC(h.start), endTime: timeUTC(h.end),
          },
        });
        if (!av) {
          av = await prisma.availability.create({
            data: {
              professionalId: prof.id, date: dateUTC(dia.ymd),
              startTime: timeUTC(h.start), endTime: timeUTC(h.end),
            },
          });
        }
        availabilities.push({ id: av.id, ymd: dia.ymd, startHHMM: h.start, endHHMM: h.end, prof });
      }
    }
  }
  console.log(`✅ ${availabilities.length} slots de disponibilidad (jun + jul ${YEAR}).`);

  /* ────────────────────────────────────────────────────────────
   * 5. PACIENTES (find-or-create por documento, para no duplicar)
   * ──────────────────────────────────────────────────────────── */
  const pacientesData = [
    { name: 'Lucía Fernández', doc: '40100001' },
    { name: 'Martina López', doc: '40100002' },
    { name: 'Sol Gutiérrez', doc: '40100003' },
    { name: 'Camila Ramírez', doc: '40100004' },
    { name: 'Florencia Díaz', doc: '40100005' },
    { name: 'Valentina Sosa', doc: '40100006' },
    { name: 'Agustina Torres', doc: '40100007' },
    { name: 'Brenda Acosta', doc: '40100008' },
    { name: 'Rocío Herrera', doc: '40100009' },
    { name: 'Micaela Vega', doc: '40100010' },
    { name: 'Julieta Castro', doc: '40100011' },
    { name: 'Daniela Romero', doc: '40100012' },
    { name: 'Antonella Ruiz', doc: '40100013' },
    { name: 'Carolina Méndez', doc: '40100014' },
    { name: 'Belén Cantarini', doc: '40100015' },
    { name: 'Pilar Navarro', doc: '40100016' },
    { name: 'Guadalupe Ibáñez', doc: '40100017' },
    { name: 'Malena Ríos', doc: '40100018' },
  ];

  const pacientes = [];
  for (let i = 0; i < pacientesData.length; i++) {
    const pd = pacientesData[i];
    let persona = await prisma.people.findFirst({
      where: { documentType: 'DNI', document: pd.doc },
      include: { patient: true },
    });

    if (persona && persona.patient) {
      pacientes.push({ id: persona.patient.id, name: pd.name });
      continue;
    }
    if (persona && !persona.patient) {
      const pac = await prisma.patient.create({ data: { peopleId: persona.id } });
      pacientes.push({ id: pac.id, name: pd.name });
      continue;
    }
    persona = await prisma.people.create({
      data: {
        name: pd.name, documentType: 'DNI', document: pd.doc,
        cuilCuit: `27${pd.doc}4`, email: `paciente${i + 1}@mail.com`,
        phone: `11${pd.doc}`, patient: { create: {} },
      },
      include: { patient: true },
    });
    pacientes.push({ id: persona.patient.id, name: pd.name });
  }
  console.log(`✅ ${pacientes.length} pacientes asegurados (sin duplicar).`);

  /* ────────────────────────────────────────────────────────────
   * 6. TURNOS + PAGOS + AUDITORÍA + RECORDATORIOS
   *    · Solo se generan en slots que NO tengan turnos todavía
   *      (no pisa turnos reales ni duplica al re-ejecutar).
   *    · Pasado -> COMPLETED / NO_SHOW / CANCELLED ; Futuro -> CONFIRMED / PENDING
   *    · SIN DESCUENTOS: el neto cobrado es siempre el precio del servicio.
   * ──────────────────────────────────────────────────────────── */
  let slotIdx = 0;
  let apptSeq = 0;
  let totalTurnos = 0;
  let totalPagos = 0;

  for (const av of availabilities) {
    // No tocar slots que ya tienen turnos (reales o de una corrida previa).
    const yaTiene = await prisma.appointment.count({ where: { availabilityId: av.id } });
    if (yaTiene > 0) { slotIdx++; continue; }

    const servicios = av.prof.servicios;
    if (!servicios.length) { slotIdx++; continue; }

    const windowStart = toMin(av.startHHMM);
    const windowEnd = toMin(av.endHHMM);
    const cuantos = slotIdx % 4 === 0 ? 0 : slotIdx % 3 === 0 ? 2 : 1;
    let cursor = windowStart;

    for (let k = 0; k < cuantos; k++) {
      const svc = servicios[(slotIdx + k) % servicios.length];
      if (cursor + svc.dur > windowEnd) break;

      const startHHMM = fromMin(cursor);
      const startsAt = instanteBA(av.ymd, startHHMM);
      const endsAt = addMin(startsAt, svc.dur);
      const esPasado = endsAt < NOW;
      const paciente = pacientes[apptSeq % pacientes.length];
      const creador = creadores[apptSeq % creadores.length];

      const neto = svc.price; // sin descuentos

      let status;
      if (esPasado) {
        const r = apptSeq % 5;
        status = r === 3 ? 'NO_SHOW' : r === 4 ? 'CANCELLED' : 'COMPLETED';
      } else {
        status = apptSeq % 2 === 0 ? 'CONFIRMED' : 'PENDING';
      }

      let paymentStatus = 'PENDING';
      let depositAmount = null;
      const pagos = [];

      if (status === 'COMPLETED') {
        depositAmount = Math.round(neto * 0.3);
        if (apptSeq % 3 === 0) {
          paymentStatus = 'COMPLETED';
          pagos.push({ amount: neto, method: 'CASH', type: 'FULL_PAYMENT', paidAt: startsAt });
        } else {
          paymentStatus = 'COMPLETED';
          pagos.push({ amount: depositAmount, method: 'TRANSFER', type: 'DEPOSIT', paidAt: addMin(startsAt, -2880) });
          pagos.push({ amount: neto - depositAmount, method: 'DEBIT_CARD', type: 'FINAL_PAYMENT', paidAt: startsAt });
        }
      } else if (status === 'NO_SHOW') {
        depositAmount = Math.round(neto * 0.3);
        paymentStatus = 'PARTIAL';
        pagos.push({ amount: depositAmount, method: 'TRANSFER', type: 'DEPOSIT', paidAt: addMin(startsAt, -2880) });
      } else if (status === 'CANCELLED') {
        depositAmount = Math.round(neto * 0.3);
        paymentStatus = 'REFUNDED';
        pagos.push({ amount: depositAmount, method: 'TRANSFER', type: 'DEPOSIT', paidAt: addMin(startsAt, -4320) });
        pagos.push({ amount: depositAmount, method: 'TRANSFER', type: 'DEPOSIT', paidAt: addMin(startsAt, -1440), isRefund: true });
      } else if (status === 'CONFIRMED') {
        depositAmount = Math.round(neto * 0.3);
        paymentStatus = 'PARTIAL';
        pagos.push({ amount: depositAmount, method: 'CREDIT_CARD', type: 'DEPOSIT', paidAt: NOW });
      }

      const turno = await prisma.appointment.create({
        data: {
          professionalServiceId: svc.professionalServiceId,
          availabilityId: av.id,
          patientId: paciente.id,
          createdByUserId: creador,
          startsAt, endsAt, status,
          priceSnapshot: money(svc.price),
          // discountAmount / discountReason: intencionalmente NO se cargan.
          depositAmount: depositAmount != null ? money(depositAmount) : null,
          paymentStatus,
          notes: status === 'NO_SHOW' ? 'No asistió' : null,
        },
      });
      totalTurnos++;

      for (const pago of pagos) {
        await prisma.payment.create({
          data: {
            appointmentId: turno.id, amount: money(pago.amount),
            method: pago.method, type: pago.type, paidAt: pago.paidAt,
            isRefund: pago.isRefund || false,
          },
        });
        totalPagos++;
      }

      await prisma.appointmentAudit.create({
        data: {
          appointmentId: turno.id, action: 'CREATE', newStatus: 'PENDING',
          performedBy: creador, performedAt: addMin(startsAt, -5760),
        },
      });
      if (status !== 'PENDING') {
        await prisma.appointmentAudit.create({
          data: {
            appointmentId: turno.id,
            action: status === 'CANCELLED' ? 'CANCEL' : 'UPDATE',
            prevStatus: 'PENDING', newStatus: status,
            performedBy: creador, performedAt: addMin(startsAt, -2880),
          },
        });
      }

      if (status === 'CONFIRMED') {
        await prisma.reminderLog.create({
          data: { appointmentId: turno.id, channel: 'WHATSAPP', status: 'SENT', sentAt: NOW },
        });
      }

      cursor += svc.dur;
      apptSeq++;
    }

    slotIdx++;
  }

  console.log(`✅ ${totalTurnos} turnos creados.`);
  console.log(`✅ ${totalPagos} pagos registrados.`);

  /* ──────────────────────────────────────────────────────────── */
  const [cTurnos, cPagos, cAvail, cPac, cProf] = await Promise.all([
    prisma.appointment.count(),
    prisma.payment.count(),
    prisma.availability.count(),
    prisma.patient.count(),
    prisma.professional.count(),
  ]);
  console.log('────────────────────────────────────────');
  console.log('📊 Resumen total en DB:');
  console.log(`   · Profesionales:    ${cProf}`);
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
import cron from 'node-cron';
import prisma from '../config/prisma.js';
import transporter from '../config/mailer.js';
import {
  INSTITUCION
} from '../constants/institucion.js';
import {
  linkWhatsApp
} from './whatsapp.js';
import {
  CLINIC_TZ
} from './tiempo.js';

const TZ = CLINIC_TZ;


const fmtFecha = (d) =>
  new Intl.DateTimeFormat('es-AR', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(d));

const fmtHora = (d) =>
  new Intl.DateTimeFormat('es-AR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(d)) + ' hs';

const datosTurno = (turno) => ({
  paciente: turno.patient?.person?.name || 'Paciente',
  telefono: turno.patient?.person?.phone || '',
  emailPaciente: turno.patient?.person?.email || '',
  profesional: turno.professionalService?.professional?.person?.name || '',
  emailProfesional: turno.professionalService?.professional?.person?.email || '',
  servicio: turno.professionalService?.service?.name || 'tu turno',
  nota: turno.professionalService?.service?.reminderNote || '',
  fecha: fmtFecha(turno.startsAt),
  hora: fmtHora(turno.startsAt),
});

const pieInstitucion = () => [INSTITUCION.nombre, INSTITUCION.direccion, INSTITUCION.telefono]
  .filter(Boolean)
  .join(' · ');

const textoRecordatorio = (d) => {
  const lineas = [
    `Hola ${d.paciente}! Te recordamos tu turno en ${INSTITUCION.nombre}:`,
    `📅 ${d.fecha}`,
    `🕐 ${d.hora}`,
    `💆 ${d.servicio}${d.profesional ? ` con ${d.profesional}` : ''}`,
  ];
  if (d.nota) lineas.push(`📌 ${d.nota}`);
  lineas.push('Si necesitás cancelar o reprogramar, avisanos. ¡Te esperamos!');
  return lineas.join('\n');
};

const enviarEmailPaciente = async (turno) => {
  const d = datosTurno(turno);
  if (!d.emailPaciente) {
    console.warn(`✉️  Paciente sin email; se omite recordatorio del turno ${turno.id}`);
    return {
      channel: 'EMAIL',
      skipped: true,
      reason: 'El paciente no tiene email cargado'
    };
  }

  try {
    await transporter.sendMail({
      from: `"${INSTITUCION.nombre}" <${process.env.EMAIL_USER}>`,
      to: d.emailPaciente,
      subject: `Recordatorio de turno - ${INSTITUCION.nombre}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid colors.border; border-radius: 10px;">
          <h2 style="color: colors.brand; text-align: center;">Recordatorio de tu turno</h2>
          <p>Hola <b>${d.paciente}</b>,</p>
          <p>Te recordamos que tenés un turno programado:</p>
          <div style="background-color: #f8f4ff; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 6px 0;"><b>📅 Fecha:</b> ${d.fecha}</p>
            <p style="margin: 6px 0;"><b>🕐 Hora:</b> ${d.hora}</p>
            <p style="margin: 6px 0;"><b>💆 Servicio:</b> ${d.servicio}</p>
            ${d.profesional ? `<p style="margin: 6px 0;"><b>👩‍⚕️ Profesional:</b> ${d.profesional}</p>` : ''}
            ${d.nota ? `<p style="margin: 12px 0 0; padding: 10px; background:status.warning.soft; border-radius:6px;"><b>📌 Importante:</b> ${d.nota}</p>` : ''}
          </div>
          <p>Si necesitás cancelar o reprogramar tu turno, por favor contactanos con anticipación.</p>
          <p style="color: colors.textSubtle; font-size: 14px;">${pieInstitucion()}</p>
          <p style="color: colors.textMuted; font-size: 12px;">Este es un mensaje automático, por favor no respondas este correo.</p>
        </div>
      `,
    });

    await prisma.reminderLog.create({
      data: {
        appointmentId: turno.id,
        channel: 'EMAIL',
        status: 'SENT'
      },
    });
    console.log(`✅ Recordatorio al paciente enviado (${d.emailPaciente}) · turno ${turno.id}`);
    return {
      channel: 'EMAIL',
      status: 'SENT',
      to: d.emailPaciente
    };
  } catch (error) {
    await prisma.reminderLog.create({
      data: {
        appointmentId: turno.id,
        channel: 'EMAIL',
        status: 'FAILED'
      },
    });
    console.error(`❌ Falló recordatorio al paciente · turno ${turno.id}:`, error.message);
    return {
      channel: 'EMAIL',
      status: 'FAILED',
      error: error.message
    };
  }
};

const enviarEmailProfesional = async (turno) => {
  const d = datosTurno(turno);
  if (!d.emailProfesional) {
    console.warn(`✉️  Profesional sin email; se omite aviso del turno ${turno.id}`);
    return {
      channel: 'WHATSAPP',
      skipped: true,
      reason: 'La profesional no tiene email cargado'
    };
  }

  const mensajeWa = textoRecordatorio(d);
  const link = linkWhatsApp(d.telefono, mensajeWa); // null si el paciente no tiene teléfono

  const bloqueWa = link ?
    `
        <div style="text-align:center; margin: 22px 0;">
          <a href="${link}" target="_blank"
             style="display:inline-block; background:#25D366; color:#fff; text-decoration:none;
                    padding:14px 22px; border-radius:8px; font-weight:bold; font-size:15px;">
            📲 Enviar recordatorio por WhatsApp
          </a>
        </div>
        <p style="font-size:13px; color:colors.textSubtle;">Al tocar el botón se abre WhatsApp con este mensaje ya escrito:</p>
        <pre style="white-space:pre-wrap; background:colors.borderSoft; padding:12px; border-radius:8px; font-family:inherit; font-size:13px; color:colors.text;">${mensajeWa}</pre>
      ` :
    `
        <div style="margin: 20px 0; padding: 14px; background:status.error.bg; border:1px solid #fecaca; border-radius:8px; color:#b91c1c;">
          ⚠️ El paciente <b>no tiene teléfono registrado</b>, no fue posible generar el link de WhatsApp.
        </div>
      `;

  try {
    await transporter.sendMail({
      from: `"${INSTITUCION.nombre}" <${process.env.EMAIL_USER}>`,
      to: d.emailProfesional,
      subject: `Recordatorio para mañana: ${d.paciente} · ${d.hora}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid colors.border; border-radius: 10px;">
          <h2 style="color: colors.brand; text-align: center;">Recordatorio de turno</h2>
          <p>Hola <b>${d.profesional || ''}</b>, tenés este turno próximamente:</p>
          <div style="background-color: #f8f4ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 6px 0;"><b>🧑 Paciente:</b> ${d.paciente}</p>
            <p style="margin: 6px 0;"><b>📅 Fecha:</b> ${d.fecha}</p>
            <p style="margin: 6px 0;"><b>🕐 Hora:</b> ${d.hora}</p>
            <p style="margin: 6px 0;"><b>💆 Servicio:</b> ${d.servicio}</p>
            ${d.nota ? `<p style="margin: 6px 0;"><b>📌 Nota:</b> ${d.nota}</p>` : ''}
          </div>
          ${bloqueWa}
          <p style="color: colors.textSubtle; font-size: 14px;">${pieInstitucion()}</p>
        </div>
      `,
    });

    await prisma.reminderLog.create({
      data: {
        appointmentId: turno.id,
        channel: 'WHATSAPP',
        status: 'SENT'
      },
    });
    console.log(`✅ Aviso a la profesional enviado (${d.emailProfesional}) · turno ${turno.id}`);
    return {
      channel: 'WHATSAPP',
      status: 'SENT',
      to: d.emailProfesional,
      waLink: link
    };
  } catch (error) {
    await prisma.reminderLog.create({
      data: {
        appointmentId: turno.id,
        channel: 'WHATSAPP',
        status: 'FAILED'
      },
    });
    console.error(`❌ Falló aviso a la profesional · turno ${turno.id}:`, error.message);
    return {
      channel: 'WHATSAPP',
      status: 'FAILED',
      error: error.message
    };
  }
};

const turnoParaRecordatorio = (id) =>
  prisma.appointment.findUnique({
    where: {
      id
    },
    include: {
      patient: {
        include: {
          person: true
        }
      },
      professionalService: {
        include: {
          professional: {
            include: {
              person: true
            }
          },
          service: true,
        },
      },
    },
  });


export const enviarRecordatorioTurno = async (appointmentId) => {
  const turno = await turnoParaRecordatorio(appointmentId);
  if (!turno) return {
    ok: false,
    error: 'Turno no encontrado'
  };

  const paciente = await enviarEmailPaciente(turno);
  const profesional = await enviarEmailProfesional(turno);

  return {
    ok: true,
    resultados: [paciente, profesional]
  };
};


export const procesarRecordatorios = async () => {
  console.log('🔔 Procesando recordatorios...');
  try {
    const horasAntes = Number(process.env.RECORDATORIO_HORAS_ANTES || 24);
    const ahora = new Date();
    const hasta = new Date(ahora.getTime() + horasAntes * 60 * 60 * 1000);

    const turnos = await prisma.appointment.findMany({
      where: {
        startsAt: {
          gte: ahora,
          lte: hasta
        },
        status: {
          in: ['PENDING', 'CONFIRMED']
        },
      },
      include: {
        patient: {
          include: {
            person: true
          }
        },
        professionalService: {
          include: {
            professional: {
              include: {
                person: true
              }
            },
            service: true,
          },
        },
        // Traemos solo los logs SENT para saber qué canales ya se enviaron.
        reminders: {
          where: {
            status: 'SENT'
          }
        },
      },
    });

    console.log(`🔎 Turnos en ventana de ${horasAntes} hs: ${turnos.length}`);

    for (const turno of turnos) {
      const yaEnviado = new Set(turno.reminders.map((r) => r.channel));
      if (!yaEnviado.has('EMAIL')) await enviarEmailPaciente(turno);
      if (!yaEnviado.has('WHATSAPP')) await enviarEmailProfesional(turno);
    }

    console.log('🔔 Procesamiento de recordatorios finalizado');
  } catch (error) {
    console.error('🔴 Error al procesar recordatorios:', error.message);
  }
};


const iniciarRecordatorios = () => {
  cron.schedule(
    '0 * * * *',
    async () => {
      console.log('⏰ Cron de recordatorios:', new Date().toLocaleString('es-AR', {
        timeZone: TZ
      }));
      await procesarRecordatorios();
    }, {
      timezone: TZ
    }
  );

  console.log('✅ Sistema de recordatorios iniciado (cada hora, ventana 24 hs, TZ ' + TZ + ')');
};

export default iniciarRecordatorios;
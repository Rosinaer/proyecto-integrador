// estetica-backend/src/utils/tiempo.js
export const CLINIC_TZ = process.env.GOOGLE_CALENDAR_TZ || 'America/Argentina/Buenos_Aires';

const partesEnZona = (ms, tz) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
    .formatToParts(new Date(ms))
    .reduce((o, p) => ((o[p.type] = p.value), o), {});

const offsetMs = (ms, tz) => {
  const p = partesEnZona(ms, tz);
  const comoUtc = Date.UTC(+p.year, p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return comoUtc - ms;
};

export const instanteDesdeParedLocal = (dateStr, horaStr, tz = CLINIC_TZ) => {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, mi] = horaStr.split(':').map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi, 0);
  const off1 = offsetMs(guess, tz);
  let ms = guess - off1;
  const off2 = offsetMs(ms, tz);
  if (off2 !== off1) ms = guess - off2;
  return new Date(ms);
};

export const minutoDelDiaEnZona = (instante, tz = CLINIC_TZ) => {
  const p = partesEnZona(new Date(instante).getTime(), tz);
  return (Number(p.hour) % 24) * 60 + Number(p.minute);
};

// ─────────────────────────────────────────────────────────────
// Rango de un día/rango en HORA DE LA CLÍNICA (arregla los bugs de
// "no aparece lo de hoy" cerca de la medianoche).
//
// 'YYYY-MM-DD' (fecha plana) -> se interpreta en la zona de la clínica:
//    desde -> 00:00:00 de ese día (hora local)
//    hasta -> tope EXCLUSIVO: 00:00 del día siguiente (hora local) => usa `lt`
// ISO completo (ej. '...T03:00:00.000Z') -> se respeta tal cual (gte/lte).
// ─────────────────────────────────────────────────────────────
const esFechaPlana = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

const sumarDiasYmd = (ymd, n) => {
  const [y, m, d] = ymd.split('-').map(Number);
  const p = new Date(Date.UTC(y, m - 1, d + n));
  const pad = (x) => String(x).padStart(2, '0');
  return `${p.getUTCFullYear()}-${pad(p.getUTCMonth() + 1)}-${pad(p.getUTCDate())}`;
};

export const rangoDiaClinica = (desde, hasta, tz = CLINIC_TZ) => {
  const filtro = {};

  if (desde) {
    filtro.gte = esFechaPlana(desde)
      ? instanteDesdeParedLocal(desde, '00:00', tz)
      : new Date(desde);
  }

  if (hasta) {
    if (esFechaPlana(hasta)) {
      // tope exclusivo: medianoche del día siguiente en hora de la clínica
      filtro.lt = instanteDesdeParedLocal(sumarDiasYmd(hasta, 1), '00:00', tz);
    } else {
      filtro.lte = new Date(hasta);
    }
  }

  return filtro;
};
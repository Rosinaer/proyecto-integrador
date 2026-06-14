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
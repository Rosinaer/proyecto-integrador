import { CLINIC_TZ } from "../config/clinica";


export const STORAGE_INSTANTS_ARE_REAL = true;

export const LECTURA_TZ = STORAGE_INSTANTS_ARE_REAL ? CLINIC_TZ : "UTC";

export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const MESES_ABREV = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

export const pad = (n) => String(n).padStart(2, "0");

export const ymd = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

export const parseYmd = (s) => new Date(`${s}T12:00:00Z`);

export const addDays = (s, n) => {
  const d = parseYmd(s);
  d.setUTCDate(d.getUTCDate() + n);
  return ymd(d);
};

export const lunesDe = (s) => {
  const d = parseYmd(s);
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return ymd(d);
};

const partesEnZona = (iso, tz) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  })
    .formatToParts(new Date(iso))
    .reduce((o, p) => ((o[p.type] = p.value), o), {});

const partesEnTz = (ms, tz) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  })
    .formatToParts(new Date(ms))
    .reduce((o, p) => ((o[p.type] = p.value), o), {});

const offsetMs = (ms, tz) => {
  const p = partesEnTz(ms, tz);
  return Date.UTC(+p.year, p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - ms;
};

export const instanteParaApi = (dateStr, horaStr) => {
  if (!STORAGE_INSTANTS_ARE_REAL) return `${dateStr}T${horaStr}:00.000Z`;
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = horaStr.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi, 0);
  const off1 = offsetMs(guess, CLINIC_TZ);
  let ms = guess - off1;
  const off2 = offsetMs(ms, CLINIC_TZ);
  if (off2 !== off1) ms = guess - off2;
  return new Date(ms).toISOString();
};

export const ymdDeInstante = (iso) => {
  const p = partesEnZona(iso, LECTURA_TZ);
  return `${p.year}-${p.month}-${p.day}`;
};

export const horaDeInstante = (iso) => {
  const p = partesEnZona(iso, LECTURA_TZ);
  return Number(p.hour) % 24;
};

export const minutosDelDia = (iso) => {
  const p = partesEnZona(iso, LECTURA_TZ);
  return (Number(p.hour) % 24) * 60 + Number(p.minute);
};

export const hoyLectura = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: LECTURA_TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());

export const diaNumero = (s) => parseYmd(s).getUTCDate();

export const fmtHora = (iso) =>
  new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: LECTURA_TZ });

export const fmtMomento = (iso) =>
  new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: LECTURA_TZ,
  });

export const fmtFechaLargaISO = (iso) =>
  new Date(iso).toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: LECTURA_TZ,
  });

export const fmtFechaLarga = (s) => {
  const d = parseYmd(s);
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
};

export const fmtFechaDia = (s) => {
  const d = parseYmd(s);
  return `${d.getUTCDate()} ${MESES_ABREV[d.getUTCMonth()]}`;
};

export const fmtRangoSemana = (lunesStr) => {
  const ini = parseYmd(lunesStr);
  const fin = parseYmd(addDays(lunesStr, 5));
  return `${ini.getUTCDate()} ${MESES_ABREV[ini.getUTCMonth()]} — ${fin.getUTCDate()} ${MESES_ABREV[fin.getUTCMonth()]} ${fin.getUTCFullYear()}`;
};

export const fmtPrecio = (val) => {
  if (val === null || val === undefined) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(val);
};

// 'YYYY-MM-DD' (o ISO completo) -> límites UTC correctos para la zona de la clínica.
const esFechaPlana = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

const sumarDiasYmd = (ymd, n) => {
  const [y, m, d] = ymd.split('-').map(Number);
  const p = new Date(Date.UTC(y, m - 1, d + n));
  const pad = (x) => String(x).padStart(2, '0');
  return `${p.getUTCFullYear()}-${pad(p.getUTCMonth() + 1)}-${pad(p.getUTCDate())}`;
};

// Devuelve { gte, lt } / { gte, lte } listo para Prisma.
export const rangoDiaClinica = (desde, hasta, tz = CLINIC_TZ) => {
  const filtro = {};
  if (desde) {
    filtro.gte = esFechaPlana(desde)
      ? instanteDesdeParedLocal(desde, '00:00', tz)
      : new Date(desde);
  }
  if (hasta) {
    filtro.lt = esFechaPlana(hasta)
      ? instanteDesdeParedLocal(sumarDiasYmd(hasta, 1), '00:00', tz) // exclusivo: 00:00 del día siguiente
      : new Date(hasta);
    if (!esFechaPlana(hasta)) { filtro.lte = filtro.lt; delete filtro.lt; }
  }
  return filtro;
};
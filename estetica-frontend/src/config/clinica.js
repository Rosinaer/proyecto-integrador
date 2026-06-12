export const CLINIC_TZ = "America/Argentina/Buenos_Aires";

export const fechaClinicaStr = (date = new Date()) => {
  // en-CA da formato YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
};

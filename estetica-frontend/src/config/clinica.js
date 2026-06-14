export const CLINIC_TZ = "America/Argentina/Buenos_Aires";

export const fechaClinicaStr = (date = new Date()) => {

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
};


export const TEL_PAIS = "54";
export const TEL_AREA_DEFAULT = "11";
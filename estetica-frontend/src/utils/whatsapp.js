// estetica-frontend/src/utils/whatsapp.js
//
// Arma el link de WhatsApp en el navegador (no por email), así los emojis
// NO se rompen: el problema de "no aparecen los emojis" pasa cuando el link
// viaja dentro del email y Gmail/Outlook lo re-envuelven y mastican el
// percent-encoding UTF-8. Generándolo y abriéndolo directo desde la app,
// encodeURIComponent + WhatsApp decodifican bien y los emojis se ven.

import { fmtFechaLargaISO, fmtHora } from "./fecha";

// Nombre de la clínica para el saludo. Si querés, podés moverlo a un .env
// (VITE_CLINICA_NOMBRE) y leerlo con import.meta.env.
export const CLINICA_NOMBRE =
  import.meta.env.VITE_CLINICA_NOMBRE || "Espacio Senda";

const soloDigitos = (s) => String(s ?? "").replace(/\D/g, "");

// Normaliza un teléfono guardado a formato wa.me (54 9 + área + número).
// Tolera: bare "1150261234", con 0 / 15, ya normalizado "5491150261234", etc.
export const numeroWa = (raw, paisDefault = "54") => {
  let d = soloDigitos(raw);
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2);

  if (d.startsWith(paisDefault)) {
    let resto = d.slice(paisDefault.length);
    if (paisDefault === "54") {
      if (!resto.startsWith("9")) resto = "9" + resto;
      resto = resto.replace(/^9(\d{2,4})15(\d+)$/, "9$1$2");
    }
    d = paisDefault + resto;
  } else {
    d = d.replace(/^0/, "");
    d = d.replace(/^(\d{2,4})15(\d+)$/, "$1$2");
    if (d.startsWith("15")) d = d.slice(2);
    d = paisDefault === "54" ? `549${d}` : `${paisDefault}${d}`;
  }

  return d.length >= 12 && d.length <= 15 ? d : null;
};

// Mensaje de recordatorio (mismo texto/emojis que el del backend).
export const textoRecordatorioWa = (turno) => {
  const pac = turno?.patient?.person?.name || "";
  const serv = turno?.professionalService?.service?.name || "tu turno";
  const prof = turno?.professionalService?.professional?.person?.name || "";
  const nota = turno?.professionalService?.service?.reminderNote || "";

  const lineas = [
    `Hola ${pac}! Te recordamos tu turno en ${CLINICA_NOMBRE}:`,
    `📅 ${fmtFechaLargaISO(turno?.startsAt)}`,
    `🕐 ${fmtHora(turno?.startsAt)} hs`,
    `💆 ${serv}${prof ? ` con ${prof}` : ""}`,
  ];
  if (nota) lineas.push(`📌 ${nota}`);
  lineas.push("Si necesitás cancelar o reprogramar, avisanos. ¡Te esperamos!");
  return lineas.join("\n");
};

// Devuelve el link wa.me listo (o null si el paciente no tiene teléfono válido).
export const linkWhatsAppTurno = (turno) => {
  const num = numeroWa(turno?.patient?.person?.phone);
  if (!num) return null;
  return `https://wa.me/${num}?text=${encodeURIComponent(textoRecordatorioWa(turno))}`;
};

// Abre WhatsApp en una pestaña nueva. Devuelve false si no hay teléfono.
export const abrirWhatsAppTurno = (turno) => {
  const link = linkWhatsAppTurno(turno);
  if (!link) return false;
  window.open(link, "_blank", "noopener,noreferrer");
  return true;
};
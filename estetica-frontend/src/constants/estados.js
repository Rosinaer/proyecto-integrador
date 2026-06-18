import { status } from "../theme/colors";

const c = (s, label) => ({ label, bg: s.soft, fg: s.fg });

export const ESTADOS = {
  PENDING:     c(status.warning, "Pendiente"),
  CONFIRMED:   c(status.success, "Confirmado"),
  IN_PROGRESS: c(status.info, "En curso"),
  COMPLETED:   { label: "Completado", bg: "#d1fae5", fg: "#065f46" },
  CANCELLED:   c(status.error, "Cancelado"),
  NO_SHOW:     { label: "No asistió", bg: status.neutral.soft, fg: status.neutral.fg },
};

export const PAGO = {
  PENDING:   c(status.warning, "Pendiente"),
  PARTIAL:   { label: "Parcial", bg: "#ffedd5", fg: "#9a3412" },
  COMPLETED: c(status.success, "Pagado"),
  REFUNDED:  { label: "Reembolsado", bg: status.neutral.soft, fg: status.neutral.fg },
};

export const SYNC = {
  SYNCHRONIZED: c(status.success, "Sincronizado"),
  PENDING:      c(status.warning, "Pendiente"),
  FAILED:       c(status.error, "Falló"),
};

export const LOG = {
  SENT:   c(status.success, "Enviado"),
  FAILED: c(status.error, "Falló"),
  READ:   c(status.info, "Leído"),
};

export const CANAL = { WHATSAPP: "WhatsApp", EMAIL: "Email", SMS: "SMS" };

export const CANCELADO = (s) => s === "CANCELLED" || s === "NO_SHOW";

// ── Opciones de cobro (compartidas por Turnos, Control de Turnos y Cobros) ──
export const METODOS = [
  { value: "CASH", label: "Efectivo" },
  { value: "TRANSFER", label: "Transferencia" },
  { value: "CREDIT_CARD", label: "Tarjeta crédito" },
  { value: "DEBIT_CARD", label: "Tarjeta débito" },
];

export const TIPOS_PAGO = [
  { value: "FULL_PAYMENT", label: "Pago total" },
  { value: "DEPOSIT", label: "Seña" },
  { value: "FINAL_PAYMENT", label: "Pago final" },
];
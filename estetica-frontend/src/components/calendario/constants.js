import {colors, status} from "../../theme/colors"; 

export const PALETA = [{
    bg: "#ede9fe",
    border: colors.brand,
    text: "#4c1d95",
    dot: colors.brand
  },
  {
    bg: "#fce7f3",
    border: "#db2777",
    text: "#831843",
    dot: "#db2777"
  },
  {
    bg: "#ccfbf1",
    border: "#0d9488",
    text: "#134e4a",
    dot: "#0d9488"
  },
  {
    bg: "#fef3c7",
    border: "#d97706",
    text: "#78350f",
    dot: "#d97706"
  },
  {
    bg: status.info.soft,
    border: "#2563eb",
    text: "#1e3a8a",
    dot: "#2563eb"
  },
];

export const STATUS_MAP = {
  PENDING: {
    label: "Pendiente",
    bg: status.warning.soft,
    color: status.warning.fg
  },
  CONFIRMED: {
    label: "Confirmado",
    bg: status.success.soft,
    color: status.success.fg
  },
  IN_PROGRESS: {
    label: "En curso",
    bg: status.info.soft,
    color: status.info.fg
  },
  COMPLETED: {
    label: "Completado",
    bg: colors.borderSoft,
    color: colors.text
  },
  CANCELLED: {
    label: "Cancelado",
    bg: status.error.soft,
    color: status.error.fg
  },
};

export const HORAS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
export const DIAS_ABREV = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
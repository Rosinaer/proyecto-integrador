import { TEL_PAIS, TEL_AREA_DEFAULT } from "../config/clinica";

const soloDigitos = (s) => String(s ?? "").replace(/\D/g, "");


export const armarTelefono = ({ area, numero, pais = TEL_PAIS }) => {
  const p = soloDigitos(pais);
  const a = soloDigitos(area).replace(/^0/, "");    // por si pegaron el 0
  const n = soloDigitos(numero).replace(/^15/, "");  // por si pegaron el 15
  if (!a || !n) return "";
  return p === "54" ? `${p}9${a}${n}` : `${p}${a}${n}`;
};


export const validarTelefono = ({ area, numero }) => {
  const a = soloDigitos(area);
  const n = soloDigitos(numero).replace(/^15/, "");
  if (a.length < 2 || a.length > 4) return "El código de área debe tener entre 2 y 4 dígitos.";
  if (n.length < 6 || n.length > 8) return "El número debe tener entre 6 y 8 dígitos (sin 0 ni 15).";
  return null;
};


export const partirTelefono = (stored, areaDefault = TEL_AREA_DEFAULT) => {
  let d = soloDigitos(stored);
  if (!d) return { area: areaDefault, numero: "" };
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith(TEL_PAIS)) d = d.slice(TEL_PAIS.length); 
  if (d.startsWith("9")) d = d.slice(1);                    
  d = d.replace(/^0/, "");                                   
  if (d.startsWith("11")) return { area: "11", numero: d.slice(2) };
  if (d.length > 7) return { area: d.slice(0, 3), numero: d.slice(3) };
  return { area: areaDefault, numero: d };
};
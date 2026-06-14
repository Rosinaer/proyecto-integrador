const esLargoValido = (d) => d.length >= 12 && d.length <= 15;

const soloDigitos = (s) => String(s ?? '').replace(/\D/g, '');


export const waNumeroAR = ({ area, numero, pais = '54' }) => {
  let a = soloDigitos(area).replace(/^0/, '');   // por si pegaron el 0
  let n = soloDigitos(numero).replace(/^15/, ''); // por si pegaron el 15
  if (a.length < 2 || a.length > 4) return null;
  if (n.length < 6 || n.length > 8) return null;
  return pais === '54' ? `${pais}9${a}${n}` : `${pais}${a}${n}`;
};


export const normalizarTelefono = (raw, paisDefault = '54') => {
  if (!raw) return null;
  let d = soloDigitos(raw);
  if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  
  if (d.startsWith(paisDefault)) {
    let resto = d.slice(paisDefault.length);
    if (paisDefault === '54') {
      if (!resto.startsWith('9')) resto = '9' + resto;       
      resto = resto.replace(/^9(\d{2,4})15(\d+)$/, '9$1$2');   
    }
    const full = paisDefault + resto;
    return esLargoValido(full) ? full : null;
  }

  
  d = d.replace(/^0/, '');
  d = d.replace(/^(\d{2,4})15(\d+)$/, '$1$2'); // área + 15 + número -> área + número
  if (d.startsWith('15')) d = d.slice(2);

  const full = paisDefault === '54' ? `549${d}` : `${paisDefault}${d}`;
  return esLargoValido(full) ? full : null;
};


export const linkWhatsApp = (telefono, texto) => {
  const num = normalizarTelefono(telefono);
  if (!num) return null;
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
};
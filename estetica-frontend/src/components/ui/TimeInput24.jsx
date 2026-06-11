// ============================================================

// TimeInput24 — selector de hora en formato 24h (00–23 : minutos)

// ============================================================



const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));

const MINUTOS_BASE = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];



const baseSelect = {

  padding: "9px 12px",

  border: "1px solid #ccc",

  borderRadius: "6px",

  fontSize: "14px",

  backgroundColor: "#fff",

};



export const TimeInput24 = ({ value = "00:00", onChange, disabled = false, style }) => {

  const [hRaw = "00", mRaw = "00"] = String(value || "").split(":");

  const h = hRaw.padStart(2, "0");

  const m = mRaw.padStart(2, "0");



  // Si el valor trae un minuto fuera de la grilla de 5 (ej "09:07"),

  // lo agregamos a las opciones para no perderlo.

  const minutos = MINUTOS_BASE.includes(m)

    ? MINUTOS_BASE

    : [...MINUTOS_BASE, m].sort();



  const emit = (nh, nm) => onChange && onChange(`${nh}:${nm}`);



  const selStyle = { ...baseSelect, ...style };



  return (

    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>

      <select

        style={{ ...selStyle }}

        value={h}

        disabled={disabled}

        onChange={(e) => emit(e.target.value, m)}

        aria-label="Hora"

      >

        {HORAS.map((hh) => (

          <option key={hh} value={hh}>{hh}</option>

        ))}

      </select>

      <span style={{ color: "#64748b", fontWeight: 700 }}>:</span>

      <select

        style={{ ...selStyle }}

        value={m}

        disabled={disabled}

        onChange={(e) => emit(h, e.target.value)}

        aria-label="Minutos"

      >

        {minutos.map((mm) => (

          <option key={mm} value={mm}>{mm}</option>

        ))}

      </select>

    </div>

  );

};



export default TimeInput24;



export const Select = ({ label, id, options = [], ...props }) => {

  return (

    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px'}}>

      {label && (

        <label htmlFor={id} style={{ color: '#6a1b9a', fontWeight: 'bold', fontSize: '14px' }}>

          {label}

        </label>

      )}

      <select id={id} {...props} style={{boxSizing: 'border-box', backgroundColor: 'white' }}>

        <option value="">Seleccione una opción...</option>

        {options.map((opt, index) => (

          <option key={index} value={opt.value}>

            {opt.label}

          </option>

        ))}

      </select>

    </div>

  );

};
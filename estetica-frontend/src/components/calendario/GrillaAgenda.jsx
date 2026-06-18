import { fmtHora, fmtFechaLarga, minutosDelDia } from "../../utils/fecha";
import { fechaClinicaStr } from "../../config/clinica";
import {colors} from "../../theme/colors"; 


export const HORA_INI = 7;
export const HORA_FIN = 21;
export const PX_MIN = 0.8;
export const ALTO = (HORA_FIN - HORA_INI) * 60 * PX_MIN;
export const GUTTER = 52;
export const HEADER_H = 48; // alto fijo de la cabecera, para que todos los cuerpos arranquen igual

const pad = (n) => String(n).padStart(2, "0");

export const CANCELADO = (s) => s === "CANCELLED" || s === "NO_SHOW";

function empacar(items) {
  const evs = items
    .map((t) => ({ t, s: minutosDelDia(t.startsAt), e: minutosDelDia(t.endsAt) }))
    .sort((a, b) => a.s - b.s || a.e - b.e);
  const out = [];
  let cluster = [];
  let clusterEnd = -1;
  const cerrar = () => {
    const cols = [];
    cluster.forEach((ev) => {
      let col = cols.findIndex((end) => end <= ev.s);
      if (col === -1) { col = cols.length; cols.push(ev.e); } else cols[col] = ev.e;
      ev.col = col;
    });
    const lanes = cols.length;
    cluster.forEach((ev) => out.push({ ...ev, lanes }));
    cluster = []; clusterEnd = -1;
  };
  evs.forEach((ev) => {
    if (cluster.length && ev.s >= clusterEnd) cerrar();
    cluster.push(ev);
    clusterEnd = Math.max(clusterEnd, ev.e);
  });
  if (cluster.length) cerrar();
  return out;
}

export const Columna = ({ items, colorDe, onPick }) => (
  <div style={{
    position: "relative", height: ALTO, borderLeft: "1px solid colors.border",
    backgroundImage: `repeating-linear-gradient(to bottom, colors.borderSoft 0, colors.borderSoft 1px, transparent 1px, transparent ${60 * PX_MIN}px)`,
  }}>
    {empacar(items).map(({ t, s, e, col, lanes }) => {
      const top = Math.max(0, (s - HORA_INI * 60) * PX_MIN);
      const height = Math.max(16, (e - s) * PX_MIN - 2);
      const color = colorDe[t.professionalService?.professional?.id] || colors.brand;
      const cancel = CANCELADO(t.status);
      const w = 100 / lanes;
      return (
        <div key={t.id} onClick={() => onPick(t)} title={`${fmtHora(t.startsAt)} · ${t.patient?.person?.name || ""}`}
          style={{
            position: "absolute", top, height, left: `calc(${w * col}% + 2px)`, width: `calc(${w}% - 4px)`,
            background: `${color}1a`, borderLeft: `3px solid ${color}`, borderRadius: 6, padding: "2px 5px",
            overflow: "hidden", cursor: "pointer", fontSize: 11, lineHeight: 1.25, boxSizing: "border-box",
            opacity: cancel ? 0.55 : 1,
          }}>
          <div style={{ fontWeight: 700, color, textDecoration: cancel ? "line-through" : "none" }}>{fmtHora(t.startsAt)}</div>
          <div style={{ color: colors.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.patient?.person?.name || "—"}</div>
          {height > 42 && <div style={{ color: colors.textSubtle, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.professionalService?.service?.name}</div>}
        </div>
      );
    })}
  </div>
);

export const ColumnaCobertura = ({ slots, colorDe, nombreDe, onPick }) => {
  const items = slots.map((s) => ({ ...s, startsAt: s.startTime, endsAt: s.endTime }));
  return (
    <div style={{
      position: "relative", height: ALTO, borderLeft: "1px solid colors.border",
      backgroundImage: `repeating-linear-gradient(to bottom, colors.borderSoft 0, colors.borderSoft 1px, transparent 1px, transparent ${60 * PX_MIN}px)`,
    }}>
      {empacar(items).map(({ t, s, e, col, lanes }) => {
        const top = Math.max(0, (s - HORA_INI * 60) * PX_MIN);
        const height = Math.max(18, (e - s) * PX_MIN - 2);
        const color = colorDe[t.professionalId] || colors.brand;
        const ocupados = (t.appointments || []).filter((a) => !CANCELADO(a.status)).length;
        const w = 100 / lanes;
        return (
          <div key={t.id}
            onClick={() => onPick && onPick(t)}
            title={`${nombreDe[t.professionalId] || ""} · ${fmtHora(t.startTime)}–${fmtHora(t.endTime)}${ocupados ? ` · ${ocupados} turno${ocupados === 1 ? "" : "s"}` : " · libre"}`}
            style={{
              position: "absolute", top, height, left: `calc(${w * col}% + 2px)`, width: `calc(${w}% - 4px)`,
              background: `${color}14`, border: `1px solid ${color}40`, borderLeft: `3px solid ${color}`,
              borderRadius: 6, padding: "3px 6px", overflow: "hidden", fontSize: 11, lineHeight: 1.2,
              boxSizing: "border-box", cursor: onPick ? "pointer" : "default",
            }}>
            <div style={{ fontWeight: 700, color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {nombreDe[t.professionalId] || "—"}
            </div>
            <div style={{ color: colors.textSecondary, whiteSpace: "nowrap" }}>{fmtHora(t.startTime)}–{fmtHora(t.endTime)}</div>
            {height > 50 && (
              <div style={{ color: colors.textSubtle }}>
                {ocupados > 0 ? `${ocupados} turno${ocupados === 1 ? "" : "s"} reservado${ocupados === 1 ? "" : "s"}` : "libre"}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export function GrillaAgenda({ columnas, minCol, children }) {
  const horas = Array.from({ length: HORA_FIN - HORA_INI }, (_, i) => HORA_INI + i);

  return (
    <div style={{ overflowX: "auto", border: "1px solid colors.border", borderRadius: 10, background: "#fff" }}>
      <div style={{ display: "flex", minWidth: GUTTER + columnas.length * minCol }}>

        {/* Gutter: hueco de cabecera + etiquetas de hora */}
        <div style={{ flex: `0 0 ${GUTTER}px` }}>
          <div style={{ height: HEADER_H, borderBottom: "1px solid colors.border" }} />
          <div style={{ position: "relative", height: ALTO }}>
            {horas.map((h) => (
              <div key={h} style={{ position: "absolute", top: (h - HORA_INI) * 60 * PX_MIN - 6, right: 6, fontSize: 11, color: colors.textMuted }}>
                {pad(h)}:00
              </div>
            ))}
          </div>
        </div>

        {/* Cada columna: cabecera y cuerpo juntos */}
        {columnas.map((c) => (
          <div key={c.key} style={{ flex: `1 0 ${minCol}px` }}>
            <div style={{
              height: HEADER_H, boxSizing: "border-box", overflow: "hidden",
              padding: "8px 6px", textAlign: "center",
              borderLeft: "1px solid colors.border", borderBottom: "1px solid colors.border",
              background: c.esHoy ? colors.brandBg : "#fff",
            }}>
              {c.cabecera}
            </div>
            {c.cuerpo}
          </div>
        ))}

      </div>
      {children}
    </div>
  );
}

export const CoberturaVista = ({ dias, slots, colorDe, nombreDe, onPick }) => {
  const minCol = 132;
  const slotsDe = (d) => slots.filter((s) => s.fecha === d);
  const hay = slots.length > 0;

  const columnas = dias.map((d) => {
    const slotsDia = slotsDe(d);
    const nFranjas = slotsDia.length;
    const reservados = slotsDia.reduce((acc, s) => acc + (s.appointments || []).filter((a) => !CANCELADO(a.status)).length, 0);
    const esHoy = d === fechaClinicaStr();
    return {
      key: d,
      esHoy,
      cabecera: (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, textTransform: "capitalize", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {fmtFechaLarga(d)}
          </div>
          <div style={{ fontSize: 11, color: colors.textMuted }}>
            {nFranjas > 0 ? `${nFranjas} franja${nFranjas === 1 ? "" : "s"} · ${reservados} reservado${reservados === 1 ? "" : "s"}` : "sin agenda"}
          </div>
        </>
      ),
      cuerpo: <ColumnaCobertura slots={slotsDia} colorDe={colorDe} nombreDe={nombreDe} onPick={onPick} />,
    };
  });

  return (
    <GrillaAgenda columnas={columnas} minCol={minCol}>
      {!hay && (
        <div style={{ padding: "30px 20px", textAlign: "center", color: colors.textMuted, fontSize: 14 }}>
          No hay agendas abiertas para esta semana. Generá la disponibilidad desde <strong>Agendas</strong>.
        </div>
      )}
    </GrillaAgenda>
  );
};
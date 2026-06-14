import { fmtHora, fmtPrecio, fmtFechaLargaISO } from "../../utils/fecha";
import { STATUS_MAP } from "./constants";

const FilaD = ({ icono, label, children }) => (
  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
    <span style={{ fontSize: "17px", minWidth: "22px", textAlign: "center" }}>{icono}</span>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "3px" }}>
        {label}
      </div>
      <div style={{ fontSize: "14px", color: "#1e293b" }}>{children}</div>
    </div>
  </div>
);

const ModalDetalleTurno = ({ turno, colorProf, onClose }) => {
  if (!turno) return null;

  const prof    = turno.professionalService?.professional?.person?.name || "—";
  const servNom = turno.professionalService?.service?.name || "—";
  const durMin  = turno.professionalService?.service?.durationMinutes;
  const precio  = turno.priceAtBooking ?? turno.professionalService?.price ?? null;
  const pacNom  = turno.patient?.person?.name || "—";
  const pacMail = turno.patient?.person?.email;
  const stCfg   = STATUS_MAP[turno.status] || { label: turno.status, bg: "#f1f5f9", color: "#334155" };

  const horaFin = turno.endsAt
    ? fmtHora(turno.endsAt)
    : durMin && turno.startsAt
      ? fmtHora(new Date(new Date(turno.startsAt).getTime() + durMin * 60000))
      : null;

  return (
    <div>
      <div style={{
        background: colorProf ? colorProf.bg : "#f5f3ff",
        borderLeft: `4px solid ${colorProf ? colorProf.border : "#6b21a8"}`,
        borderRadius: "8px",
        padding: "14px 16px",
        marginBottom: "16px",
      }}>
        <div style={{ fontSize: "13px", fontWeight: "600", color: colorProf?.text || "#6b21a8", marginBottom: "4px" }}>
          {fmtFechaLargaISO(turno.startsAt)}
        </div>
        <div style={{ fontSize: "24px", fontWeight: "800", color: "#1e293b" }}>
          {fmtHora(turno.startsAt)}
          {horaFin && (
            <span style={{ fontSize: "15px", color: "#64748b", fontWeight: "400" }}>
              {" "}→ {horaFin}
            </span>
          )}
          {durMin && (
            <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "400", marginLeft: "10px" }}>
              {durMin} min
            </span>
          )}
        </div>
      </div>

      <FilaD icono="👤" label="Paciente">
        <div style={{ fontWeight: "600" }}>{pacNom}</div>
        {pacMail && <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{pacMail}</div>}
      </FilaD>

      <FilaD icono="👩‍⚕️" label="Profesional">
        <div style={{ fontWeight: "600" }}>{prof}</div>
      </FilaD>

      <FilaD icono="💆" label="Servicio">
        <div style={{ fontWeight: "600" }}>{servNom}</div>
      </FilaD>

      <FilaD icono="💲" label="Precio registrado al momento de la reserva">
        <span style={{
          fontWeight: "700",
          color: precio ? "#166534" : "#94a3b8",
          fontSize: precio ? "16px" : "14px",
        }}>
          {fmtPrecio(precio)}
        </span>
        {precio && (
          <span style={{ fontSize: "11px", color: "#94a3b8", marginLeft: "6px" }}>
            (congelado — no varía si cambia la tarifa)
          </span>
        )}
      </FilaD>

      <FilaD icono="🏷️" label="Estado">
        <span style={{
          padding: "4px 12px", borderRadius: "12px",
          fontSize: "12px", fontWeight: "700",
          backgroundColor: stCfg.bg, color: stCfg.color,
          display: "inline-block",
        }}>
          {stCfg.label}
        </span>
      </FilaD>

      {turno.notes && (
        <FilaD icono="📝" label="Notas">
          <span style={{ fontStyle: "italic", color: "#64748b" }}>{turno.notes}</span>
        </FilaD>
      )}

      <div style={{
        marginTop: "14px", padding: "7px 10px",
        backgroundColor: "#fafafa", borderRadius: "6px",
        fontSize: "11px", color: "#cbd5e1",
      }}>
        ID: <code style={{ fontFamily: "monospace", color: "#94a3b8" }}>{turno.id}</code>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "18px" }}>
        <button
          onClick={onClose}
          style={{
            padding: "9px 22px", borderRadius: "8px",
            border: "1px solid #e2e8f0", background: "#f8fafc",
            cursor: "pointer", fontSize: "14px", color: "#374151",
          }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default ModalDetalleTurno;
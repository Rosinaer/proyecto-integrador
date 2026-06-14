import { memo } from "react";
import { fmtHora } from "../../utils/fecha";
import { STATUS_MAP } from "./constants";

const AppointmentChip = memo(function AppointmentChip({ turno, color, onSelect }) {
  const stCfg = STATUS_MAP[turno.status] || STATUS_MAP.PENDING;
  const esCancelado = turno.status === "CANCELLED";

  return (
    <div
      onClick={() => onSelect(turno)}
      title={`${turno.patient?.person?.name} — ${turno.professionalService?.service?.name}`}
      style={{
        backgroundColor: esCancelado ? "#f8fafc" : color.bg,
        borderLeft: `3px solid ${esCancelado ? "#cbd5e1" : color.border}`,
        borderRadius: "0 6px 6px 0",
        padding: "5px 7px",
        marginBottom: "4px",
        cursor: "pointer",
        opacity: esCancelado ? 0.55 : 1,
        transition: "opacity 0.15s, transform 0.1s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = "0.8";
        e.currentTarget.style.transform = "scale(1.02)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = esCancelado ? "0.55" : "1";
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      <div style={{
        fontWeight: "700",
        fontSize: "12px",
        color: esCancelado ? "#94a3b8" : color.text,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {fmtHora(turno.startsAt)} · {turno.patient?.person?.name?.split(" ")[0] || "—"}
      </div>
      <div style={{
        fontSize: "11px",
        color: esCancelado ? "#94a3b8" : color.text,
        opacity: 0.8,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {turno.professionalService?.service?.name || "—"}
      </div>
      {turno.status !== "CONFIRMED" && (
        <div style={{
          marginTop: "3px",
          display: "inline-block",
          padding: "1px 6px",
          borderRadius: "6px",
          fontSize: "10px",
          fontWeight: "700",
          backgroundColor: stCfg.bg,
          color: stCfg.color,
        }}>
          {stCfg.label}
        </div>
      )}
    </div>
  );
});

export default AppointmentChip;
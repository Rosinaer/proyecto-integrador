import { Fragment } from "react";
import { fmtFechaDia, diaNumero } from "../../utils/fecha";
import { HORAS, DIAS_ABREV, PALETA } from "./constants";
import AppointmentChip from "./AppointmentChip";

const celdaTH = {
  padding: "12px 8px",
  textAlign: "center",
  backgroundColor: "#fafbfc",
  borderBottom: "2px solid #e2e8f0",
  userSelect: "none",
};

const celdaHora = {
  padding: "8px 8px 0",
  fontSize: "11px",
  fontWeight: "700",
  color: "#94a3b8",
  textAlign: "right",
  borderRight: "1px solid #e2e8f0",
  backgroundColor: "#fafbfc",
  verticalAlign: "top",
};

const WeekGrid = ({ weekDays, hoyStr, grid, fueraDeRango, colorMap, onSelect }) => (
  <div style={{
    overflowX: "auto",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
  }}>
    <div style={{
      display: "grid",
      gridTemplateColumns: "56px repeat(6, minmax(130px, 1fr))",
      minWidth: "860px",
    }}>

      <div style={{ ...celdaTH, borderRight: "1px solid #e2e8f0" }} />

      {weekDays.map((dayStr, i) => {
        const esHoy = dayStr === hoyStr;
        return (
          <div key={dayStr} style={{
            ...celdaTH,
            borderRight: i < 5 ? "1px solid #e2e8f0" : "none",
            backgroundColor: esHoy ? "#f5f3ff" : "#fafbfc",
          }}>
            <div style={{
              fontSize: "11px", fontWeight: "700",
              textTransform: "uppercase", letterSpacing: "0.07em",
              color: esHoy ? "#6b21a8" : "#64748b",
              marginBottom: "4px",
            }}>
              {DIAS_ABREV[i]}
            </div>
            <div style={{
              width: "34px", height: "34px",
              borderRadius: "50%",
              backgroundColor: esHoy ? "#6b21a8" : "transparent",
              color: esHoy ? "#fff" : "#1e293b",
              fontSize: "18px", fontWeight: "700",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto",
            }}>
              {diaNumero(dayStr)}
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "3px" }}>
              {fmtFechaDia(dayStr)}
            </div>
            {fueraDeRango?.[i] > 0 && (
              <div
                title="Turnos fuera del horario visible (antes de 8:00 o después de 20:00)"
                style={{
                  marginTop: "4px", display: "inline-block",
                  fontSize: "10px", fontWeight: "700",
                  color: "#b45309", backgroundColor: "#fffbeb",
                  border: "1px solid #fde68a", borderRadius: "6px",
                  padding: "1px 6px",
                }}
              >
                +{fueraDeRango[i]} fuera
              </div>
            )}
          </div>
        );
      })}

      {HORAS.map((hora, horaIdx) => (
        <Fragment key={hora}>

          <div style={{
            ...celdaHora,
            borderTop: horaIdx > 0 ? "1px solid #f1f5f9" : "1px solid #e2e8f0",
          }}>
            {hora}:00
          </div>

          {weekDays.map((dayStr, dayIdx) => {
            const esHoy = dayStr === hoyStr;
            const appts = grid[dayIdx]?.[hora] || [];
            const ultimoDia = dayIdx === 5;

            return (
              <div
                key={`${dayIdx}-${hora}`}
                style={{
                  minHeight: "76px",
                  padding: "4px",
                  borderTop: horaIdx > 0 ? "1px solid #f1f5f9" : "1px solid #e2e8f0",
                  borderRight: !ultimoDia ? "1px solid #f1f5f9" : "none",
                  backgroundColor: esHoy ? "#fdfaff" : "#fff",
                  position: "relative",
                }}
              >
                {appts.map((t) => (
                  <AppointmentChip
                    key={t.id}
                    turno={t}
                    color={colorMap[t.professionalService?.professional?.id] || PALETA[0]}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            );
          })}

        </Fragment>
      ))}

    </div>
  </div>
);

export default WeekGrid;
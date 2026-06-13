import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Modal } from "../../components/ui/Modal";

// ─── Paleta de colores por profesional ───────────────────────
const PALETA = [
  { bg: "#ede9fe", border: "#7c3aed", text: "#4c1d95", dot: "#7c3aed" }, // violeta
  { bg: "#fce7f3", border: "#db2777", text: "#831843", dot: "#db2777" }, // rosa
  { bg: "#ccfbf1", border: "#0d9488", text: "#134e4a", dot: "#0d9488" }, // teal
  { bg: "#fef3c7", border: "#d97706", text: "#78350f", dot: "#d97706" }, // ámbar
  { bg: "#dbeafe", border: "#2563eb", text: "#1e3a8a", dot: "#2563eb" }, // azul
];

// ─── Mapa de estados ─────────────────────────────────────────
const STATUS_MAP = {
  PENDING:     { label: "Pendiente",   bg: "#fef9c3", color: "#854d0e" },
  CONFIRMED:   { label: "Confirmado",  bg: "#dcfce7", color: "#166534" },
  IN_PROGRESS: { label: "En curso",    bg: "#dbeafe", color: "#1e40af" },
  COMPLETED:   { label: "Completado",  bg: "#f1f5f9", color: "#334155" },
  CANCELLED:   { label: "Cancelado",   bg: "#fee2e2", color: "#991b1b" },
};

// ─── Constantes ───────────────────────────────────────────────
const HORAS     = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const DIAS_ABREV = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIAS_FULL  = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES      = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

// ─── Helpers de fecha ─────────────────────────────────────────
const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0=Dom
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth()    === b.getMonth()    &&
  a.getDate()     === b.getDate();

const formatHora = (iso) =>
  new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

const formatFechaDia = (date) =>
  `${date.getDate()} ${MESES[date.getMonth()]}`;

const formatRangoSemana = (monday) => {
  const sat = addDays(monday, 5);
  return `${monday.getDate()} ${MESES[monday.getMonth()]} — ${sat.getDate()} ${MESES[sat.getMonth()]} ${sat.getFullYear()}`;
};

const formatPrecio = (val) => {
  if (val === null || val === undefined) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(val);
};

const formatFechaLarga = (iso) =>
  new Date(iso).toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
 
const ModalDetalleTurno = ({ turno, colorProf, onClose }) => {
  if (!turno) return null;

  const prof     = turno.professionalService?.professional?.person?.name || "—";
  const servNom  = turno.professionalService?.service?.name || "—";
  const durMin   = turno.professionalService?.service?.durationMinutes;
  const precio   = turno.priceAtBooking ?? turno.professionalService?.price ?? null;
  const pacNom   = turno.patient?.person?.name || "—";
  const pacMail  = turno.patient?.person?.email;
  const stCfg    = STATUS_MAP[turno.status] || { label: turno.status, bg: "#f1f5f9", color: "#334155" };

  const horaFin = turno.endsAt
    ? formatHora(turno.endsAt)
    : durMin && turno.startsAt
      ? formatHora(new Date(new Date(turno.startsAt).getTime() + durMin * 60000))
      : null;

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
          {formatFechaLarga(turno.startsAt)}
        </div>
        <div style={{ fontSize: "24px", fontWeight: "800", color: "#1e293b" }}>
          {formatHora(turno.startsAt)}
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
          {formatPrecio(precio)}
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
 

const CalendarioSemanal = () => {
  const { token } = useAuth();
  const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

  const [turnos,         setTurnos]         = useState([]);
  const [profesionales,  setProfesionales]  = useState([]);
  const [cargando,       setCargando]       = useState(true);
  const [weekStart,      setWeekStart]      = useState(() => getMonday(new Date()));
  const [filtroProf,     setFiltroProf]     = useState("");
  const [turnoSelec,     setTurnoSelec]     = useState(null);
 
  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [rT, rP] = await Promise.all([
        fetch(`${API}/appointments`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/professionals`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [dT, dP] = await Promise.all([rT.json(), rP.json()]);
      setTurnos(Array.isArray(dT) ? dT : []);
      setProfesionales(Array.isArray(dP) ? dP : []);
    } catch (err) {
      console.error("Error al cargar datos del calendario:", err);
    } finally {
      setCargando(false);
    }
  }, [token, API]);

  useEffect(() => { fetchData(); }, [fetchData]);
 
  const colorMap = useMemo(() => {
    const m = {};
    profesionales.forEach((p, i) => { m[p.id] = PALETA[i % PALETA.length]; });
    return m;
  }, [profesionales]);
 
  const weekDays = useMemo(
    () => Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );
 
  const grid = useMemo(() => {
    const g = {};
    weekDays.forEach((_, i) => {
      g[i] = {};
      HORAS.forEach(h => { g[i][h] = []; });
    });
    turnos.forEach(t => {
      if (!t.startsAt) return; 
      if (filtroProf && t.professionalService?.professional?.id !== filtroProf) return; 
      const d = new Date(t.startsAt);
      const dayIdx = weekDays.findIndex(wd => sameDay(wd, d));
      if (dayIdx < 0) return;
      const hora = d.getHours();
      if (g[dayIdx][hora]) g[dayIdx][hora].push(t);
    });
    return g;
  }, [turnos, weekDays, filtroProf]);
 
  const totalSemana = useMemo(() =>
    turnos.filter(t => {
      if (!t.startsAt) return false;
      const d = new Date(t.startsAt);
      return weekDays.some(wd => sameDay(wd, d));
    }).length
  , [turnos, weekDays]);

  const hoy = new Date();

  if (cargando) return (
    <div style={{ padding: "40px", textAlign: "center", color: "#6b21a8", fontSize: "16px" }}>
      Cargando agenda...
    </div>
  );

  return (
    <div>
 
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "14px" }}>
        <div>
          <h2 style={{ color: "#6b21a8", margin: 0, fontSize: "1.6rem" }}>Agenda Semanal</h2>
          <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: "14px" }}>
            {formatRangoSemana(weekStart)}
            <span style={{ marginLeft: "12px", fontWeight: "600", color: "#6b21a8" }}>
              · {totalSemana} turno{totalSemana !== 1 ? "s" : ""}
            </span>
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
  
          <select
            value={filtroProf}
            onChange={e => setFiltroProf(e.target.value)}
            style={{
              padding: "8px 14px", borderRadius: "8px",
              border: "1px solid #d1d5db", fontSize: "13px",
              color: "#374151", backgroundColor: "#fff", cursor: "pointer",
            }}
          >
            <option value="">Todas las profesionales</option>
            {profesionales.map(p => (
              <option key={p.id} value={p.id}>{p.person?.name}</option>
            ))}
          </select>
 
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              onClick={() => setWeekStart(w => addDays(w, -7))}
              style={navBtn}
            >
              ‹ Anterior
            </button>
            <button
              onClick={() => setWeekStart(getMonday(new Date()))}
              style={{ ...navBtn, color: "#6b21a8", borderColor: "#a78bfa", fontWeight: "700" }}
            >
              Hoy
            </button>
            <button
              onClick={() => setWeekStart(w => addDays(w, 7))}
              style={navBtn}
            >
              Siguiente ›
            </button>
          </div>
        </div>
      </div>
 
      <div style={{ display: "flex", gap: "16px", marginBottom: "14px", flexWrap: "wrap" }}>
        {profesionales.map((p, i) => {
          const c = PALETA[i % PALETA.length];
          const activo = !filtroProf || filtroProf === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setFiltroProf(filtroProf === p.id ? "" : p.id)}
              title={filtroProf === p.id ? "Ver todas" : `Filtrar por ${p.person?.name}`}
              style={{
                display: "flex", alignItems: "center", gap: "7px",
                fontSize: "13px", padding: "5px 12px", borderRadius: "20px",
                border: `1px solid ${activo ? c.border : "#e2e8f0"}`,
                backgroundColor: activo ? c.bg : "#f8fafc",
                color: activo ? c.text : "#94a3b8",
                cursor: "pointer", fontWeight: activo ? "600" : "400",
                transition: "all 0.15s",
              }}
            >
              <span style={{
                width: "9px", height: "9px", borderRadius: "50%",
                backgroundColor: activo ? c.dot : "#cbd5e1",
                display: "inline-block",
              }} />
              {p.person?.name}
            </button>
          );
        })}
      </div>
 
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

          {weekDays.map((d, i) => {
            const esHoy = sameDay(d, hoy);
            return (
              <div key={i} style={{
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
                  {d.getDate()}
                </div> 
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "3px" }}>
                  {formatFechaDia(d)}
                </div>
              </div>
            );
          })}
 
          {HORAS.map((hora, horaIdx) => (
            <React.Fragment key={hora}>

              {/* Etiqueta de hora */}
              <div style={{
                ...celdaHora,
                borderTop: horaIdx > 0 ? "1px solid #f1f5f9" : "1px solid #e2e8f0",
              }}>
                {hora}:00
              </div>

              {/* Celdas de cada día */}
              {weekDays.map((wd, dayIdx) => {
                const esHoy    = sameDay(wd, hoy);
                const appts    = grid[dayIdx]?.[hora] || [];
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
                    {appts.map(t => {
                      const profId  = t.professionalService?.professional?.id;
                      const c       = colorMap[profId] || PALETA[0];
                      const stCfg   = STATUS_MAP[t.status] || STATUS_MAP.PENDING;
                      const esCancelado = t.status === "CANCELLED";

                      return (
                        <div
                          key={t.id}
                          onClick={() => setTurnoSelec(t)}
                          title={`${t.patient?.person?.name} — ${t.professionalService?.service?.name}`}
                          style={{
                            backgroundColor: esCancelado ? "#f8fafc" : c.bg,
                            borderLeft: `3px solid ${esCancelado ? "#cbd5e1" : c.border}`,
                            borderRadius: "0 6px 6px 0",
                            padding: "5px 7px",
                            marginBottom: "4px",
                            cursor: "pointer",
                            opacity: esCancelado ? 0.55 : 1,
                            transition: "opacity 0.15s, transform 0.1s",
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.opacity = "0.8";
                            e.currentTarget.style.transform = "scale(1.02)";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.opacity = esCancelado ? "0.55" : "1";
                            e.currentTarget.style.transform = "scale(1)";
                          }}
                        > 
                          <div style={{
                            fontWeight: "700",
                            fontSize: "12px",
                            color: esCancelado ? "#94a3b8" : c.text,
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}>
                            {formatHora(t.startsAt)} · {t.patient?.person?.name?.split(" ")[0] || "—"}
                          </div> 
                          <div style={{
                            fontSize: "11px",
                            color: esCancelado ? "#94a3b8" : c.text,
                            opacity: 0.8,
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}>
                            {t.professionalService?.service?.name || "—"}
                          </div> 
                          {t.status !== "CONFIRMED" && (
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
                    })}
                  </div>
                );
              })}

            </React.Fragment>
          ))}

        </div>
      </div>
 
      <p style={{ color: "#94a3b8", fontSize: "12px", marginTop: "12px", textAlign: "center" }}>
        Hacé clic en cualquier turno para ver el detalle completo · Usá el filtro de arriba para ver una sola profesional
      </p>
 
      <Modal
        isOpen={!!turnoSelec}
        onClose={() => setTurnoSelec(null)}
        title="Detalle del Turno"
      >
        <ModalDetalleTurno
          turno={turnoSelec}
          colorProf={turnoSelec
            ? colorMap[turnoSelec.professionalService?.professional?.id]
            : null
          }
          onClose={() => setTurnoSelec(null)}
        />
      </Modal>

    </div>
  );
};
 
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

const navBtn = {
  padding: "7px 14px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  background: "#fff",
  cursor: "pointer",
  fontSize: "13px",
  color: "#374151",
  fontWeight: "500",
};

export default CalendarioSemanal;
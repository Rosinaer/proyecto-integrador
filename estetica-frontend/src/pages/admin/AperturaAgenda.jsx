// ============================================================
// ESPACIO SENDA — AperturaAgenda.jsx
// Ruta: src/pages/admin/AperturaAgenda.jsx
//
// Funcionalidad (WF-08):
//   • Selección de profesional + mes/año
//   • Gestión de horarios recurrentes (CRUD recurringSchedule)
//   • Generación y reversión de disponibilidad mensual
//   • Tabla de slots generados con slot manual
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { Button }  from "../../components/ui/Button";
import { Modal }   from "../../components/ui/Modal";
import { useAuth } from "../../hooks/useAuth";

// ─── Constantes de dominio ────────────────────────────────────
const DIAS_SEMANA = [
  { value: 0, label: "Domingo"   },
  { value: 1, label: "Lunes"     },
  { value: 2, label: "Martes"    },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves"    },
  { value: 5, label: "Viernes"   },
  { value: 6, label: "Sábado"    },
];
const DIAS_ABREV  = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const MESES       = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                     "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const ESTADOS_ACTIVOS = ["PENDING","CONFIRMED","IN_PROGRESS"];

// ─── Helpers ──────────────────────────────────────────────────
const slotTieneActivos = (slot) =>
  Array.isArray(slot.appointments) &&
  slot.appointments.some(a => ESTADOS_ACTIVOS.includes(a.status));

// Extrae "YYYY-MM-DD" de cualquier formato:
//   "2026-05-01T00:00:00.000Z"  →  "2026-05-01"
//   "2026-05-01"                →  "2026-05-01"
const extraerFecha = (str) => {
  if (!str) return "";
  return str.includes("T") ? str.slice(0, 10) : str;
};

const formatFecha = (str) => {
  if (!str) return "—";
  const [y, m, d] = extraerFecha(str).split("-");
  return `${d}/${m}/${y}`;
};

const diaAbrev = (dateStr) => {
  const fecha = new Date(extraerFecha(dateStr) + "T00:00:00");
  return DIAS_ABREV[fecha.getDay()];
};

// Convierte cualquier formato de hora a "HH:MM":
//   "1970-01-01T13:00:00.000Z"  →  "13:00"
//   "13:00:00"                  →  "13:00"
//   "13:00"                     →  "13:00"
const formatHora = (str) => {
  if (!str) return "—";
  // Si contiene "T" es un ISO datetime → extraemos HH:MM en UTC
  if (str.includes("T")) {
    return new Date(str).toISOString().slice(11, 16);
  }
  // Si es "HH:MM:SS" o "HH:MM" → tomamos los primeros 5 caracteres
  return str.slice(0, 5);
};

// ─── Estilos inline ───────────────────────────────────────────
const S = {
  card: {
    backgroundColor: "#fff",
    borderRadius: "10px",
    padding: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    border: "1px solid #e2e8f0",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    paddingBottom: "10px",
    borderBottom: "2px solid #f3e5f5",
  },
  sectionTitle: {
    margin: 0,
    color: "#6b21a8",
    fontSize: "1rem",
    fontWeight: "700",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    color: "#6b21a8",
    marginBottom: "5px",
  },
  select: {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "14px",
    backgroundColor: "#fff",
    cursor: "pointer",
    boxSizing: "border-box",
  },
  timeInput: {
    width: "100%",
    padding: "9px 10px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "14px",
    boxSizing: "border-box",
  },
  btnSecondary: {
    padding: "8px 16px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    background: "#f8fafc",
    cursor: "pointer",
    fontSize: "13px",
  },
  btnDanger: {
    width: "100%",
    marginTop: "8px",
    padding: "9px",
    fontSize: "13px",
    backgroundColor: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fca5a5",
    borderRadius: "6px",
    cursor: "pointer",
  },
  btnIconDelete: {
    background: "none",
    border: "none",
    fontSize: "15px",
    lineHeight: "1",
    padding: "0 4px",
    cursor: "pointer",
  },
  alertInfo:  { backgroundColor:"#eff6ff", border:"1px solid #93c5fd",  borderRadius:"8px", padding:"12px 16px", fontSize:"13px", color:"#1e40af",  marginBottom:"14px" },
  alertWarn:  { backgroundColor:"#fffbeb", border:"1px solid #fbbf24",  borderRadius:"8px", padding:"12px 16px", fontSize:"13px", color:"#92400e",  marginBottom:"14px" },
  alertError: { backgroundColor:"#fef2f2", border:"1px solid #fca5a5",  borderRadius:"8px", padding:"12px 16px", fontSize:"13px", color:"#991b1b",  marginBottom:"14px" },
  alertOk:    { backgroundColor:"#f0fdf4", border:"1px solid #86efac",  borderRadius:"8px", padding:"12px 16px", fontSize:"13px", color:"#14532d",  marginBottom:"14px" },
  th: { padding:"9px 12px", textAlign:"left", color:"#6b21a8", fontWeight:"700", fontSize:"12px", whiteSpace:"nowrap", backgroundColor:"#f3e5f5" },
  td: { padding:"9px 12px", color:"#334155", verticalAlign:"middle" },
};

// ─── Badge de estado de slot ──────────────────────────────────
const BadgeSlot = ({ activo }) => (
  <span style={{
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: "700",
    backgroundColor: activo ? "#fce7f3" : "#d1fae5",
    color:           activo ? "#9d174d"  : "#065f46",
  }}>
    {activo ? "Con turnos" : "Libre"}
  </span>
);

// ════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════
const AperturaAgenda = () => {
  const { token } = useAuth();
  const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

  // ─── Estado: selección ────────────────────────────────────────
  const hoy = new Date();
  const [profSelId,   setProfSelId]   = useState("");
  const [anio,        setAnio]        = useState(hoy.getFullYear());
  const [mes,         setMes]         = useState(hoy.getMonth() + 1);

  // ─── Estado: datos ────────────────────────────────────────────
  const [profesionales, setProfesionales] = useState([]);
  const [horarios,      setHorarios]      = useState([]);
  const [slots,         setSlots]         = useState([]);

  // ─── Estado: loading ──────────────────────────────────────────
  const [cargandoProf,     setCargandoProf]     = useState(true);
  const [cargandoHorarios, setCargandoHorarios] = useState(false);
  const [cargandoSlots,    setCargandoSlots]    = useState(false);
  const [accionando,       setAccionando]       = useState(false);

  // ─── Estado: feedback ─────────────────────────────────────────
  const [mensajeOk,   setMensajeOk]   = useState("");
  const [errorGlobal, setErrorGlobal] = useState("");

  // ─── Estado: modales ──────────────────────────────────────────
  const [modalHorario,  setModalHorario]  = useState(false);
  const [modalSlot,     setModalSlot]     = useState(false);
  const [modalRevertir, setModalRevertir] = useState(false);

  // ─── Estado: formularios ──────────────────────────────────────
  const formHorarioVacio = { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" };
  const formSlotVacio    = { date: "", startTime: "09:00", endTime: "17:00" };
  const [formHorario, setFormHorario] = useState(formHorarioVacio);
  const [formSlot,    setFormSlot]    = useState(formSlotVacio);
  const [errorForm,   setErrorForm]   = useState("");

  // ─── Helpers de feedback ─────────────────────────────────────
  const mostrarOk    = (msg) => { setMensajeOk(msg);   setTimeout(() => setMensajeOk(""),   5000); };
  const mostrarError = (msg) => { setErrorGlobal(msg); setTimeout(() => setErrorGlobal(""), 7000); };

  // ─── Helper: headers ─────────────────────────────────────────
  const headers = useCallback((extra = {}) => ({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...extra,
  }), [token]);

  // ════════════════════════════════════════════════════════════
  // FETCH: Profesionales (carga inicial)
  // ════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!token) return;
    const fetchProfs = async () => {
      try {
        const res  = await fetch(`${API}/professionals`, { headers: headers() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al cargar profesionales");
        // La API devuelve un array donde cada item tiene { id, specialty, person: { name, email }, ... }
        const lista = Array.isArray(data) ? data : [];
        setProfesionales(lista);
      } catch (err) {
        mostrarError(`No se pudo cargar la lista de profesionales: ${err.message}`);
      } finally {
        setCargandoProf(false);
      }
    };
    fetchProfs();
  }, [token]);

  // ════════════════════════════════════════════════════════════
  // FETCH: Horarios recurrentes
  // ════════════════════════════════════════════════════════════
  const cargarHorarios = useCallback(async (profId) => {
    if (!profId) return;
    setCargandoHorarios(true);
    try {
      const res  = await fetch(`${API}/professionals/${profId}/schedule`, { headers: headers() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar horarios");
      const lista = Array.isArray(data) ? data : [];
      setHorarios([...lista].sort((a, b) => a.dayOfWeek - b.dayOfWeek));
    } catch (err) {
      mostrarError(err.message);
      setHorarios([]);
    } finally {
      setCargandoHorarios(false);
    }
  }, [API, headers]);

  // ════════════════════════════════════════════════════════════
  // FETCH: Disponibilidad mensual
  // ════════════════════════════════════════════════════════════
  const cargarDisponibilidad = useCallback(async (profId, y, m) => {
    if (!profId) return;
    setCargandoSlots(true);
    try {
      const res  = await fetch(`${API}/professionals/${profId}/availability?year=${y}&month=${m}`, { headers: headers() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar disponibilidad");
      const lista = Array.isArray(data) ? data : [];
      setSlots([...lista].sort((a, b) => new Date(a.date) - new Date(b.date)));
    } catch {
      setSlots([]);
    } finally {
      setCargandoSlots(false);
    }
  }, [API, headers]);

  // Recargar cada vez que cambia profesional, año o mes
  useEffect(() => {
    if (profSelId) {
      cargarHorarios(profSelId);
      cargarDisponibilidad(profSelId, anio, mes);
    } else {
      setHorarios([]);
      setSlots([]);
    }
  }, [profSelId, anio, mes]);

  // ════════════════════════════════════════════════════════════
  // ACCIÓN: Agregar horario recurrente
  // ════════════════════════════════════════════════════════════
  const handleAgregarHorario = async () => {
    setErrorForm("");
    if (formHorario.startTime >= formHorario.endTime) {
      setErrorForm("El horario de inicio debe ser anterior al de fin.");
      return;
    }
    setAccionando(true);
    try {
      const res = await fetch(`${API}/professionals/${profSelId}/schedule`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          dayOfWeek: Number(formHorario.dayOfWeek),
          startTime: formHorario.startTime,
          endTime:   formHorario.endTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear horario");
      setModalHorario(false);
      setFormHorario(formHorarioVacio);
      await cargarHorarios(profSelId);
      mostrarOk(`✓ Horario del ${DIAS_SEMANA.find(d => d.value === Number(formHorario.dayOfWeek))?.label} agregado correctamente.`);
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setAccionando(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  // ACCIÓN: Eliminar horario recurrente
  // ════════════════════════════════════════════════════════════
  const handleEliminarHorario = async (scheduleId, label) => {
    if (!window.confirm(`¿Eliminás el horario recurrente del ${label}?`)) return;
    setAccionando(true);
    try {
      const res = await fetch(`${API}/professionals/${profSelId}/schedule/${scheduleId}`, {
        method: "DELETE",
        headers: headers(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar horario");
      }
      await cargarHorarios(profSelId);
      mostrarOk("✓ Horario recurrente eliminado.");
    } catch (err) {
      mostrarError(err.message);
    } finally {
      setAccionando(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  // ACCIÓN: Generar disponibilidad mensual
  // ════════════════════════════════════════════════════════════
  const handleGenerarDisponibilidad = async () => {
    if (horarios.length === 0) {
      mostrarError("Este profesional no tiene horarios recurrentes configurados. Agregá al menos uno antes de generar la agenda.");
      return;
    }
    setAccionando(true);
    try {
      const res = await fetch(`${API}/professionals/${profSelId}/availability/generate`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ year: anio, month: mes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al generar disponibilidad");
      await cargarDisponibilidad(profSelId, anio, mes);
      const cantidad = data.created ?? data.slotsCreados ?? data.count ?? "—";
      mostrarOk(`✓ Agenda de ${MESES[mes - 1]} ${anio} generada. Slots creados: ${cantidad}.`);
    } catch (err) {
      mostrarError(err.message);
    } finally {
      setAccionando(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  // ACCIÓN: Revertir disponibilidad mensual
  // ════════════════════════════════════════════════════════════
  const handleRevertirDisponibilidad = async () => {
    setModalRevertir(false);
    setAccionando(true);
    try {
      const res = await fetch(`${API}/professionals/${profSelId}/availability/revert`, {
        method: "DELETE",
        headers: headers(),
        body: JSON.stringify({ year: anio, month: mes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al revertir disponibilidad");
      await cargarDisponibilidad(profSelId, anio, mes);
      const eliminados = data.deleted ?? data.slotsEliminados ?? "—";
      mostrarOk(`✓ Apertura revertida. Slots eliminados: ${eliminados}. Los slots con turnos activos se conservaron.`);
    } catch (err) {
      mostrarError(err.message);
    } finally {
      setAccionando(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  // ACCIÓN: Agregar slot manual
  // ════════════════════════════════════════════════════════════
  const handleAgregarSlotManual = async () => {
    setErrorForm("");
    if (!formSlot.date) { setErrorForm("Seleccioná una fecha."); return; }
    if (formSlot.startTime >= formSlot.endTime) {
      setErrorForm("El horario de inicio debe ser anterior al de fin.");
      return;
    }
    setAccionando(true);
    try {
      const res = await fetch(`${API}/professionals/${profSelId}/availability`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          date:      formSlot.date,
          startTime: formSlot.startTime,
          endTime:   formSlot.endTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear slot manual");
      setModalSlot(false);
      setFormSlot(formSlotVacio);
      await cargarDisponibilidad(profSelId, anio, mes);
      mostrarOk(`✓ Slot manual del ${formatFecha(formSlot.date)} agregado.`);
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setAccionando(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  // ACCIÓN: Eliminar slot individual
  // ════════════════════════════════════════════════════════════
  const handleEliminarSlot = async (slotId, fechaStr, tieneActivos) => {
    if (tieneActivos) {
      mostrarError("Este slot tiene turnos activos (Pendiente, Confirmado, En progreso) y no puede eliminarse.");
      return;
    }
    if (!window.confirm(`¿Eliminás el slot del ${formatFecha(fechaStr)}?`)) return;
    setAccionando(true);
    try {
      const res = await fetch(`${API}/professionals/${profSelId}/availability/${slotId}`, {
        method: "DELETE",
        headers: headers(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar slot");
      }
      await cargarDisponibilidad(profSelId, anio, mes);
      mostrarOk("✓ Slot eliminado.");
    } catch (err) {
      mostrarError(err.message);
    } finally {
      setAccionando(false);
    }
  };

  // ─── Datos derivados ─────────────────────────────────────────
  const profSeleccionado = profesionales.find(p => p.id === profSelId);
  const slotsConActivos  = slots.filter(s => slotTieneActivos(s)).length;
  const nombresDelMes    = `${MESES[mes - 1]} ${anio}`;

  // ─── Nombre del profesional (la API anida en person) ─────────
  const getNombreProf = (p) => p?.person?.name ?? p?.name ?? p?.nombre ?? "Sin nombre";
  const getEmailProf  = (p) => p?.person?.email ?? p?.email ?? "";

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <div style={{ maxWidth: "1200px" }}>

      {/* ── Encabezado ── */}
      <div style={{ marginBottom: "28px" }}>
        <h2 style={{ color: "#6b21a8", fontSize: "1.75rem", margin: "0 0 6px 0" }}>
          📅 Apertura de Agenda
        </h2>
        <p style={{ color: "#64748b", fontSize: "1rem", margin: 0 }}>
          Configurá los horarios recurrentes del profesional y generá la disponibilidad mensual.
        </p>
      </div>

      {/* ── Feedback global ── */}
      {mensajeOk   && <div style={S.alertOk}>   {mensajeOk}   </div>}
      {errorGlobal && <div style={S.alertError}> {errorGlobal} </div>}

      {/* ══════════════════════════════════════════════════════
          CARD: Selector de Profesional + Mes
      ══════════════════════════════════════════════════════ */}
      <div style={{ ...S.card, marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "flex-end" }}>

          {/* Profesional */}
          <div style={{ flex: "2", minWidth: "220px" }}>
            <label style={S.label}>Profesional</label>
            <select
              style={S.select}
              value={profSelId}
              onChange={e => { setProfSelId(e.target.value); setErrorGlobal(""); }}
              disabled={cargandoProf}
            >
              <option value="">
                {cargandoProf ? "Cargando profesionales..." : "— Seleccioná un profesional —"}
              </option>
              {profesionales.map(p => (
                <option key={p.id} value={p.id}>
                  {getNombreProf(p)}
                  {p.specialty ? ` — ${p.specialty}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Mes */}
          <div style={{ flex: "1", minWidth: "130px" }}>
            <label style={S.label}>Mes</label>
            <select style={S.select} value={mes} onChange={e => setMes(Number(e.target.value))}>
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>

          {/* Año */}
          <div style={{ flex: "0 0 100px" }}>
            <label style={S.label}>Año</label>
            <select style={S.select} value={anio} onChange={e => setAnio(Number(e.target.value))}>
              {[hoy.getFullYear(), hoy.getFullYear() + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Chip informativo del profesional elegido */}
        {profSeleccionado && (
          <div style={{ marginTop: "14px", padding: "10px 14px", backgroundColor: "#f8f4ff", borderRadius: "8px", fontSize: "13px" }}>
            <strong style={{ color: "#6b21a8" }}>
              {getNombreProf(profSeleccionado)}
            </strong>
            {profSeleccionado.specialty && (
              <span style={{ color: "#64748b" }}> · {profSeleccionado.specialty}</span>
            )}
            {getEmailProf(profSeleccionado) && (
              <span style={{ color: "#94a3b8" }}> · {getEmailProf(profSeleccionado)}</span>
            )}
          </div>
        )}
      </div>

      {/* Placeholder cuando no hay profesional elegido */}
      {!profSelId ? (
        <div style={{ ...S.alertInfo, textAlign: "center", padding: "40px", fontSize: "14px" }}>
          👆 Seleccioná un profesional para ver y configurar su agenda.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "20px", alignItems: "start" }}>

          {/* ══════════════════════════════════════════════════
              COLUMNA IZQUIERDA: Horarios Recurrentes
          ══════════════════════════════════════════════════ */}
          <div>
            <div style={S.card}>
              <div style={S.sectionHeader}>
                <h3 style={S.sectionTitle}>🔁 Horarios Recurrentes</h3>
                <Button
                  onClick={() => {
                    setFormHorario(formHorarioVacio);
                    setErrorForm("");
                    setModalHorario(true);
                  }}
                  disabled={accionando}
                  style={{ fontSize: "12px", padding: "6px 12px" }}
                >
                  + Agregar
                </Button>
              </div>

              {cargandoHorarios ? (
                <p style={{ color: "#94a3b8", textAlign: "center", padding: "24px 0" }}>
                  Cargando horarios...
                </p>
              ) : horarios.length === 0 ? (
                <div style={S.alertWarn}>
                  <strong>Sin horarios recurrentes.</strong><br />
                  <small>Agregá al menos un horario para poder generar la agenda mensual.</small>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {horarios.map(h => {
                    const diaLabel = DIAS_SEMANA.find(d => d.value === h.dayOfWeek)?.label ?? `Día ${h.dayOfWeek}`;
                    return (
                      <div
                        key={h.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 12px",
                          backgroundColor: "#f8f4ff",
                          borderRadius: "8px",
                          border: "1px solid #e9d5ff",
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: "700", color: "#6b21a8", fontSize: "13px" }}>
                            {diaLabel}
                          </span>
                          <span style={{ fontSize: "13px", color: "#475569", marginLeft: "12px" }}>
                            {formatHora(h.startTime)} → {formatHora(h.endTime)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleEliminarHorario(h.id, diaLabel)}
                          disabled={accionando}
                          title="Eliminar este horario recurrente"
                          style={{ ...S.btnIconDelete, color: accionando ? "#cbd5e1" : "#d32f2f" }}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Acciones de agenda ── */}
              <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #e2e8f0" }}>
                <Button
                  onClick={handleGenerarDisponibilidad}
                  disabled={accionando || horarios.length === 0}
                  style={{ width: "100%", padding: "11px", fontSize: "14px" }}
                >
                  {accionando ? "Procesando..." : `▶ Generar agenda — ${nombresDelMes}`}
                </Button>

                {horarios.length === 0 && (
                  <p style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center", marginTop: "6px", marginBottom: 0 }}>
                    Necesitás al menos un horario recurrente.
                  </p>
                )}

                {slots.length > 0 && (
                  <button
                    onClick={() => setModalRevertir(true)}
                    disabled={accionando}
                    style={S.btnDanger}
                    title="Elimina los slots sin turnos activos"
                  >
                    ↩ Revertir apertura — {nombresDelMes}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════
              COLUMNA DERECHA: Disponibilidad Generada
          ══════════════════════════════════════════════════ */}
          <div style={S.card}>
            <div style={S.sectionHeader}>
              <h3 style={S.sectionTitle}>
                📋 Agenda Generada — {nombresDelMes}
              </h3>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                {slots.length > 0 && (
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    {slots.length} slot{slots.length !== 1 ? "s" : ""}
                    {slotsConActivos > 0 && ` · ${slotsConActivos} con turnos`}
                  </span>
                )}
                <Button
                  onClick={() => {
                    setFormSlot(formSlotVacio);
                    setErrorForm("");
                    setModalSlot(true);
                  }}
                  disabled={accionando}
                  style={{ fontSize: "12px", padding: "6px 12px" }}
                >
                  + Día manual
                </Button>
              </div>
            </div>

            {cargandoSlots ? (
              <p style={{ color: "#94a3b8", textAlign: "center", padding: "40px 0" }}>
                Cargando disponibilidad...
              </p>
            ) : slots.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 24px", color: "#94a3b8" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📭</div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#64748b", marginBottom: "6px" }}>
                  No hay disponibilidad generada para {nombresDelMes}.
                </div>
                <div style={{ fontSize: "12px" }}>
                  Configurá los horarios recurrentes y presioná <strong>Generar agenda</strong>.
                </div>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr>
                      <th style={S.th}>Día</th>
                      <th style={S.th}>Fecha</th>
                      <th style={S.th}>Inicio</th>
                      <th style={S.th}>Fin</th>
                      <th style={S.th}>Estado</th>
                      <th style={S.th}>Turnos</th>
                      <th style={S.th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map(s => {
                      const tieneActivos = slotTieneActivos(s);
                      const cantTurnos   = s.appointments?.length || 0;
                      return (
                        <tr
                          key={s.id}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            backgroundColor: tieneActivos ? "#fdf4ff" : "white",
                          }}
                        >
                          <td style={S.td}>
                            <strong style={{ color: "#6b21a8" }}>{diaAbrev(s.date)}</strong>
                          </td>
                          <td style={S.td}>{formatFecha(s.date)}</td>
                          <td style={S.td}>{formatHora(s.startTime)}</td>
                          <td style={S.td}>{formatHora(s.endTime)}</td>
                          <td style={S.td}>
                            <BadgeSlot activo={tieneActivos} />
                          </td>
                          <td style={S.td}>
                            {cantTurnos > 0
                              ? <span style={{ fontWeight: "600", color: "#6b21a8" }}>{cantTurnos}</span>
                              : <span style={{ color: "#cbd5e1" }}>—</span>
                            }
                          </td>
                          <td style={S.td}>
                            <button
                              onClick={() => handleEliminarSlot(s.id, s.date, tieneActivos)}
                              disabled={accionando || tieneActivos}
                              title={tieneActivos
                                ? "Tiene turnos activos — no se puede eliminar"
                                : "Eliminar este slot"}
                              style={{
                                ...S.btnIconDelete,
                                color: (accionando || tieneActivos) ? "#e2e8f0" : "#d32f2f",
                                cursor: (accionando || tieneActivos) ? "not-allowed" : "pointer",
                              }}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL: Agregar Horario Recurrente
      ══════════════════════════════════════════════════════ */}
      <Modal
        isOpen={modalHorario}
        onClose={() => setModalHorario(false)}
        title="Agregar Horario Recurrente"
      >
        <p style={{ color: "#64748b", fontSize: "13px", marginTop: 0, marginBottom: "16px" }}>
          Este horario se repetirá cada semana y se usará al generar la agenda mensual.
        </p>

        <div style={{ marginBottom: "14px" }}>
          <label style={S.label}>Día de la semana</label>
          <select
            style={S.select}
            value={formHorario.dayOfWeek}
            onChange={e => setFormHorario(f => ({ ...f, dayOfWeek: Number(e.target.value) }))}
          >
            {DIAS_SEMANA.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
          <div>
            <label style={S.label}>Hora inicio</label>
            <input
              type="time"
              style={S.timeInput}
              value={formHorario.startTime}
              onChange={e => setFormHorario(f => ({ ...f, startTime: e.target.value }))}
            />
          </div>
          <div>
            <label style={S.label}>Hora fin</label>
            <input
              type="time"
              style={S.timeInput}
              value={formHorario.endTime}
              onChange={e => setFormHorario(f => ({ ...f, endTime: e.target.value }))}
            />
          </div>
        </div>

        {errorForm && <div style={{ ...S.alertError, marginBottom: "12px" }}>{errorForm}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button onClick={() => setModalHorario(false)} style={S.btnSecondary}>
            Cancelar
          </button>
          <Button onClick={handleAgregarHorario} disabled={accionando}>
            {accionando ? "Guardando..." : "Guardar horario"}
          </Button>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          MODAL: Agregar Slot Manual
      ══════════════════════════════════════════════════════ */}
      <Modal
        isOpen={modalSlot}
        onClose={() => setModalSlot(false)}
        title="Agregar Día Manual"
      >
        <p style={{ color: "#64748b", fontSize: "13px", marginTop: 0, marginBottom: "16px" }}>
          Útil para días que no están en el horario recurrente (ej: guardia extra, fecha especial).
        </p>

        <div style={{ marginBottom: "14px" }}>
          <label style={S.label}>Fecha</label>
          <input
            type="date"
            style={S.timeInput}
            value={formSlot.date}
            onChange={e => setFormSlot(f => ({ ...f, date: e.target.value }))}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
          <div>
            <label style={S.label}>Hora inicio</label>
            <input
              type="time"
              style={S.timeInput}
              value={formSlot.startTime}
              onChange={e => setFormSlot(f => ({ ...f, startTime: e.target.value }))}
            />
          </div>
          <div>
            <label style={S.label}>Hora fin</label>
            <input
              type="time"
              style={S.timeInput}
              value={formSlot.endTime}
              onChange={e => setFormSlot(f => ({ ...f, endTime: e.target.value }))}
            />
          </div>
        </div>

        {errorForm && <div style={{ ...S.alertError, marginBottom: "12px" }}>{errorForm}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button onClick={() => setModalSlot(false)} style={S.btnSecondary}>
            Cancelar
          </button>
          <Button onClick={handleAgregarSlotManual} disabled={accionando}>
            {accionando ? "Guardando..." : "Agregar slot"}
          </Button>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          MODAL: Confirmar Revertir Apertura
      ══════════════════════════════════════════════════════ */}
      <Modal
        isOpen={modalRevertir}
        onClose={() => setModalRevertir(false)}
        title="⚠️ Revertir Apertura de Agenda"
      >
        <div style={S.alertWarn}>
          <strong>
            Esta acción eliminará todos los slots <em>sin</em> turnos activos
          </strong>{" "}
          de {nombresDelMes}
          {profSeleccionado ? ` para ${getNombreProf(profSeleccionado)}` : ""}.
        </div>

        {slotsConActivos > 0 ? (
          <div style={{ ...S.alertInfo, marginBottom: "16px" }}>
            ✅ Los <strong>{slotsConActivos} slot{slotsConActivos !== 1 ? "s" : ""}</strong> con
            turnos activos (Pendiente, Confirmado, En progreso){" "}
            <strong>no serán eliminados</strong>.
          </div>
        ) : (
          <div style={{ ...S.alertInfo, marginBottom: "16px" }}>
            Ningún slot tiene turnos activos. Se eliminarán los {slots.length} slots del mes.
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button onClick={() => setModalRevertir(false)} style={S.btnSecondary}>
            Cancelar
          </button>
          <Button
            variant="danger"
            onClick={handleRevertirDisponibilidad}
            disabled={accionando}
          >
            {accionando ? "Revirtiendo..." : "Sí, revertir apertura"}
          </Button>
        </div>
      </Modal>

    </div>
  );
};

export default AperturaAgenda;
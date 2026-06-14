import { useState, useEffect, useCallback, Fragment } from "react";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { TimeInput24 } from "./ui/TimeInput24";
import { useBanner } from "./ui/Banner";

// ─── Constantes / helpers locales ─────────────────────────────
const DIAS_SEMANA = [
  { value: 0, label: "Domingo"   },
  { value: 1, label: "Lunes"     },
  { value: 2, label: "Martes"    },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves"    },
  { value: 5, label: "Viernes"   },
  { value: 6, label: "Sábado"    },
];

const formatHora = (str) => {
  if (!str) return "—";
  if (str.includes("T")) return new Date(str).toISOString().slice(11, 16);
  return str.slice(0, 5);
};

// ─── Estilos (los mismos que usaba la sección inline) ─────────
const ST = {
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    paddingBottom: "10px",
    borderBottom: "2px solid #f3e5f5",
  },
  sectionTitle: { margin: 0, color: "#6b21a8", fontSize: "1rem", fontWeight: "700" },
  label: { display: "block", fontSize: "13px", fontWeight: "600", color: "#6b21a8", marginBottom: "5px" },
  select: {
    width: "100%", padding: "9px 12px", border: "1px solid #ccc", borderRadius: "6px",
    fontSize: "14px", backgroundColor: "#fff", cursor: "pointer", boxSizing: "border-box",
  },
  btnCancel: { backgroundColor: "#e2e8f0", color: "#475569" },
  btnIconDelete: { background: "none", border: "none", fontSize: "15px", lineHeight: "1", padding: "0 4px", cursor: "pointer" },
  alertWarn: { backgroundColor: "#fffbeb", border: "1px solid #fbbf24", borderRadius: "8px", padding: "12px 16px", fontSize: "13px", color: "#92400e", marginBottom: "14px" },
  alertError: { backgroundColor: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "12px 16px", fontSize: "13px", color: "#991b1b", marginBottom: "14px" },
  inlinePanel: {
    marginBottom: "16px",
    padding: "16px",
    backgroundColor: "#faf5ff",
    border: "1px solid #e9d5ff",
    borderRadius: "8px",
    overflow: "hidden",
    animation: "senda-slide-down 0.18s ease-out",
  },
  inlinePanelHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" },
  inlinePanelTitle: { color: "#6b21a8", fontSize: "13px", fontWeight: "700" },
  fieldRow: { display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "12px" },
  fieldCol: { flex: "1 1 130px", minWidth: "130px" },
  editGroup: {
    border: "2px solid #7c3aed",
    borderLeft: "5px solid #7c3aed",
    borderRadius: "8px",
    boxShadow: "0 6px 18px rgba(124,58,237,0.28)",
    overflow: "hidden",
  },
};

const FORM_VACIO = { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" };

export function HorariosRecurrentes({ professionalId, token, onCountChange }) {
  const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  const banner = useBanner();

  const [horarios, setHorarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [accionando, setAccionando] = useState(false);

  const [panel, setPanel] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [aEliminar, setAEliminar] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [errorForm, setErrorForm] = useState("");

  const headers = useCallback((extra = {}) => ({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...extra,
  }), [token]);

  const cargar = useCallback(async (profId) => {
    if (!profId) { setHorarios([]); return; }
    setCargando(true);
    try {
      const res = await fetch(`${API}/professionals/${profId}/schedule`, { headers: headers() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar horarios");
      const lista = Array.isArray(data) ? data : [];
      setHorarios([...lista].sort((a, b) => a.dayOfWeek - b.dayOfWeek));
    } catch (err) {
      banner.error(err.message);
      setHorarios([]);
    } finally {
      setCargando(false);
    }
  }, [API, headers]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recargar al cambiar de profesional y cerrar cualquier panel abierto
  useEffect(() => {
    cargar(professionalId);
    setPanel(false);
    setEditandoId(null);
    setErrorForm("");
  }, [professionalId, cargar]);

  // Avisar al contenedor cuántos horarios hay (para habilitar "Generar agenda")
  useEffect(() => {
    onCountChange?.(horarios.length);
  }, [horarios.length, onCountChange]);

  const cerrar = () => {
    setPanel(false);
    setEditandoId(null);
    setErrorForm("");
  };

  const abrirNuevo = () => {
    if (panel && !editandoId) { cerrar(); return; }
    setEditandoId(null);
    setForm(FORM_VACIO);
    setErrorForm("");
    setPanel(true);
  };

  const abrirEditar = (h) => {
    setEditandoId(h.id);
    setForm({ dayOfWeek: h.dayOfWeek, startTime: formatHora(h.startTime), endTime: formatHora(h.endTime) });
    setErrorForm("");
    setPanel(true);
  };

  const guardar = async () => {
    setErrorForm("");
    if (form.startTime >= form.endTime) {
      setErrorForm("El horario de inicio debe ser anterior al de fin.");
      return;
    }

    const mismoDia = horarios.filter(
      (h) => h.dayOfWeek === Number(form.dayOfWeek) && h.id !== editandoId,
    );
    const seSuperpone = mismoDia.some((h) => {
      const hIni = formatHora(h.startTime);
      const hFin = formatHora(h.endTime);
      return form.startTime < hFin && form.endTime > hIni;
    });
    if (seSuperpone) {
      const diaLabel = DIAS_SEMANA.find((d) => d.value === Number(form.dayOfWeek))?.label;
      setErrorForm(`Ese rango se superpone con otro horario ya cargado para el ${diaLabel}. Revisá los horarios de ese día.`);
      return;
    }

    const esEdicion = !!editandoId;
    setAccionando(true);
    try {
      const url = esEdicion
        ? `${API}/professionals/${professionalId}/schedule/${editandoId}`
        : `${API}/professionals/${professionalId}/schedule`;
      const res = await fetch(url, {
        method: esEdicion ? "PATCH" : "POST",
        headers: headers(),
        body: JSON.stringify({
          dayOfWeek: Number(form.dayOfWeek),
          startTime: form.startTime,
          endTime: form.endTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje || data.error || "Error al guardar horario");
      const diaLabel = DIAS_SEMANA.find((d) => d.value === Number(form.dayOfWeek))?.label;
      setPanel(false);
      setEditandoId(null);
      setForm(FORM_VACIO);
      await cargar(professionalId);
      banner.success(esEdicion ? `Horario del ${diaLabel} actualizado.` : `Horario del ${diaLabel} agregado correctamente.`);
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setAccionando(false);
    }
  };

  const eliminar = async () => {
    if (!aEliminar) return;
    setAccionando(true);
    try {
      const res = await fetch(`${API}/professionals/${professionalId}/schedule/${aEliminar.id}`, {
        method: "DELETE",
        headers: headers(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.mensaje || data.error || "Error al eliminar horario");
      }
      setAEliminar(null);
      await cargar(professionalId);
      banner.success("Horario recurrente eliminado.");
    } catch (err) {
      setAEliminar(null);
      banner.error(err.message);
    } finally {
      setAccionando(false);
    }
  };

  const renderPanel = (wrap = {}) => (
    <div style={{ ...ST.inlinePanel, ...wrap }}>
      <div style={ST.inlinePanelHeader}>
        <span style={ST.inlinePanelTitle}>
          {editandoId ? "Editar horario recurrente" : "Nuevo horario recurrente"}
        </span>
      </div>
      <p style={{ color: "#64748b", fontSize: "12px", marginTop: 0, marginBottom: "12px" }}>
        Se repetirá cada semana y se usará al generar la agenda mensual.
      </p>

      <div style={{ marginBottom: "12px" }}>
        <label style={ST.label}>Día de la semana</label>
        <select
          style={ST.select}
          value={form.dayOfWeek}
          onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: Number(e.target.value) }))}
        >
          {DIAS_SEMANA.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
      </div>

      <div style={ST.fieldRow}>
        <div style={ST.fieldCol}>
          <label style={ST.label}>Hora inicio</label>
          <TimeInput24 value={form.startTime}
            onChange={(v) => setForm((f) => ({ ...f, startTime: v }))} />
        </div>
        <div style={ST.fieldCol}>
          <label style={ST.label}>Hora fin</label>
          <TimeInput24 value={form.endTime}
            onChange={(v) => setForm((f) => ({ ...f, endTime: v }))} />
        </div>
      </div>

      {errorForm && <div style={{ ...ST.alertError, marginBottom: "10px" }}>{errorForm}</div>}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
        <Button type="button" style={ST.btnCancel} onClick={cerrar}>Cancelar</Button>
        <Button onClick={guardar} disabled={accionando}>
          {accionando ? "Guardando..." : editandoId ? "Guardar cambios" : "Guardar horario"}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <div style={ST.sectionHeader}>
        <h3 style={ST.sectionTitle}>Horarios Recurrentes</h3>
        <Button
          onClick={abrirNuevo}
          disabled={accionando}
          style={{ fontSize: "12px", padding: "6px 12px" }}
        >
          {panel && !editandoId ? "× Cerrar" : "+ Agregar"}
        </Button>
      </div>

      {panel && !editandoId && renderPanel()}

      {cargando ? (
        <p style={{ color: "#94a3b8", textAlign: "center", padding: "24px 0" }}>Cargando horarios...</p>
      ) : horarios.length === 0 ? (
        <div style={ST.alertWarn}>
          <strong>Sin horarios recurrentes.</strong><br />
          <small>Agregá al menos un horario para poder generar la agenda mensual.</small>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {horarios.map((h) => {
            const diaLabel = DIAS_SEMANA.find((d) => d.value === h.dayOfWeek)?.label ?? `Día ${h.dayOfWeek}`;
            const enEdicion = panel && editandoId === h.id;
            return (
              <Fragment key={h.id}>
                <div
                  className={!enEdicion ? "senda-recur-item" : undefined}
                  style={enEdicion ? ST.editGroup : undefined}
                >
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 12px",
                    backgroundColor: enEdicion ? "#ede9fe" : "#f8f4ff",
                    borderRadius: enEdicion ? 0 : "8px",
                    border: enEdicion ? "none" : "1px solid #e9d5ff",
                  }}>
                    <div>
                      <span style={{ fontWeight: "700", color: "#5b21b6", fontSize: "13px" }}>{diaLabel}</span>
                      <span style={{ fontSize: "13px", color: enEdicion ? "#4c1d95" : "#475569", marginLeft: "12px" }}>
                        {formatHora(h.startTime)} → {formatHora(h.endTime)}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                      <button
                        onClick={() => abrirEditar(h)}
                        disabled={accionando}
                        title="Editar este horario recurrente"
                        style={{ ...ST.btnIconDelete, color: accionando ? "#cbd5e1" : "#6b21a8" }}
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => setAEliminar({ id: h.id, label: diaLabel })}
                        disabled={accionando}
                        title="Eliminar este horario recurrente"
                        style={{ ...ST.btnIconDelete, color: accionando ? "#cbd5e1" : "#d32f2f" }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {enEdicion && renderPanel({ marginBottom: 0, marginTop: 0, border: "none", borderRadius: 0 })}
                </div>
              </Fragment>
            );
          })}
        </div>
      )}

      <Modal isOpen={!!aEliminar} onClose={() => setAEliminar(null)} title="Confirmar">
        <p>¿Eliminar el horario recurrente del <strong>{aEliminar?.label}</strong>?</p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
          <Button type="button" style={ST.btnCancel} onClick={() => setAEliminar(null)}>Cancelar</Button>
          <Button variant="danger" onClick={eliminar} disabled={accionando}>
            {accionando ? "Eliminando..." : "Sí, eliminar"}
          </Button>
        </div>
      </Modal>

      <style>{`
        @keyframes senda-slide-down {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .senda-recur-item { transition: box-shadow .15s ease; }
        .senda-recur-item:hover { box-shadow: 0 4px 14px rgba(107,33,168,0.18); }
      `}</style>
    </>
  );
}

export default HorariosRecurrentes;
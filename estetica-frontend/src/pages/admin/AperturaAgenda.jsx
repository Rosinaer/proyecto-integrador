import { useState, useEffect, useCallback, Fragment } from "react";
import { Table, Tr, Td } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { useBanner } from "../../components/ui/Banner";
import { PageHeader } from "../../components/ui/PageHeader";
import { TimeInput24 } from "../../components/ui/TimeInput24";
import { useAuth } from "../../hooks/useAuth";
import { HorariosRecurrentes } from "../../components/HorariosRecurrentes";

// ─── Constantes de dominio ────────────────────────────────────
const DIAS_ABREV  = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
               "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const ESTADOS_ACTIVOS = ["PENDING", "CONFIRMED", "IN_PROGRESS"];

// ─── Helpers ──────────────────────────────────────────────────
const contarActivos = (slot) =>
  Array.isArray(slot.appointments)
    ? slot.appointments.filter((a) => ESTADOS_ACTIVOS.includes(a.status)).length
    : 0;

const contarTurnos = (slot) => (Array.isArray(slot.appointments) ? slot.appointments.length : 0);

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

const formatHora = (str) => {
  if (!str) return "—";
  if (str.includes("T")) return new Date(str).toISOString().slice(11, 16);
  return str.slice(0, 5);
};

// ─── Estilos inline (los compartidos van por componentes) ─────
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
  sectionTitle: { margin: 0, color: "#6b21a8", fontSize: "1rem", fontWeight: "700" },
  label: { display: "block", fontSize: "13px", fontWeight: "600", color: "#6b21a8", marginBottom: "5px" },
  select: {
    width: "100%", padding: "9px 12px", border: "1px solid #ccc", borderRadius: "6px",
    fontSize: "14px", backgroundColor: "#fff", cursor: "pointer", boxSizing: "border-box",
  },
  timeInput: {
    width: "100%", padding: "9px 10px", border: "1px solid #ccc", borderRadius: "6px",
    fontSize: "14px", boxSizing: "border-box",
  },

  btnCancel: { backgroundColor: "#e2e8f0", color: "#475569" },
  btnDanger: {
    width: "100%", marginTop: "8px", padding: "9px", fontSize: "13px",
    backgroundColor: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5",
    borderRadius: "6px", cursor: "pointer",
  },
  btnIconDelete: { background: "none", border: "none", fontSize: "15px", lineHeight: "1", padding: "0 4px", cursor: "pointer" },
  alertInfo:  { backgroundColor: "#eff6ff", border: "1px solid #93c5fd", borderRadius: "8px", padding: "12px 16px", fontSize: "13px", color: "#1e40af", marginBottom: "14px" },
  alertWarn:  { backgroundColor: "#fffbeb", border: "1px solid #fbbf24", borderRadius: "8px", padding: "12px 16px", fontSize: "13px", color: "#92400e", marginBottom: "14px" },
  alertError: { backgroundColor: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "12px 16px", fontSize: "13px", color: "#991b1b", marginBottom: "14px" },
  alertOk:    { backgroundColor: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", padding: "12px 16px", fontSize: "13px", color: "#14532d", marginBottom: "14px" },

  inlinePanel: {
    marginBottom: "16px",
    padding: "16px",
    backgroundColor: "#faf5ff",
    border: "1px solid #e9d5ff",
    borderRadius: "8px",
    overflow: "hidden",
    animation: "senda-slide-down 0.18s ease-out",
  },
  inlinePanelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  inlinePanelTitle: { color: "#6b21a8", fontSize: "13px", fontWeight: "700" },
  fieldRow: { display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "12px" },
  fieldCol: { flex: "1 1 130px", minWidth: "130px" },
  editShadow: "0 6px 18px rgba(124,58,237,0.28)",
};

const BadgeSlot = ({ conTurnos }) => (
  <span style={{
    display: "inline-block", padding: "2px 10px", borderRadius: "12px",
    fontSize: "11px", fontWeight: "700",
    backgroundColor: conTurnos ? "#fce7f3" : "#d1fae5",
    color:           conTurnos ? "#9d174d" : "#065f46",
  }}>
    {conTurnos ? "Con turnos" : "Libre"}
  </span>
);


const AperturaAgenda = () => {
  const { token, user } = useAuth();
  const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

  const esProfesional = user?.role === "PROFESSIONAL";
  const miProfId = user?.professionalId || "";

  const hoy = new Date();
  const [profSelId, setProfSelId] = useState("");
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);

  const [profesionales, setProfesionales] = useState([]);
  const banner = useBanner();
  const profNombre = () => profesionales.find((p) => p.id === profSelId)?.person?.name || "—";
  const [slots, setSlots] = useState([]);
  const [horariosCount, setHorariosCount] = useState(0);

  const [cargandoProf, setCargandoProf] = useState(true);
  const [cargandoSlots, setCargandoSlots] = useState(false);
  const [accionando, setAccionando] = useState(false);

  const [errorGlobal, setErrorGlobal] = useState("");

  const [panelSlot, setPanelSlot] = useState(false);
  const [modalRevertir, setModalRevertir] = useState(false);
  const [slotAEliminar, setSlotAEliminar] = useState(null);
  const [slotAArchivar, setSlotAArchivar] = useState(null);

  const formSlotVacio = { date: "", startTime: "09:00", endTime: "17:00" };
  const [formSlot, setFormSlot] = useState(formSlotVacio);
  const [errorForm, setErrorForm] = useState("");
  const [slotEditandoId, setSlotEditandoId] = useState(null);

  const mostrarError = (msg) => banner.error(msg);

  const headers = useCallback((extra = {}) => ({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...extra,
  }), [token]);

  const cerrarPaneles = () => {
    setPanelSlot(false);
    setSlotEditandoId(null);
    setErrorForm("");
  };

  const abrirNuevoSlot = () => {
    if (panelSlot && !slotEditandoId) { cerrarPaneles(); return; }
    setSlotEditandoId(null);
    setFormSlot(formSlotVacio);
    setErrorForm("");
    setPanelSlot(true);
  };

  const abrirEditarSlot = (s) => {
    setSlotEditandoId(s.id);
    setFormSlot({ date: extraerFecha(s.date), startTime: formatHora(s.startTime), endTime: formatHora(s.endTime) });
    setErrorForm("");
    setPanelSlot(true);
  };

  useEffect(() => {
    if (!token) return;

    if (esProfesional) {
      if (miProfId) {
        setProfesionales([{ id: miProfId, person: { name: user?.person?.name || "Mi agenda" } }]);
        setProfSelId(miProfId);
      }
      setCargandoProf(false);
      return;
    }

    const fetchProfs = async () => {
      try {
        const res = await fetch(`${API}/professionals`, { headers: headers() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al cargar profesionales");
        setProfesionales(Array.isArray(data) ? data : []);
      } catch (err) {
        mostrarError(`No se pudo cargar la lista de profesionales: ${err.message}`);
      } finally {
        setCargandoProf(false);
      }
    };
    fetchProfs();
  }, [token, esProfesional, miProfId]);

  const cargarDisponibilidad = useCallback(async (profId, y, m) => {
    if (!profId) return;
    setCargandoSlots(true);
    try {
      const res = await fetch(`${API}/professionals/${profId}/availability?year=${y}&month=${m}`, { headers: headers() });
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

  useEffect(() => {
    if (profSelId) {
      cargarDisponibilidad(profSelId, anio, mes);
    } else {
      setSlots([]);
    }

    cerrarPaneles();
  }, [profSelId, anio, mes]);

  const handleGenerarDisponibilidad = async () => {
    if (horariosCount === 0) {
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
      if (!res.ok) throw new Error(data.mensaje || data.error || "Error al generar disponibilidad");
      await cargarDisponibilidad(profSelId, anio, mes);
      const cantidad = data.slotsCreados ?? data.created ?? data.count ?? "—";
      banner.success("Agenda mensual generada", {
        details: [
          ["Profesional", profNombre()],
          ["Período", `${MESES[mes - 1]} ${anio}`],
          ["Slots creados", String(cantidad)],
        ],
      });
    } catch (err) {
      mostrarError(err.message);
    } finally {
      setAccionando(false);
    }
  };

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
      if (!res.ok) throw new Error(data.mensaje || data.error || "Error al revertir disponibilidad");
      await cargarDisponibilidad(profSelId, anio, mes);
      const eliminados = data.slotsEliminados ?? data.deleted ?? "—";
      banner.warning("Apertura revertida", {
        details: [
          ["Profesional", profNombre()],
          ["Período", `${MESES[mes - 1]} ${anio}`],
          ["Slots libres eliminados", String(eliminados)],
        ],
        warnings: ["Los slots con turnos se conservaron."],
      });
    } catch (err) {
      mostrarError(err.message);
    } finally {
      setAccionando(false);
    }
  };

  const handleArchivarMes = async () => {
    setModalRevertir(false);
    setAccionando(true);
    try {
      const res = await fetch(`${API}/professionals/${profSelId}/availability/archive-month`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ year: anio, month: mes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje || data.error || "Error al archivar la agenda");
      await cargarDisponibilidad(profSelId, anio, mes);
      window.dispatchEvent(new Event("senda:appointments-changed"));
      banner.warning("Agenda del mes archivada", {
        details: [
          ["Profesional", profNombre()],
          ["Período", `${MESES[mes - 1]} ${anio}`],
          ["Slots archivados", String(data.slotsArchivados ?? 0)],
          ["Turnos a reprogramar", String(data.turnosAReprogramar ?? 0)],
        ],
      });
    } catch (err) {
      mostrarError(err.message);
    } finally {
      setAccionando(false);
    }
  };

  const handleGuardarSlot = async () => {
    setErrorForm("");
    if (!formSlot.date) { setErrorForm("Seleccioná una fecha."); return; }

    const esEdicion = !!slotEditandoId;


    if (!esEdicion) {
      const [y, m] = formSlot.date.split("-").map(Number);
      if (y !== anio || m !== mes) {
        setErrorForm(`Solo podés agregar días dentro de ${MESES[mes - 1]} ${anio}, que es el mes que estás trabajando. Cambiá el mes/año arriba si querés cargar otro período.`);
        return;
      }
    }
    if (formSlot.startTime >= formSlot.endTime) {
      setErrorForm("El horario de inicio debe ser anterior al de fin.");
      return;
    }

    setAccionando(true);
    try {
      let res;
      if (esEdicion) {
        res = await fetch(`${API}/professionals/${profSelId}/availability/${slotEditandoId}`, {
          method: "PATCH",
          headers: headers(),
          body: JSON.stringify({
            startTime: formSlot.startTime,
            endTime: formSlot.endTime,
          }),
        });
      } else {
        res = await fetch(`${API}/professionals/${profSelId}/availability`, {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({
            date: formSlot.date,
            startTime: formSlot.startTime,
            endTime: formSlot.endTime,
          }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje || data.error || "Error al guardar el slot");
      setPanelSlot(false);
      setSlotEditandoId(null);
      setFormSlot(formSlotVacio);
      await cargarDisponibilidad(profSelId, anio, mes);
      banner.success(esEdicion ? "Slot actualizado" : "Slot agregado", {
        details: [
          ["Profesional", profNombre()],
          ["Fecha", formatFecha(formSlot.date)],
          ["Desde", formatHora(formSlot.startTime)],
          ["Hasta", formatHora(formSlot.endTime)],
        ],
      });
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setAccionando(false);
    }
  };

  const ejecutarEliminarSlot = async () => {
    if (!slotAEliminar) return;
    setAccionando(true);
    try {
      const res = await fetch(`${API}/professionals/${profSelId}/availability/${slotAEliminar.id}`, {
        method: "DELETE",
        headers: headers(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.mensaje || data.error || "Error al eliminar slot");
      }
      const sl = slotAEliminar;
      setSlotAEliminar(null);
      await cargarDisponibilidad(profSelId, anio, mes);
      banner.warning("Slot eliminado", {
        details: [
          ["Profesional", profNombre()],
          ["Fecha", formatFecha(sl.date)],
          ["Horario", `${formatHora(sl.startTime)} – ${formatHora(sl.endTime)}`],
        ],
      });
    } catch (err) {
      setSlotAEliminar(null);
      mostrarError(err.message);
    } finally {
      setAccionando(false);
    }
  };

  const ejecutarArchivarSlot = async () => {
    if (!slotAArchivar) return;
    setAccionando(true);
    try {
      const res = await fetch(`${API}/professionals/${profSelId}/availability/${slotAArchivar.id}/archive`, {
        method: "PATCH",
        headers: headers(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje || data.error || "Error al archivar el slot");
      const sl = slotAArchivar;
      setSlotAArchivar(null);
      await cargarDisponibilidad(profSelId, anio, mes);
      window.dispatchEvent(new Event("senda:appointments-changed"));
      banner.warning("Slot archivado", {
        details: [
          ["Profesional", profNombre()],
          ["Fecha", formatFecha(sl.date)],
          ["Horario", `${formatHora(sl.startTime)} – ${formatHora(sl.endTime)}`],
          ["Turnos a reprogramar", String(data.turnosAReprogramar ?? 0)],
        ],
      });
    } catch (err) {
      setSlotAArchivar(null);
      mostrarError(err.message);
    } finally {
      setAccionando(false);
    }
  };

  const profSeleccionado = profesionales.find((p) => p.id === profSelId);
  const slotsConTurnos = slots.filter((s) => contarTurnos(s) > 0).length;
  const nombresDelMes = `${MESES[mes - 1]} ${anio}`;

  const getNombreProf = (p) => p?.person?.name ?? p?.name ?? p?.nombre ?? "Sin nombre";
  const getEmailProf  = (p) => p?.person?.email ?? p?.email ?? "";

  const minFecha = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const maxFecha = `${anio}-${String(mes).padStart(2, "0")}-${String(new Date(anio, mes, 0).getDate()).padStart(2, "0")}`;

  const renderPanelSlot = (wrap = {}) => (
    <div style={{ ...S.inlinePanel, ...wrap }}>
      <div style={S.inlinePanelHeader}>
        <span style={S.inlinePanelTitle}>
          {slotEditandoId ? "Editar día manual" : "Agregar día manual"}
        </span>
      </div>
      <p style={{ color: "#64748b", fontSize: "12px", marginTop: 0, marginBottom: "12px" }}>
        {slotEditandoId
          ? "Solo se editan las horas del slot. La fecha no se modifica."
          : <>Útil para días que no están en el horario recurrente (ej: guardia extra, fecha especial). Solo se permite dentro de <strong>{nombresDelMes}</strong>.</>}
      </p>

      <div style={S.fieldRow}>
        <div style={{ flex: "1 1 150px", minWidth: "150px" }}>
          <label style={S.label}>Fecha</label>
          <input
            type="date"
            style={{ ...S.timeInput, backgroundColor: slotEditandoId ? "#f1f5f9" : "#fff" }}
            value={formSlot.date}
            min={minFecha}
            max={maxFecha}
            disabled={!!slotEditandoId}
            onChange={(e) => setFormSlot((f) => ({ ...f, date: e.target.value }))}
          />
        </div>
        <div style={S.fieldCol}>
          <label style={S.label}>Hora inicio</label>
          <TimeInput24 value={formSlot.startTime}
            onChange={(v) => setFormSlot((f) => ({ ...f, startTime: v }))} />
        </div>
        <div style={S.fieldCol}>
          <label style={S.label}>Hora fin</label>
          <TimeInput24 value={formSlot.endTime}
            onChange={(v) => setFormSlot((f) => ({ ...f, endTime: v }))} />
        </div>
      </div>

      {errorForm && <div style={{ ...S.alertError, marginBottom: "10px" }}>{errorForm}</div>}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
        <Button type="button" style={S.btnCancel} onClick={cerrarPaneles}>Cancelar</Button>
        <Button onClick={handleGuardarSlot} disabled={accionando}>
          {accionando ? "Guardando..." : slotEditandoId ? "Guardar cambios" : "Agregar slot"}
        </Button>
      </div>
    </div>
  );

  return (
    <div>

      <style>{`
        @keyframes senda-slide-down {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .senda-slot-table tbody tr:hover > td { background-color: #faf5ff; }
        /* La fila en edición no muestra la línea divisoria: se funde con su form */
        .senda-slot-table tr.senda-edit-row > td { border-bottom: none; }
        .senda-slot-table tr.senda-edit-row:hover > td { background-color: transparent; }
      `}</style>

      <PageHeader
        title="Agendas por Profesional"
        subtitle="Configurá los horarios recurrentes del profesional y generá la disponibilidad mensual."
      />

      <div style={{ ...S.card, marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "2", minWidth: "220px" }}>
            <label style={S.label}>Profesional{esProfesional ? " (tu agenda)" : ""}</label>
            <select
              style={S.select}
              value={profSelId}
              onChange={(e) => { setProfSelId(e.target.value); setErrorGlobal(""); }}
              disabled={cargandoProf || esProfesional}
            >
              <option value="">
                {cargandoProf ? "Cargando profesionales..." : "— Seleccioná un profesional —"}
              </option>
              {profesionales.map((p) => (
                <option key={p.id} value={p.id}>
                  {getNombreProf(p)}{p.specialty ? ` — ${p.specialty}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: "1", minWidth: "130px" }}>
            <label style={S.label}>Mes</label>
            <select style={S.select} value={mes} onChange={(e) => setMes(Number(e.target.value))}>
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>

          <div style={{ flex: "0 0 100px" }}>
            <label style={S.label}>Año</label>
            <select style={S.select} value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
              {[hoy.getFullYear(), hoy.getFullYear() + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {profSeleccionado && (
          <div style={{ marginTop: "14px", padding: "10px 14px", backgroundColor: "#f8f4ff", borderRadius: "8px", fontSize: "13px" }}>
            <strong style={{ color: "#6b21a8" }}>{getNombreProf(profSeleccionado)}</strong>
            {profSeleccionado.specialty && <span style={{ color: "#64748b" }}> · {profSeleccionado.specialty}</span>}
            {getEmailProf(profSeleccionado) && <span style={{ color: "#94a3b8" }}> · {getEmailProf(profSeleccionado)}</span>}
          </div>
        )}
      </div>

      {!profSelId ? (
        <div style={{ ...S.alertInfo, textAlign: "center", padding: "40px", fontSize: "14px" }}>
          Seleccioná un profesional para ver y configurar su agenda.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "20px", alignItems: "start" }}>

          {/* ── Columna izquierda: horarios recurrentes ── */}
          <div style={S.card}>
            <HorariosRecurrentes
              professionalId={profSelId}
              token={token}
              onCountChange={setHorariosCount}
            />

            <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #e2e8f0" }}>
              <Button
                onClick={handleGenerarDisponibilidad}
                disabled={accionando || horariosCount === 0}
                style={{ width: "100%", padding: "11px", fontSize: "14px" }}
              >
                {accionando ? "Procesando..." : `▶ Generar agenda — ${nombresDelMes}`}
              </Button>

              {horariosCount === 0 && (
                <p style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center", marginTop: "6px", marginBottom: 0 }}>
                  Necesitás al menos un horario recurrente.
                </p>
              )}

              {slots.length > 0 && (
                <button
                  onClick={() => setModalRevertir(true)}
                  disabled={accionando}
                  style={S.btnDanger}
                  title="Elimina los slots libres (sin turnos)"
                >
                  ↩ Revertir apertura — {nombresDelMes}
                </button>
              )}
            </div>
          </div>

          <div>
            <div style={S.sectionHeader}>
              <h3 style={S.sectionTitle}>Agenda Generada — {nombresDelMes}</h3>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                {slots.length > 0 && (
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    {slots.length} slot{slots.length !== 1 ? "s" : ""}
                    {slotsConTurnos > 0 && ` · ${slotsConTurnos} con turnos`}
                  </span>
                )}
                <Button
                  onClick={abrirNuevoSlot}
                  disabled={accionando}
                  style={{ fontSize: "12px", padding: "6px 12px" }}
                >
                  {panelSlot && !slotEditandoId ? "× Cerrar" : "+ Día manual"}
                </Button>
              </div>
            </div>

            {panelSlot && !slotEditandoId && renderPanelSlot()}

            {cargandoSlots ? (
              <p style={{ color: "#94a3b8", textAlign: "center", padding: "40px 0" }}>Cargando disponibilidad...</p>
            ) : slots.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 24px", color: "#94a3b8", ...S.card }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📭</div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#64748b", marginBottom: "6px" }}>
                  No hay disponibilidad generada para {nombresDelMes}.
                </div>
                <div style={{ fontSize: "12px" }}>
                  Configurá los horarios recurrentes y presioná <strong>Generar agenda</strong>.
                </div>
              </div>
            ) : (
              <div className="senda-slot-table">
              <Table headers={["Día", "Fecha", "Inicio", "Fin", "Estado", "Turnos", ""]}>
                {slots.map((s) => {
                  const cantTurnos = contarTurnos(s);
                  const cantActivos = contarActivos(s);
                  const conTurnos = cantTurnos > 0;
                  const archivado = s.active === false;
                  const enEdicion = panelSlot && slotEditandoId === s.id;
                  return (
                    <Fragment key={s.id}>
                      <Tr
                        className={enEdicion ? "senda-edit-row" : undefined}
                        style={
                          enEdicion
                            ? { backgroundColor: "#ede9fe", boxShadow: "inset 5px 0 0 #7c3aed" }
                            : archivado
                              ? { backgroundColor: "#f8fafc", opacity: 0.85 }
                              : conTurnos
                                ? { backgroundColor: "#fdf4ff" }
                                : undefined
                        }
                      >
                        <Td><strong style={{ color: "#6b21a8" }}>{diaAbrev(s.date)}</strong></Td>
                        <Td>{formatFecha(s.date)}</Td>
                        <Td>{formatHora(s.startTime)}</Td>
                        <Td>{formatHora(s.endTime)}</Td>
                        <Td>
                          {archivado
                            ? <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "700", backgroundColor: "#e2e8f0", color: "#475569" }}>Archivado</span>
                            : <BadgeSlot conTurnos={conTurnos} />}
                        </Td>
                        <Td>
                          {cantTurnos > 0 ? (
                            <span style={{ fontWeight: "600", color: "#6b21a8" }}>
                              {cantTurnos}
                              {cantActivos !== cantTurnos && (
                                <span style={{ color: "#94a3b8", fontWeight: "400" }}> ({cantActivos} activos)</span>
                              )}
                            </span>
                          ) : (
                            <span style={{ color: "#cbd5e1" }}>—</span>
                          )}
                        </Td>
                        <Td>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}>
                            <button
                              onClick={() => abrirEditarSlot(s)}
                              disabled={accionando || conTurnos}
                              title={conTurnos ? "Tiene turnos — no se puede modificar" : "Editar las horas de este slot"}
                              style={{
                                ...S.btnIconDelete,
                                color: (accionando || conTurnos) ? "#e2e8f0" : "#6b21a8",
                                cursor: (accionando || conTurnos) ? "not-allowed" : "pointer",
                              }}
                            >
                              ✎
                            </button>

                            {conTurnos && (
                              <button
                                onClick={() => setSlotAArchivar(s)}
                                disabled={accionando || archivado}
                                title={archivado ? "Ya está archivado" : "Archivar: saca el slot de la agenda y manda sus turnos a reprogramar"}
                                style={{
                                  ...S.btnIconDelete,
                                  fontSize: "13px",
                                  color: (accionando || archivado) ? "#e2e8f0" : "#b45309",
                                  cursor: (accionando || archivado) ? "not-allowed" : "pointer",
                                }}
                              >
                                📦
                              </button>
                            )}

                            <button
                              onClick={() => setSlotAEliminar(s)}
                              disabled={accionando || conTurnos}
                              title={conTurnos ? "Tiene turnos — no se puede eliminar" : "Eliminar este slot"}
                              style={{
                                ...S.btnIconDelete,
                                color: (accionando || conTurnos) ? "#e2e8f0" : "#d32f2f",
                                cursor: (accionando || conTurnos) ? "not-allowed" : "pointer",
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </Td>
                      </Tr>

                      {enEdicion && (
                        <tr>
                          <td colSpan={7} style={{
                            padding: "0 16px 14px",
                            textAlign: "left",
                            backgroundColor: "#faf5ff",
                            boxShadow: `inset 5px 0 0 #7c3aed, ${S.editShadow}`,
                            borderBottom: "2px solid #7c3aed",
                          }}>
                            {renderPanelSlot({ marginBottom: 0, marginTop: 0, border: "none", borderRadius: 0, backgroundColor: "transparent", boxShadow: "none" })}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </Table>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal isOpen={!!slotAEliminar} onClose={() => setSlotAEliminar(null)} title="Confirmar">
        <p>¿Eliminar el slot del <strong>{slotAEliminar ? formatFecha(slotAEliminar.date) : ""}</strong> ({slotAEliminar ? `${formatHora(slotAEliminar.startTime)}–${formatHora(slotAEliminar.endTime)}` : ""})?</p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
          <Button type="button" style={S.btnCancel} onClick={() => setSlotAEliminar(null)}>Cancelar</Button>
          <Button variant="danger" onClick={ejecutarEliminarSlot} disabled={accionando}>
            {accionando ? "Eliminando..." : "Sí, eliminar"}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={!!slotAArchivar} onClose={() => setSlotAArchivar(null)} title="Archivar slot">
        <p style={{ marginTop: 0 }}>
          ¿Archivar el slot del <strong>{slotAArchivar ? formatFecha(slotAArchivar.date) : ""}</strong>
          {" "}({slotAArchivar ? `${formatHora(slotAArchivar.startTime)}–${formatHora(slotAArchivar.endTime)}` : ""})?
        </p>
        <div style={S.alertInfo}>
          El slot sale de la agenda (no se podrá reservar ahí) y sus <strong>turnos pendientes pasan a la bandeja de reprogramación</strong>. No se borra nada: los turnos se conservan.
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
          <Button type="button" style={S.btnCancel} onClick={() => setSlotAArchivar(null)}>Cancelar</Button>
          <Button onClick={ejecutarArchivarSlot} disabled={accionando}>
            {accionando ? "Archivando..." : "Sí, archivar"}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={modalRevertir} onClose={() => setModalRevertir(false)} title="Revertir Apertura de Agenda">
        <div style={S.alertWarn}>
          <strong>Esta acción eliminará todos los slots libres (sin turnos)</strong> de {nombresDelMes}
          {profSeleccionado ? ` para ${getNombreProf(profSeleccionado)}` : ""}.
        </div>

        {slotsConTurnos > 0 ? (
          <>
            <div style={{ ...S.alertInfo, marginBottom: "16px" }}>
              Los <strong>{slotsConTurnos} slot{slotsConTurnos !== 1 ? "s" : ""}</strong> que ya tienen turnos
              (de cualquier estado) <strong>no se eliminan</strong>. Podés archivarlos y mandar sus turnos
              a la bandeja de reprogramación con el botón de abajo.
            </div>
            <Button
              onClick={handleArchivarMes}
              disabled={accionando}
              style={{ width: "100%", marginBottom: "16px", backgroundColor: "#b45309" }}
            >
              📦 Archivar los {slotsConTurnos} slot{slotsConTurnos !== 1 ? "s" : ""} con turnos y mandarlos a reprogramar
            </Button>
          </>
        ) : (
          <div style={{ ...S.alertInfo, marginBottom: "16px" }}>
            Ningún slot tiene turnos. Se eliminarán los {slots.length} slots del mes.
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <Button type="button" style={S.btnCancel} onClick={() => setModalRevertir(false)}>Cancelar</Button>
          <Button variant="danger" onClick={handleRevertirDisponibilidad} disabled={accionando}>
            {accionando ? "Revirtiendo..." : "Sí, revertir apertura"}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default AperturaAgenda;
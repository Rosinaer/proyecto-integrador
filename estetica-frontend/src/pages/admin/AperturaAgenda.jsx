// ============================================================
// ESPACIO SENDA — AperturaAgenda.jsx  (pestaña "Agendas")
// Ruta: src/pages/admin/AperturaAgenda.jsx
//
// Funcionalidad (WF-08):
//   • Selección de profesional + mes/año
//   • Gestión de horarios recurrentes (CRUD recurringSchedule) con aviso de superposición
//   • Generación y reversión de disponibilidad mensual
//   • Tabla de slots generados con slot manual y borrado individual
//
// UI: el alta/edición de horario recurrente y de slot manual se hacen con
//     paneles desplegables inline (no modales), para poder ver lo que ya está
//     cargado mientras se carga/edita. Los borrados y el revertir siguen con modal.
// ============================================================

import { useState, useEffect, useCallback, Fragment } from "react";
import { Table, Tr, Td } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { TimeInput24 } from "../../components/ui/TimeInput24";
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
const DIAS_ABREV  = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
               "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const ESTADOS_ACTIVOS = ["PENDING", "CONFIRMED", "IN_PROGRESS"];

// ─── Helpers ──────────────────────────────────────────────────
const contarActivos = (slot) =>
  Array.isArray(slot.appointments)
    ? slot.appointments.filter((a) => ESTADOS_ACTIVOS.includes(a.status)).length
    : 0;

// Cantidad total de turnos (de cualquier estado). Cualquier turno bloquea el borrado
// del slot por la relación en la base, así que esto es lo que define si se puede eliminar.
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
  // Botón cancelar gris (idéntico al de Usuarios)
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
  // Panel desplegable inline (reemplaza a los modales de alta/edición)
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
  // Sombra "de hover", reutilizada como sombra del bloque en edición
  editShadow: "0 6px 18px rgba(124,58,237,0.28)",
  // Contenedor que envuelve la fila + su form inline como un solo bloque resaltado
  editGroup: {
    border: "2px solid #7c3aed",
    borderLeft: "5px solid #7c3aed",
    borderRadius: "8px",
    boxShadow: "0 6px 18px rgba(124,58,237,0.28)",
    overflow: "hidden",
  },
};

// ─── Badge de estado de slot ──────────────────────────────────
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

// ════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════
const AperturaAgenda = () => {
  const { token } = useAuth();
  const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

  const hoy = new Date();
  const [profSelId, setProfSelId] = useState("");
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);

  const [profesionales, setProfesionales] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [slots, setSlots] = useState([]);

  const [cargandoProf, setCargandoProf] = useState(true);
  const [cargandoHorarios, setCargandoHorarios] = useState(false);
  const [cargandoSlots, setCargandoSlots] = useState(false);
  const [accionando, setAccionando] = useState(false);

  const [mensajeOk, setMensajeOk] = useState("");
  const [errorGlobal, setErrorGlobal] = useState("");

  // Paneles inline (alta/edición) + modales de confirmación
  const [panelHorario, setPanelHorario] = useState(false);
  const [panelSlot, setPanelSlot] = useState(false);
  const [modalRevertir, setModalRevertir] = useState(false);
  const [horarioAEliminar, setHorarioAEliminar] = useState(null); // { id, label }
  const [slotAEliminar, setSlotAEliminar] = useState(null);       // slot completo

  // Formularios
  const formHorarioVacio = { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" };
  const formSlotVacio    = { date: "", startTime: "09:00", endTime: "17:00" };
  const [formHorario, setFormHorario] = useState(formHorarioVacio);
  const [formSlot, setFormSlot] = useState(formSlotVacio);
  const [errorForm, setErrorForm] = useState("");
  const [horarioEditandoId, setHorarioEditandoId] = useState(null);
  const [slotEditandoId, setSlotEditandoId] = useState(null);

  const mostrarOk    = (msg) => { setMensajeOk(msg);   setTimeout(() => setMensajeOk(""), 5000); };
  const mostrarError = (msg) => { setErrorGlobal(msg); setTimeout(() => setErrorGlobal(""), 7000); };

  const headers = useCallback((extra = {}) => ({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...extra,
  }), [token]);

  // ── Apertura / cierre de los paneles inline ──
  const cerrarPaneles = () => {
    setPanelHorario(false);
    setPanelSlot(false);
    setHorarioEditandoId(null);
    setSlotEditandoId(null);
    setErrorForm("");
  };

  const abrirNuevoHorario = () => {
    // El botón es toggle solo respecto del form "nuevo" de arriba.
    if (panelHorario && !horarioEditandoId) { cerrarPaneles(); return; }
    setPanelSlot(false);
    setSlotEditandoId(null);
    setHorarioEditandoId(null);
    setFormHorario(formHorarioVacio);
    setErrorForm("");
    setPanelHorario(true);
  };

  const abrirEditarHorario = (h) => {
    setPanelSlot(false);
    setSlotEditandoId(null);
    setHorarioEditandoId(h.id);
    setFormHorario({ dayOfWeek: h.dayOfWeek, startTime: formatHora(h.startTime), endTime: formatHora(h.endTime) });
    setErrorForm("");
    setPanelHorario(true);
  };

  const abrirNuevoSlot = () => {
    // El botón es toggle solo respecto del form "nuevo" de arriba.
    if (panelSlot && !slotEditandoId) { cerrarPaneles(); return; }
    setPanelHorario(false);
    setHorarioEditandoId(null);
    setSlotEditandoId(null);
    setFormSlot(formSlotVacio);
    setErrorForm("");
    setPanelSlot(true);
  };

  const abrirEditarSlot = (s) => {
    setPanelHorario(false);
    setHorarioEditandoId(null);
    setSlotEditandoId(s.id);
    setFormSlot({ date: extraerFecha(s.date), startTime: formatHora(s.startTime), endTime: formatHora(s.endTime) });
    setErrorForm("");
    setPanelSlot(true);
  };

  // ── Fetch: profesionales ──
  useEffect(() => {
    if (!token) return;
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
  }, [token]);

  // ── Fetch: horarios recurrentes ──
  const cargarHorarios = useCallback(async (profId) => {
    if (!profId) return;
    setCargandoHorarios(true);
    try {
      const res = await fetch(`${API}/professionals/${profId}/schedule`, { headers: headers() });
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

  // ── Fetch: disponibilidad mensual ──
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
      cargarHorarios(profSelId);
      cargarDisponibilidad(profSelId, anio, mes);
    } else {
      setHorarios([]);
      setSlots([]);
    }
    // Al cambiar de profesional / mes / año cerramos cualquier panel abierto
    cerrarPaneles();
  }, [profSelId, anio, mes]);

  // ── Acción: crear o editar horario recurrente (con chequeo de superposición) ──
  const handleGuardarHorario = async () => {
    setErrorForm("");
    if (formHorario.startTime >= formHorario.endTime) {
      setErrorForm("El horario de inicio debe ser anterior al de fin.");
      return;
    }

    // Aviso de superposición contra los horarios ya cargados del mismo día,
    // excluyendo el horario que se está editando.
    const mismoDia = horarios.filter(
      (h) => h.dayOfWeek === Number(formHorario.dayOfWeek) && h.id !== horarioEditandoId,
    );
    const seSuperpone = mismoDia.some((h) => {
      const hIni = formatHora(h.startTime);
      const hFin = formatHora(h.endTime);
      return formHorario.startTime < hFin && formHorario.endTime > hIni;
    });
    if (seSuperpone) {
      const diaLabel = DIAS_SEMANA.find((d) => d.value === Number(formHorario.dayOfWeek))?.label;
      setErrorForm(`Ese rango se superpone con otro horario ya cargado para el ${diaLabel}. Revisá los horarios de ese día.`);
      return;
    }

    const esEdicion = !!horarioEditandoId;
    setAccionando(true);
    try {
      const url = esEdicion
        ? `${API}/professionals/${profSelId}/schedule/${horarioEditandoId}`
        : `${API}/professionals/${profSelId}/schedule`;
      const res = await fetch(url, {
        method: esEdicion ? "PATCH" : "POST",
        headers: headers(),
        body: JSON.stringify({
          dayOfWeek: Number(formHorario.dayOfWeek),
          startTime: formHorario.startTime,
          endTime: formHorario.endTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje || data.error || "Error al guardar horario");
      const diaLabel = DIAS_SEMANA.find((d) => d.value === Number(formHorario.dayOfWeek))?.label;
      setPanelHorario(false);
      setHorarioEditandoId(null);
      setFormHorario(formHorarioVacio);
      await cargarHorarios(profSelId);
      mostrarOk(esEdicion ? `✓ Horario del ${diaLabel} actualizado.` : `✓ Horario del ${diaLabel} agregado correctamente.`);
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setAccionando(false);
    }
  };

  // ── Acción: eliminar horario recurrente (vía modal de confirmación) ──
  const ejecutarEliminarHorario = async () => {
    if (!horarioAEliminar) return;
    setAccionando(true);
    try {
      const res = await fetch(`${API}/professionals/${profSelId}/schedule/${horarioAEliminar.id}`, {
        method: "DELETE",
        headers: headers(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.mensaje || data.error || "Error al eliminar horario");
      }
      setHorarioAEliminar(null);
      await cargarHorarios(profSelId);
      mostrarOk("✓ Horario recurrente eliminado.");
    } catch (err) {
      setHorarioAEliminar(null);
      mostrarError(err.message);
    } finally {
      setAccionando(false);
    }
  };

  // ── Acción: generar disponibilidad mensual ──
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
      if (!res.ok) throw new Error(data.mensaje || data.error || "Error al generar disponibilidad");
      await cargarDisponibilidad(profSelId, anio, mes);
      const cantidad = data.slotsCreados ?? data.created ?? data.count ?? "—";
      mostrarOk(`✓ Agenda de ${MESES[mes - 1]} ${anio} generada. Slots creados: ${cantidad}.`);
    } catch (err) {
      mostrarError(err.message);
    } finally {
      setAccionando(false);
    }
  };

  // ── Acción: revertir disponibilidad mensual ──
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
      mostrarOk(`✓ Apertura revertida. Slots libres eliminados: ${eliminados}. Los slots con turnos se conservaron.`);
    } catch (err) {
      mostrarError(err.message);
    } finally {
      setAccionando(false);
    }
  };

  // ── Acción: crear slot manual o editar sus horas ──
  const handleGuardarSlot = async () => {
    setErrorForm("");
    if (!formSlot.date) { setErrorForm("Seleccioná una fecha."); return; }

    const esEdicion = !!slotEditandoId;

    // En alta validamos que la fecha caiga en el mes en curso.
    // (En edición la fecha no se modifica, solo las horas.)
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
      mostrarOk(esEdicion ? `✓ Slot del ${formatFecha(formSlot.date)} actualizado.` : `✓ Slot manual del ${formatFecha(formSlot.date)} agregado.`);
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setAccionando(false);
    }
  };

  // ── Acción: eliminar slot individual (vía modal de confirmación) ──
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
      setSlotAEliminar(null);
      await cargarDisponibilidad(profSelId, anio, mes);
      mostrarOk("✓ Slot eliminado.");
    } catch (err) {
      setSlotAEliminar(null);
      mostrarError(err.message);
    } finally {
      setAccionando(false);
    }
  };

  // ── Datos derivados ──
  const profSeleccionado = profesionales.find((p) => p.id === profSelId);
  const slotsConTurnos = slots.filter((s) => contarTurnos(s) > 0).length;
  const nombresDelMes = `${MESES[mes - 1]} ${anio}`;

  const getNombreProf = (p) => p?.person?.name ?? p?.name ?? p?.nombre ?? "Sin nombre";
  const getEmailProf  = (p) => p?.person?.email ?? p?.email ?? "";

  // Límites del input de fecha del slot manual → solo el mes en curso
  const minFecha = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const maxFecha = `${anio}-${String(mes).padStart(2, "0")}-${String(new Date(anio, mes, 0).getDate()).padStart(2, "0")}`;

  // ── Forms inline reutilizables ──
  // wrap permite ajustar márgenes según dónde se rendericen (arriba = alta, debajo de fila = edición).
  const renderPanelHorario = (wrap = {}) => (
    <div style={{ ...S.inlinePanel, ...wrap }}>
      <div style={S.inlinePanelHeader}>
        <span style={S.inlinePanelTitle}>
          {horarioEditandoId ? "Editar horario recurrente" : "Nuevo horario recurrente"}
        </span>
      </div>
      <p style={{ color: "#64748b", fontSize: "12px", marginTop: 0, marginBottom: "12px" }}>
        Se repetirá cada semana y se usará al generar la agenda mensual.
      </p>

      <div style={{ marginBottom: "12px" }}>
        <label style={S.label}>Día de la semana</label>
        <select
          style={S.select}
          value={formHorario.dayOfWeek}
          onChange={(e) => setFormHorario((f) => ({ ...f, dayOfWeek: Number(e.target.value) }))}
        >
          {DIAS_SEMANA.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
      </div>

      <div style={S.fieldRow}>
        <div style={S.fieldCol}>
          <label style={S.label}>Hora inicio</label>
          <TimeInput24 value={formHorario.startTime}
            onChange={(v) => setFormHorario((f) => ({ ...f, startTime: v }))} />
        </div>
        <div style={S.fieldCol}>
          <label style={S.label}>Hora fin</label>
          <TimeInput24 value={formHorario.endTime}
            onChange={(v) => setFormHorario((f) => ({ ...f, endTime: v }))} />
        </div>
      </div>

      {errorForm && <div style={{ ...S.alertError, marginBottom: "10px" }}>{errorForm}</div>}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
        <Button type="button" style={S.btnCancel} onClick={cerrarPaneles}>Cancelar</Button>
        <Button onClick={handleGuardarHorario} disabled={accionando}>
          {accionando ? "Guardando..." : horarioEditandoId ? "Guardar cambios" : "Guardar horario"}
        </Button>
      </div>
    </div>
  );

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

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <div style={{ padding: "20px" }}>

      {/* Animación del desplegable inline */}
      <style>{`
        @keyframes senda-slide-down {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        /* Sombra al pasar el cursor por encima (referencia visual del estado en edición) */
        .senda-recur-item { transition: box-shadow .15s ease; }
        .senda-recur-item:hover { box-shadow: 0 4px 14px rgba(107,33,168,0.18); }
        .senda-slot-table tbody tr:hover > td { background-color: #faf5ff; }
        /* La fila en edición no muestra la línea divisoria: se funde con su form */
        .senda-slot-table tr.senda-edit-row > td { border-bottom: none; }
        .senda-slot-table tr.senda-edit-row:hover > td { background-color: transparent; }
      `}</style>

      {/* ── Encabezado ── */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ color: "#6b21a8", margin: "0 0 6px 0" }}>Agendas</h2>
        <p style={{ color: "#64748b", fontSize: "1rem", margin: 0 }}>
          Configurá los horarios recurrentes del profesional y generá la disponibilidad mensual.
        </p>
      </div>

      {mensajeOk && <div style={S.alertOk}>{mensajeOk}</div>}
      {errorGlobal && <div style={S.alertError}>{errorGlobal}</div>}

      {/* ── Selector de profesional + mes ── */}
      <div style={{ ...S.card, marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "2", minWidth: "220px" }}>
            <label style={S.label}>Profesional</label>
            <select
              style={S.select}
              value={profSelId}
              onChange={(e) => { setProfSelId(e.target.value); setErrorGlobal(""); }}
              disabled={cargandoProf}
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
            <div style={S.sectionHeader}>
              <h3 style={S.sectionTitle}>Horarios Recurrentes</h3>
              <Button
                onClick={abrirNuevoHorario}
                disabled={accionando}
                style={{ fontSize: "12px", padding: "6px 12px" }}
              >
                {panelHorario && !horarioEditandoId ? "× Cerrar" : "+ Agregar"}
              </Button>
            </div>

            {/* Form inline ARRIBA: solo al crear un horario nuevo */}
            {panelHorario && !horarioEditandoId && renderPanelHorario()}

            {cargandoHorarios ? (
              <p style={{ color: "#94a3b8", textAlign: "center", padding: "24px 0" }}>Cargando horarios...</p>
            ) : horarios.length === 0 ? (
              <div style={S.alertWarn}>
                <strong>Sin horarios recurrentes.</strong><br />
                <small>Agregá al menos un horario para poder generar la agenda mensual.</small>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {horarios.map((h) => {
                  const diaLabel = DIAS_SEMANA.find((d) => d.value === h.dayOfWeek)?.label ?? `Día ${h.dayOfWeek}`;
                  const enEdicion = panelHorario && horarioEditandoId === h.id;
                  return (
                    <Fragment key={h.id}>
                      <div
                        className={!enEdicion ? "senda-recur-item" : undefined}
                        style={enEdicion ? S.editGroup : undefined}
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
                            onClick={() => abrirEditarHorario(h)}
                            disabled={accionando}
                            title="Editar este horario recurrente"
                            style={{ ...S.btnIconDelete, color: accionando ? "#cbd5e1" : "#6b21a8" }}
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => setHorarioAEliminar({ id: h.id, label: diaLabel })}
                            disabled={accionando}
                            title="Eliminar este horario recurrente"
                            style={{ ...S.btnIconDelete, color: accionando ? "#cbd5e1" : "#d32f2f" }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Form de EDICIÓN desplegado justo debajo de la fila */}
                      {enEdicion && renderPanelHorario({ marginBottom: 0, marginTop: 0, border: "none", borderRadius: 0 })}
                      </div>
                    </Fragment>
                  );
                })}
              </div>
            )}

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
                  title="Elimina los slots libres (sin turnos)"
                >
                  ↩ Revertir apertura — {nombresDelMes}
                </button>
              )}
            </div>
          </div>

          {/* ── Columna derecha: disponibilidad generada ── */}
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

            {/* Form inline ARRIBA: solo al crear un día manual nuevo */}
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
                  const enEdicion = panelSlot && slotEditandoId === s.id;
                  return (
                    <Fragment key={s.id}>
                      <Tr
                        className={enEdicion ? "senda-edit-row" : undefined}
                        style={
                          enEdicion
                            ? { backgroundColor: "#ede9fe", boxShadow: "inset 5px 0 0 #7c3aed" }
                            : conTurnos
                              ? { backgroundColor: "#fdf4ff" }
                              : undefined
                        }
                      >
                        <Td><strong style={{ color: "#6b21a8" }}>{diaAbrev(s.date)}</strong></Td>
                        <Td>{formatFecha(s.date)}</Td>
                        <Td>{formatHora(s.startTime)}</Td>
                        <Td>{formatHora(s.endTime)}</Td>
                        <Td><BadgeSlot conTurnos={conTurnos} /></Td>
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

                      {/* Form de EDICIÓN desplegado en una fila debajo del slot */}
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

      {/* ══ MODAL: Confirmar eliminar horario recurrente ══ */}
      <Modal isOpen={!!horarioAEliminar} onClose={() => setHorarioAEliminar(null)} title="Confirmar">
        <p>¿Eliminar el horario recurrente del <strong>{horarioAEliminar?.label}</strong>?</p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
          <Button type="button" style={S.btnCancel} onClick={() => setHorarioAEliminar(null)}>Cancelar</Button>
          <Button variant="danger" onClick={ejecutarEliminarHorario} disabled={accionando}>
            {accionando ? "Eliminando..." : "Sí, eliminar"}
          </Button>
        </div>
      </Modal>

      {/* ══ MODAL: Confirmar eliminar slot ══ */}
      <Modal isOpen={!!slotAEliminar} onClose={() => setSlotAEliminar(null)} title="Confirmar">
        <p>¿Eliminar el slot del <strong>{slotAEliminar ? formatFecha(slotAEliminar.date) : ""}</strong> ({slotAEliminar ? `${formatHora(slotAEliminar.startTime)}–${formatHora(slotAEliminar.endTime)}` : ""})?</p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
          <Button type="button" style={S.btnCancel} onClick={() => setSlotAEliminar(null)}>Cancelar</Button>
          <Button variant="danger" onClick={ejecutarEliminarSlot} disabled={accionando}>
            {accionando ? "Eliminando..." : "Sí, eliminar"}
          </Button>
        </div>
      </Modal>

      {/* ══ MODAL: Confirmar Revertir Apertura ══ */}
      <Modal isOpen={modalRevertir} onClose={() => setModalRevertir(false)} title="Revertir Apertura de Agenda">
        <div style={S.alertWarn}>
          <strong>Esta acción eliminará todos los slots libres (sin turnos)</strong> de {nombresDelMes}
          {profSeleccionado ? ` para ${getNombreProf(profSeleccionado)}` : ""}.
        </div>

        {slotsConTurnos > 0 ? (
          <div style={{ ...S.alertInfo, marginBottom: "16px" }}>
            Los <strong>{slotsConTurnos} slot{slotsConTurnos !== 1 ? "s" : ""}</strong> que ya tienen turnos
            (de cualquier estado) <strong>no se eliminan</strong>. Si necesitás liberar esos días, primero
            gestioná los turnos desde la pestaña Turnos.
          </div>
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
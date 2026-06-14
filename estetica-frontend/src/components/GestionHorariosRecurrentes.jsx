import { useState, useEffect, useCallback } from "react";
import { Table, Tr, Td } from "./ui/Table";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { TimeInput24 } from "./ui/TimeInput24";
import { useBanner } from "./ui/Banner";
import { useAuth } from "../hooks/useAuth";

const DIAS_SEMANA = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
];

const formatHora = (str) => {
  if (!str) return "—";
  if (String(str).includes("T")) return new Date(str).toISOString().slice(11, 16);
  return String(str).slice(0, 5);
};

const labelDia = (n) => DIAS_SEMANA.find((d) => d.value === n)?.label ?? `Día ${n}`;

const FORM_VACIO = { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" };


const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: "600",
  color: "#6b21a8",
  marginBottom: "5px",
};

const selectDiaStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 12px",
  border: "1px solid #ccc",
  borderRadius: "6px",
  fontSize: "14px",
  backgroundColor: "#fff",
};

const cajaError = {
  backgroundColor: "#fef2f2",
  border: "1px solid #fca5a5",
  color: "#991b1b",
  borderRadius: "8px",
  padding: "10px 14px",
  fontSize: "13px",
  marginBottom: "12px",
};

export const GestionHorariosRecurrentes = ({ professionalId, token, onCountChange }) => {
  const banner = useBanner();
  const { user } = useAuth();
  // Recepción solo mira los horarios; Admin y el propio profesional editan.
  const editable = ["ADMIN", "PROFESSIONAL"].includes(user?.role);
  const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

  const [horarios, setHorarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [accionando, setAccionando] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [errorForm, setErrorForm] = useState("");

  const [aEliminar, setAEliminar] = useState(null); // { id, label }

  const headers = useCallback(
    (extra = {}) => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...extra,
    }),
    [token],
  );

  const cargar = useCallback(async () => {
    if (!professionalId) return;
    setCargando(true);
    setError("");
    try {
      const res = await fetch(`${API}/professionals/${professionalId}/schedule`, { headers: headers() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje || data.error || "Error al cargar horarios");
      const lista = Array.isArray(data) ? data : [];
      setHorarios([...lista].sort((a, b) => a.dayOfWeek - b.dayOfWeek));
      onCountChange?.(lista.length);
    } catch (err) {
      setError(err.message);
      setHorarios([]);
      onCountChange?.(0);
    } finally {
      setCargando(false);
    }
  }, [API, headers, professionalId, onCountChange]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirCrear = () => {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setErrorForm("");
    setModalAbierto(true);
  };

  const abrirEditar = (h) => {
    setEditandoId(h.id);
    setForm({
      dayOfWeek: h.dayOfWeek,
      startTime: formatHora(h.startTime),
      endTime: formatHora(h.endTime),
    });
    setErrorForm("");
    setModalAbierto(true);
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
      setErrorForm(`Ese rango se superpone con otro horario ya cargado para el ${labelDia(Number(form.dayOfWeek))}.`);
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
      if (!res.ok) throw new Error(data.mensaje || data.error || "Error al guardar el horario");
      setModalAbierto(false);
      setEditandoId(null);
      banner.success(esEdicion ? "Horario actualizado" : "Horario agregado", {
        details: [
          ["Día", labelDia(Number(form.dayOfWeek))],
          ["Desde", formatHora(form.startTime)],
          ["Hasta", formatHora(form.endTime)],
        ],
      });
      setForm(FORM_VACIO);
      await cargar();
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
        throw new Error(data.mensaje || data.error || "Error al eliminar el horario");
      }
      const lbl = aEliminar.label;
      setAEliminar(null);
      banner.warning("Horario eliminado", { details: [["Horario", lbl]] });
      await cargar();
    } catch (err) {
      setAEliminar(null);
      setError(err.message);
      banner.error(err.message);
    } finally {
      setAccionando(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      {/* Encabezado */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          marginBottom: "12px",
        }}
      >
        <h3 style={{ color: "#475569", margin: 0 }}>Horarios recurrentes</h3>
        {editable && (
          <Button
            onClick={abrirCrear}
            disabled={accionando}
            style={{ flex: "0 0 auto", fontSize: "13px", padding: "6px 12px" }}
          >
            + Agregar
          </Button>
        )}
      </div>

      {error && <div style={cajaError}>{error}</div>}

      {cargando ? (
        <p style={{ color: "#94a3b8", padding: "16px 0" }}>Cargando horarios...</p>
      ) : horarios.length === 0 ? (
        <p style={{ color: "#94a3b8" }}>Sin horarios cargados.</p>
      ) : (
        <Table headers={["Día", "Inicio", "Fin", "Acciones"]}>
          {horarios.map((h) => (
            <Tr key={h.id}>
              <Td>{labelDia(h.dayOfWeek)}</Td>
              <Td>{formatHora(h.startTime)}</Td>
              <Td>{formatHora(h.endTime)}</Td>
              <Td>
                {editable ? (
                  <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
                    <Button
                      style={{ flex: "0 0 auto", padding: "6px 12px", fontSize: "12px", backgroundColor: "#64748b" }}
                      onClick={() => abrirEditar(h)}
                      disabled={accionando}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      style={{ flex: "0 0 auto", padding: "6px 12px", fontSize: "12px", backgroundColor: "#d32f2f", color: "#fff" }}
                      onClick={() => setAEliminar({ id: h.id, label: labelDia(h.dayOfWeek) })}
                      disabled={accionando}
                    >
                      Eliminar
                    </Button>
                  </div>
                ) : (
                  <span style={{ color: "#94a3b8" }}>—</span>
                )}
              </Td>
            </Tr>
          ))}
        </Table>
      )}

      {/* Modal crear / editar */}
      <Modal
        isOpen={modalAbierto}
        onClose={() => { setModalAbierto(false); setEditandoId(null); }}
        title={editandoId ? "Editar Horario Recurrente" : "Agregar Horario Recurrente"}
      >
        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
          <p style={{ color: "#64748b", fontSize: "13px", marginTop: 0, marginBottom: "16px" }}>
            Este horario se repetirá cada semana y se usará al generar la agenda mensual.
          </p>

          {/* Día de la semana */}
          <div style={{ display: "flex", flexDirection: "column", marginBottom: "14px" }}>
            <label style={labelStyle}>Día de la semana</label>
            <select
              style={selectDiaStyle}
              value={form.dayOfWeek}
              onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: Number(e.target.value) }))}
            >
              {DIAS_SEMANA.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          {/* Fila de horas */}
          <div style={{ display: "flex", flexDirection: "row", gap: "12px", marginBottom: "14px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", flex: "1 1 0", minWidth: 0 }}>
              <label style={labelStyle}>Hora inicio</label>
              <TimeInput24 value={form.startTime} onChange={(v) => setForm((f) => ({ ...f, startTime: v }))} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", flex: "1 1 0", minWidth: 0 }}>
              <label style={labelStyle}>Hora fin</label>
              <TimeInput24 value={form.endTime} onChange={(v) => setForm((f) => ({ ...f, endTime: v }))} />
            </div>
          </div>

          {errorForm && <div style={cajaError}>{errorForm}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap" }}>
            <Button
              type="button"
              style={{ flex: "0 0 auto", backgroundColor: "#e2e8f0", color: "#475569" }}
              onClick={() => { setModalAbierto(false); setEditandoId(null); }}
            >
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={accionando} style={{ flex: "0 0 auto" }}>
              {accionando ? "Guardando..." : editandoId ? "Guardar cambios" : "Guardar horario"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal confirmar eliminar */}
      <Modal isOpen={!!aEliminar} onClose={() => setAEliminar(null)} title="Confirmar">
        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
          <p style={{ margin: 0 }}>
            ¿Eliminar el horario recurrente del <strong>{aEliminar?.label}</strong>?
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px", flexWrap: "wrap" }}>
            <Button
              type="button"
              style={{ flex: "0 0 auto", backgroundColor: "#e2e8f0", color: "#475569" }}
              onClick={() => setAEliminar(null)}
            >
              Cancelar
            </Button>
            <Button variant="danger" onClick={eliminar} disabled={accionando} style={{ flex: "0 0 auto" }}>
              {accionando ? "Eliminando..." : "Sí, eliminar"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GestionHorariosRecurrentes;
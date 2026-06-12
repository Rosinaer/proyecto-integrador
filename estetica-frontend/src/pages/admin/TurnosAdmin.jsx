// ============================================================
// ESPACIO SENDA — TurnosAdmin.jsx  (pestaña "Turnos" / agenda)
// Ruta: src/pages/admin/TurnosAdmin.jsx
//
//   Las horas se guardan como "hora de pared" de la clínica etiquetada
//   en UTC, así que todo el posicionamiento y formateo usa UTC.
// ============================================================

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { useAuth } from "../../hooks/useAuth";
import { fechaClinicaStr } from "../../config/clinica";
import ReservaTurno from "./ReservaTurno";
import { PageHeader } from "../../components/ui/PageHeader";
import { useNavigate } from "react-router-dom";

// ─── Constantes de la rejilla ─────────────────────────────────
const HORA_INI = 7;    // primera hora visible (07:00)
const HORA_FIN = 21;   // última hora visible (21:00)
const PX_MIN = 0.8;    // px por minuto (vistas verticales)
const ALTO = (HORA_FIN - HORA_INI) * 60 * PX_MIN;
const GUTTER = 52;     // ancho de la columna de horas

const PALETA = ["#7c3aed", "#0ea5e9", "#16a34a", "#ea580c", "#db2777", "#0d9488", "#ca8a04", "#4f46e5"];

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

const ESTADOS = {
  PENDING:     { label: "Pendiente",  bg: "#fef9c3", fg: "#854d0e" },
  CONFIRMED:   { label: "Confirmado", bg: "#dcfce7", fg: "#166534" },
  IN_PROGRESS: { label: "En curso",   bg: "#dbeafe", fg: "#1e40af" },
  COMPLETED:   { label: "Completado", bg: "#d1fae5", fg: "#065f46" },
  CANCELLED:   { label: "Cancelado",  bg: "#fee2e2", fg: "#991b1b" },
  NO_SHOW:     { label: "No asistió", bg: "#f1f5f9", fg: "#64748b" },
};
const PAGO = {
  PENDING:   { label: "Pendiente",   bg: "#fef9c3", fg: "#854d0e" },
  PARTIAL:   { label: "Parcial",     bg: "#ffedd5", fg: "#9a3412" },
  COMPLETED: { label: "Pagado",      bg: "#dcfce7", fg: "#166534" },
  REFUNDED:  { label: "Reembolsado", bg: "#f1f5f9", fg: "#64748b" },
};

const CANCELADO = (s) => s === "CANCELLED" || s === "NO_SHOW";

// ─── Helpers de fecha (todo en UTC = hora de pared) ───────────
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const parseYmd = (s) => new Date(`${s}T12:00:00Z`); // mediodía UTC para evitar bordes
const addDays = (s, n) => { const d = parseYmd(s); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };
const lunesDe = (s) => { const d = parseYmd(s); const dow = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - dow); return ymd(d); };

const fmtHora = (iso) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
const fmtFechaLarga = (s) => { const d = parseYmd(s); return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`; };
const minutosDelDia = (iso) => { const d = new Date(iso); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
const fechaDe = (t) => ymd(new Date(t.startsAt));

const moneda = (v) => Number(v || 0).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const pagadoDe = (t) => (Array.isArray(t?.payments) ? t.payments : []).reduce((a, p) => a + (p.isRefund ? -1 : 1) * Number(p.amount), 0);

const Badge = ({ map, value }) => {
  const c = map[value] || { label: value, bg: "#f1f5f9", fg: "#64748b" };
  return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: c.bg, color: c.fg }}>{c.label}</span>;
};

// ─── Empaquetado de items que se superponen (lado a lado) ─────
// Espera items con `startsAt` y `endsAt` (ISO). Sirve tanto para turnos
// como para slots de disponibilidad (mapeando sus horas a esos campos).
function empacar(items) {
  const evs = items
    .map((t) => ({ t, s: minutosDelDia(t.startsAt), e: minutosDelDia(t.endsAt) }))
    .sort((a, b) => a.s - b.s || a.e - b.e);
  const out = [];
  let cluster = [];
  let clusterEnd = -1;
  const cerrar = () => {
    const cols = []; // cols[i] = fin del último evento en esa columna
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

// ─── Columna vertical de TURNOS (Día = un profesional, Semana = un día) ──
const Columna = ({ items, colorDe, onPick }) => (
  <div style={{
    position: "relative", height: ALTO, borderLeft: "1px solid #e2e8f0",
    backgroundImage: `repeating-linear-gradient(to bottom, #f1f5f9 0, #f1f5f9 1px, transparent 1px, transparent ${60 * PX_MIN}px)`,
  }}>
    {empacar(items).map(({ t, s, e, col, lanes }) => {
      const top = Math.max(0, (s - HORA_INI * 60) * PX_MIN);
      const height = Math.max(16, (e - s) * PX_MIN - 2);
      const color = colorDe[t.professionalService?.professional?.id] || "#6b21a8";
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
          <div style={{ color: "#334155", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.patient?.person?.name || "—"}</div>
          {height > 42 && <div style={{ color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.professionalService?.service?.name}</div>}
        </div>
      );
    })}
  </div>
);

// ─── Columna vertical de COBERTURA (un día = bloques de disponibilidad) ──
// Cada bloque es una franja de agenda abierta de un profesional. Se colorea
// por profesional y, si tiene turnos cargados, los muestra como ocupación.
const ColumnaCobertura = ({ slots, colorDe, nombreDe }) => {
  // Mapeamos cada slot a la forma que entiende `empacar`.
  const items = slots.map((s) => ({ ...s, startsAt: s.startTime, endsAt: s.endTime }));
  return (
    <div style={{
      position: "relative", height: ALTO, borderLeft: "1px solid #e2e8f0",
      backgroundImage: `repeating-linear-gradient(to bottom, #f1f5f9 0, #f1f5f9 1px, transparent 1px, transparent ${60 * PX_MIN}px)`,
    }}>
      {empacar(items).map(({ t, s, e, col, lanes }) => {
        const top = Math.max(0, (s - HORA_INI * 60) * PX_MIN);
        const height = Math.max(18, (e - s) * PX_MIN - 2);
        const color = colorDe[t.professionalId] || "#6b21a8";
        const ocupados = (t.appointments || []).filter((a) => !CANCELADO(a.status)).length;
        const w = 100 / lanes;
        return (
          <div key={t.id}
            title={`${nombreDe[t.professionalId] || ""} · ${fmtHora(t.startTime)}–${fmtHora(t.endTime)}${ocupados ? ` · ${ocupados} turno${ocupados === 1 ? "" : "s"}` : " · libre"}`}
            style={{
              position: "absolute", top, height, left: `calc(${w * col}% + 2px)`, width: `calc(${w}% - 4px)`,
              background: `${color}14`, border: `1px solid ${color}40`, borderLeft: `3px solid ${color}`,
              borderRadius: 6, padding: "3px 6px", overflow: "hidden", fontSize: 11, lineHeight: 1.2,
              boxSizing: "border-box",
            }}>
            <div style={{ fontWeight: 700, color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {nombreDe[t.professionalId] || "—"}
            </div>
            <div style={{ color: "#475569", whiteSpace: "nowrap" }}>{fmtHora(t.startTime)}–{fmtHora(t.endTime)}</div>
            {height > 50 && (
              <div style={{ color: "#64748b" }}>
                {ocupados > 0 ? `${ocupados} turno${ocupados === 1 ? "" : "s"}` : "libre"}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── Vista Cobertura (semanal: columnas por día, eje horario vertical) ──
const CoberturaVista = ({ dias, slots, colorDe, nombreDe }) => {
  const horas = Array.from({ length: HORA_FIN - HORA_INI }, (_, i) => HORA_INI + i);
  const minCol = 132;
  const slotsDe = (d) => slots.filter((s) => s.fecha === d);
  const hay = slots.length > 0;

  return (
    <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff" }}>
      <div style={{ minWidth: GUTTER + dias.length * minCol }}>
        {/* Cabecera de días */}
        <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, background: "#fff", zIndex: 2 }}>
          <div style={{ width: GUTTER, flex: `0 0 ${GUTTER}px` }} />
          {dias.map((d) => {
            const n = slotsDe(d).length;
            const profsDelDia = new Set(slotsDe(d).map((s) => s.professionalId)).size;
            const esHoy = d === fechaClinicaStr();
            return (
              <div key={d} style={{ flex: `1 0 ${minCol}px`, padding: "8px 6px", textAlign: "center", borderLeft: "1px solid #e2e8f0", background: esHoy ? "#f5f3ff" : "#fff" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#334155", textTransform: "capitalize", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {fmtFechaLarga(d)}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>
                  {profsDelDia > 0 ? `${profsDelDia} prof. · ${n} franja${n === 1 ? "" : "s"}` : "sin agenda"}
                </div>
              </div>
            );
          })}
        </div>

        {/* Cuerpo */}
        <div style={{ display: "flex" }}>
          {/* Gutter de horas */}
          <div style={{ width: GUTTER, flex: `0 0 ${GUTTER}px`, position: "relative", height: ALTO }}>
            {horas.map((h) => (
              <div key={h} style={{ position: "absolute", top: (h - HORA_INI) * 60 * PX_MIN - 6, right: 6, fontSize: 11, color: "#94a3b8" }}>
                {pad(h)}:00
              </div>
            ))}
          </div>
          {/* Columnas por día */}
          {dias.map((d) => (
            <div key={d} style={{ flex: `1 0 ${minCol}px` }}>
              <ColumnaCobertura slots={slotsDe(d)} colorDe={colorDe} nombreDe={nombreDe} />
            </div>
          ))}
        </div>
      </div>

      {!hay && (
        <div style={{ padding: "30px 20px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
          No hay agendas abiertas para esta semana. Generá la disponibilidad desde <strong>Agendas</strong>.
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════
const TurnosAdmin = () => {
  const { token } = useAuth();
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [vista, setVista] = useState("dia"); // 'dia' | 'semana' | 'cobertura'
  const [ancla, setAncla] = useState(fechaClinicaStr()); // YYYY-MM-DD enfocado
  const [profesionales, setProfesionales] = useState([]);
  const [profSel, setProfSel] = useState([]); // ids seleccionados
  const [turnos, setTurnos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [ocultarCancelados, setOcultarCancelados] = useState(true);

  // Cobertura (disponibilidad / agendas abiertas)
  const [slotsCob, setSlotsCob] = useState([]);
  const [cargandoCob, setCargandoCob] = useState(false);

  const [detalle, setDetalle] = useState(null);
  const [modalNuevo, setModalNuevo] = useState(false);

  const navigate = useNavigate();
  const [pendientesReprog, setPendientesReprog] = useState(0);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/appointments?needsReschedule=true`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setPendientesReprog(Array.isArray(data) ? data.length : 0);
      } catch { /* nada */ }
    })();
  }, [token]);

  const esSemana = vista === "semana";
  const esCobertura = vista === "cobertura";
  // Día = un día; Semana y Cobertura = la semana (lun-dom) del ancla.
  const semanal = esSemana || esCobertura;

  // Rango visible
  const rango = useMemo(() => {
    if (!semanal) return { ini: ancla, fin: ancla };
    const ini = lunesDe(ancla);
    return { ini, fin: addDays(ini, 6) };
  }, [semanal, ancla]);

  const dias = useMemo(() => {
    if (!semanal) return [ancla];
    const ini = lunesDe(ancla);
    return Array.from({ length: 7 }, (_, i) => addDays(ini, i));
  }, [semanal, ancla]);

  // Color y nombre estables por profesional
  const colorDe = useMemo(() => {
    const m = {};
    profesionales.forEach((p, i) => { m[p.id] = PALETA[i % PALETA.length]; });
    return m;
  }, [profesionales]);

  const nombreDe = useMemo(() => {
    const m = {};
    profesionales.forEach((p) => { m[p.id] = p.person?.name || "—"; });
    return m;
  }, [profesionales]);

  // ── Cargar profesionales (y seleccionarlos todos por defecto) ──
  useEffect(() => {
    if (!token) return;
    fetch(`${apiUrl}/professionals`, { headers })
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setProfesionales(list);
        setProfSel(list.map((p) => p.id));
      })
      .catch(() => setProfesionales([]));
  }, [token]);

  // ── Cargar turnos del rango visible (Día / Semana) ──
  const cargarTurnos = useCallback(async () => {
    if (!token || esCobertura) return; // en Cobertura no usamos turnos
    setCargando(true);
    const desde = `${rango.ini}T00:00:00.000Z`;
    const hasta = `${rango.fin}T23:59:59.999Z`;
    const q = new URLSearchParams({ desde, hasta });
    try {
      const res = await fetch(`${apiUrl}/appointments?${q}`, { headers });
      const data = await res.json();
      setTurnos(Array.isArray(data) ? data : []);
    } catch {
      setTurnos([]);
    } finally {
      setCargando(false);
    }
  }, [token, apiUrl, headers, rango.ini, rango.fin, esCobertura]);

  useEffect(() => { cargarTurnos(); }, [cargarTurnos]);

  // ── Cargar disponibilidad (Cobertura) ──
  // El endpoint de disponibilidad es por profesional y por mes, así que pedimos
  // cada profesional seleccionado para el/los mes(es) que toca la semana visible,
  // y nos quedamos con los slots ACTIVOS cuyas fechas caen en la semana.
  const cargarCobertura = useCallback(async () => {
    if (!esCobertura || !token) return;
    const ids = profesionales.filter((p) => profSel.includes(p.id)).map((p) => p.id);
    if (ids.length === 0) { setSlotsCob([]); return; }

    setCargandoCob(true);
    const meses = new Map();
    dias.forEach((d) => {
      const [y, m] = d.split("-");
      meses.set(`${y}-${Number(m)}`, { year: Number(y), month: Number(m) });
    });
    const diasSet = new Set(dias);

    try {
      const acc = [];
      await Promise.all(
        ids.flatMap((pid) =>
          [...meses.values()].map(async ({ year, month }) => {
            try {
              const res = await fetch(`${apiUrl}/professionals/${pid}/availability?year=${year}&month=${month}`, { headers });
              const data = await res.json();
              if (Array.isArray(data)) {
                data.forEach((s) => {
                  if (s.active === false) return; // solo agendas abiertas (no archivadas)
                  const fecha = String(s.date).slice(0, 10);
                  if (diasSet.has(fecha)) acc.push({ ...s, professionalId: pid, fecha });
                });
              }
            } catch { /* ignora ese profesional/mes */ }
          }),
        ),
      );
      setSlotsCob(acc);
    } finally {
      setCargandoCob(false);
    }
  }, [esCobertura, token, apiUrl, headers, profesionales, profSel, dias]);

  useEffect(() => { cargarCobertura(); }, [cargarCobertura]);

  // ── Turnos visibles (filtro de profesionales + cancelados) ──
  const visibles = useMemo(() => turnos.filter((t) => {
    if (ocultarCancelados && CANCELADO(t.status)) return false;
    return profSel.includes(t.professionalService?.professional?.id);
  }), [turnos, profSel, ocultarCancelados]);

  const profsVisibles = profesionales.filter((p) => profSel.includes(p.id));

  // Columnas para vistas verticales (Día / Semana)
  const columnas = esSemana
    ? dias.map((d) => ({
        key: d,
        titulo: fmtFechaLarga(d),
        esHoy: d === fechaClinicaStr(),
        items: visibles.filter((t) => fechaDe(t) === d),
      }))
    : profsVisibles.map((p) => ({
        key: p.id,
        titulo: p.person?.name || "—",
        color: colorDe[p.id],
        items: visibles.filter((t) => t.professionalService?.professional?.id === p.id && fechaDe(t) === ancla),
      }));

  // ── Navegación ──
  const navegar = (signo) => setAncla((a) => addDays(a, signo * (semanal ? 7 : 1)));
  const irHoy = () => setAncla(fechaClinicaStr());

  const toggleProf = (id) => setProfSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const todos = () => setProfSel(profesionales.map((p) => p.id));
  const ninguno = () => setProfSel([]);

  const horas = Array.from({ length: HORA_FIN - HORA_INI }, (_, i) => HORA_INI + i);

  const tituloRango = semanal
    ? `${parseYmd(rango.ini).getUTCDate()} – ${parseYmd(rango.fin).getUTCDate()} ${MESES[parseYmd(rango.fin).getUTCMonth()].slice(0, 3)} ${parseYmd(rango.fin).getUTCFullYear()}`
    : fmtFechaLarga(ancla);

  const minCol = vista === "dia" ? 150 : 128;

  return (
    <div>
      {/* ── Encabezado ── */}
      <PageHeader
        title="Turnera"
        actions={
          <Button onClick={() => setModalNuevo((v) => !v)}>
            {modalNuevo ? "× Cerrar formulario" : "+ Agendar Turno"}
          </Button>
        }
      />
            {pendientesReprog > 0 && (
      <div
        onClick={() => navigate("/admin/reprogramar")}
        style={{
          cursor: "pointer", background: "#fffbeb", border: "1px solid #fbbf24",
          borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 14,
          color: "#92400e", display: "flex", justifyContent: "space-between", alignItems: "center",
        }}
      >
        <span>⚠ Hay <strong>{pendientesReprog}</strong> turno{pendientesReprog !== 1 ? "s" : ""} a reprogramar.</span>
        <span style={{ fontWeight: 700, textDecoration: "underline" }}>Ir a la bandeja →</span>
      </div>
    )}

      {/* ── Formulario inline de nuevo turno (no modal: la agenda queda visible) ── */}
      {modalNuevo && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 18, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ color: "#6b21a8", margin: 0, fontSize: "1.05rem" }}>Agendar nuevo turno</h3>
            <button type="button" onClick={() => setModalNuevo(false)}
              style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
          </div>
          <ReservaTurno embedded onCreated={() => { cargarTurnos(); }} />
        </div>
      )}

      {/* ── Barra de controles ── */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, marginBottom: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {/* Vista */}
          <div style={{ display: "flex", border: "1px solid #cbd5e1", borderRadius: 8, overflow: "hidden" }}>
            {[["dia", "Día"], ["semana", "Semana"], ["cobertura", "Cobertura"]].map(([v, txt]) => (
              <button key={v} type="button" onClick={() => setVista(v)}
                style={{ border: "none", padding: "7px 16px", fontSize: 13, cursor: "pointer",
                  background: vista === v ? "#6b21a8" : "#fff", color: vista === v ? "#fff" : "#475569", fontWeight: vista === v ? 700 : 400 }}>
                {txt}
              </button>
            ))}
          </div>

          {/* Navegación */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button type="button" onClick={() => navegar(-1)} style={navBtn}>‹</button>
            <button type="button" onClick={irHoy} style={{ ...navBtn, width: "auto", padding: "0 12px", fontSize: 13 }}>Hoy</button>
            <button type="button" onClick={() => navegar(1)} style={navBtn}>›</button>
          </div>

          <strong style={{ color: "#6b21a8", fontSize: 15, textTransform: "capitalize", minWidth: 180 }}>{tituloRango}</strong>

          <input type="date" value={ancla} onChange={(e) => e.target.value && setAncla(e.target.value)}
            style={{ marginLeft: "auto", padding: "7px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13 }} />

          {!esCobertura && (
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#475569", cursor: "pointer" }}>
              <input type="checkbox" checked={ocultarCancelados} onChange={(e) => setOcultarCancelados(e.target.checked)} />
              Ocultar cancelados / no-show
            </label>
          )}
        </div>

        {/* Profesionales */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
          <span style={{ fontSize: 12, color: "#64748b", marginRight: 4 }}>Profesionales:</span>
          {profesionales.map((p) => {
            const on = profSel.includes(p.id);
            const c = colorDe[p.id];
            return (
              <button key={p.id} type="button" onClick={() => toggleProf(p.id)}
                style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${on ? c : "#cbd5e1"}`,
                  background: on ? `${c}1a` : "#fff", color: on ? c : "#94a3b8", borderRadius: 999, padding: "4px 10px", fontSize: 12, cursor: "pointer", fontWeight: on ? 600 : 400 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: on ? c : "#cbd5e1", display: "inline-block" }} />
                {p.person?.name}
              </button>
            );
          })}
          <button type="button" onClick={todos} style={miniLink}>Todos</button>
          <button type="button" onClick={ninguno} style={miniLink}>Ninguno</button>
        </div>

        {esCobertura && (
          <div style={{ fontSize: 12, color: "#64748b", borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
            Mostrando las <strong>agendas abiertas</strong> de la semana (no los turnos). Cada bloque es una franja de
            disponibilidad; el detalle indica si está libre o cuántos turnos tiene cargados.
          </div>
        )}
      </div>

      {/* ── Rejilla ── */}
      {esCobertura ? (
        cargandoCob ? (
          <p style={{ color: "#94a3b8", textAlign: "center", padding: "40px 0" }}>Cargando agendas…</p>
        ) : profsVisibles.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10 }}>
            Elegí al menos un profesional para ver la cobertura.
          </div>
        ) : (
          <CoberturaVista dias={dias} slots={slotsCob} colorDe={colorDe} nombreDe={nombreDe} />
        )
      ) : cargando ? (
        <p style={{ color: "#94a3b8", textAlign: "center", padding: "40px 0" }}>Cargando agenda…</p>
      ) : columnas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10 }}>
          Elegí al menos un profesional para ver la agenda.
        </div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff" }}>
          <div style={{ minWidth: GUTTER + columnas.length * minCol }}>
            {/* Cabecera de columnas */}
            <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, background: "#fff", zIndex: 2 }}>
              <div style={{ width: GUTTER, flex: `0 0 ${GUTTER}px` }} />
              {columnas.map((c) => (
                <div key={c.key} style={{ flex: `1 0 ${minCol}px`, padding: "8px 6px", textAlign: "center", borderLeft: "1px solid #e2e8f0",
                  background: c.esHoy ? "#f5f3ff" : "#fff" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: c.color || "#334155", textTransform: "capitalize", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {!esSemana && c.color && <span style={{ width: 10, height: 10, borderRadius: "50%", background: c.color, display: "inline-block", marginRight: 6 }} />}
                    {c.titulo}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{c.items.length} turno{c.items.length === 1 ? "" : "s"}</div>
                </div>
              ))}
            </div>

            {/* Cuerpo */}
            <div style={{ display: "flex" }}>
              {/* Gutter de horas */}
              <div style={{ width: GUTTER, flex: `0 0 ${GUTTER}px`, position: "relative", height: ALTO }}>
                {horas.map((h) => (
                  <div key={h} style={{ position: "absolute", top: (h - HORA_INI) * 60 * PX_MIN - 6, right: 6, fontSize: 11, color: "#94a3b8" }}>
                    {pad(h)}:00
                  </div>
                ))}
              </div>
              {/* Columnas */}
              {columnas.map((c) => (
                <div key={c.key} style={{ flex: `1 0 ${minCol}px` }}>
                  <Columna items={c.items} colorDe={colorDe} onPick={setDetalle} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal detalle ── */}
      <Modal isOpen={!!detalle} onClose={() => setDetalle(null)} title="Detalle del turno">
        {detalle && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
            <p style={{ margin: 0, textTransform: "capitalize" }}><strong>Fecha:</strong> {fmtFechaLarga(fechaDe(detalle))}</p>
            <p style={{ margin: 0 }}><strong>Horario:</strong> {fmtHora(detalle.startsAt)} – {fmtHora(detalle.endsAt)}</p>
            <p style={{ margin: 0 }}><strong>Paciente:</strong> {detalle.patient?.person?.name || "—"}</p>
            <p style={{ margin: 0 }}><strong>Contacto:</strong> {detalle.patient?.person?.phone || "—"} · {detalle.patient?.person?.email || "—"}</p>
            <p style={{ margin: 0 }}><strong>Servicio:</strong> {detalle.professionalService?.service?.name || "—"}</p>
            <p style={{ margin: 0 }}><strong>Profesional:</strong> {detalle.professionalService?.professional?.person?.name || "—"}</p>
            <p style={{ margin: 0 }}><strong>Estado:</strong> <Badge map={ESTADOS} value={detalle.status} /></p>
            <p style={{ margin: 0 }}>
              <strong>Pago:</strong> <Badge map={PAGO} value={detalle.paymentStatus} />{" "}
              <span style={{ color: "#64748b" }}>({moneda(pagadoDe(detalle))} de {moneda(detalle.priceSnapshot)})</span>
            </p>
            {detalle.notes && (
              <div style={{ marginTop: 6, padding: 10, background: "#f8fafc", borderRadius: 6, borderLeft: "4px solid #6b21a8" }}>
                <strong>📝 Notas:</strong>
                <p style={{ margin: "5px 0 0 0", color: "#475569" }}>{detalle.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

const navBtn = { width: 34, height: 34, borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#6b21a8", fontSize: 18, cursor: "pointer", lineHeight: 1 };
const miniLink = { border: "none", background: "transparent", color: "#6b21a8", fontSize: 12, cursor: "pointer", textDecoration: "underline", padding: "2px 4px" };

export default TurnosAdmin;
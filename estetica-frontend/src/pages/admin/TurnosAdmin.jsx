// ============================================================
// ESPACIO SENDA — TurnosAdmin.jsx  (pestaña "Turnos" / agenda)
// Ruta: src/pages/admin/TurnosAdmin.jsx
//
//   • Vista Día / Semana / Panorama
//       - Día:      columnas por profesional (eje horario vertical)
//       - Semana:   columnas por día (eje horario vertical)
//       - Panorama: una fila por profesional (eje horario horizontal)
//   • Navegación de fechas (‹ Hoy ›) + salto con date picker
//   • Checkboxes de profesionales (color por profesional)
//   • Click en un turno → modal con el detalle completo
//   • "+ Agendar Turno" reusa el ReservaTurno embebido
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
import { useNavigate } from "react-router-dom";

// ─── Constantes de la rejilla ─────────────────────────────────
const HORA_INI = 7;    // primera hora visible (07:00)
const HORA_FIN = 21;   // última hora visible (21:00)
const PX_MIN = 0.8;    // px por minuto (vistas verticales)
const ALTO = (HORA_FIN - HORA_INI) * 60 * PX_MIN;
const GUTTER = 52;     // ancho de la columna de horas

// Panorama (eje horizontal)
const PX_MIN_H = 1.25;                                    // px por minuto (horizontal)
const PANO_NAME = 160;                                    // ancho columna de nombres
const PANO_TOTAL = (HORA_FIN - HORA_INI) * 60 * PX_MIN_H; // ancho del eje de tiempo

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

// ─── Empaquetado de turnos que se superponen (lado a lado) ────
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

// ─── Columna vertical (Día = un profesional, Semana = un día) ──
const Columna = ({ items, colorDe, onPick }) => (
  <div style={{
    position: "relative", height: ALTO, borderLeft: "1px solid #e2e8f0",
    backgroundImage: `repeating-linear-gradient(to bottom, #f1f5f9 0, #f1f5f9 1px, transparent 1px, transparent ${60 * PX_MIN}px)`,
  }}>
    {empacar(items).map(({ t, s, e, col, lanes }) => {
      const top = Math.max(0, (s - HORA_INI * 60) * PX_MIN);
      const height = Math.max(16, (e - s) * PX_MIN - 2);
      const color = colorDe[t.professionalService?.professional?.id] || "#6b21a8";
      const cancel = t.status === "CANCELLED" || t.status === "NO_SHOW";
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

// ─── Vista Panorama (una fila por profesional, eje horizontal) ─
const PanoramaVista = ({ profs, turnosDe, colorDe, onPick }) => {
  const horas = Array.from({ length: HORA_FIN - HORA_INI + 1 }, (_, i) => HORA_INI + i);
  return (
    <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff" }}>
      <div style={{ minWidth: PANO_NAME + PANO_TOTAL }}>
        {/* Cabecera de horas */}
        <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, background: "#fff", zIndex: 2 }}>
          <div style={{ width: PANO_NAME, flex: `0 0 ${PANO_NAME}px`, borderRight: "1px solid #e2e8f0" }} />
          <div style={{ position: "relative", height: 28, width: PANO_TOTAL }}>
            {horas.map((h) => (
              <div key={h} style={{ position: "absolute", left: (h - HORA_INI) * 60 * PX_MIN_H, top: 7, fontSize: 11, color: "#94a3b8", transform: "translateX(-50%)" }}>{pad(h)}:00</div>
            ))}
          </div>
        </div>

        {/* Filas por profesional */}
        {profs.map((p) => {
          const packed = empacar(turnosDe(p.id));
          const maxLanes = packed.reduce((m, x) => Math.max(m, x.lanes), 1);
          const rowH = Math.max(48, 12 + maxLanes * 26);
          const color = colorDe[p.id];
          return (
            <div key={p.id} style={{ display: "flex", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ width: PANO_NAME, flex: `0 0 ${PANO_NAME}px`, padding: "8px 10px", borderRight: "1px solid #e2e8f0",
                display: "flex", alignItems: "center", gap: 8, position: "sticky", left: 0, background: "#fff", zIndex: 1 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, flex: "0 0 auto" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.person?.name}</span>
              </div>
              <div style={{ position: "relative", width: PANO_TOTAL, height: rowH,
                backgroundImage: `repeating-linear-gradient(to right, #f1f5f9 0, #f1f5f9 1px, transparent 1px, transparent ${60 * PX_MIN_H}px)` }}>
                {packed.map(({ t, s, e, col }) => {
                  const left = Math.max(0, (s - HORA_INI * 60) * PX_MIN_H);
                  const width = Math.max(26, (e - s) * PX_MIN_H - 2);
                  const cancel = t.status === "CANCELLED" || t.status === "NO_SHOW";
                  return (
                    <div key={t.id} onClick={() => onPick(t)} title={`${fmtHora(t.startsAt)} · ${t.patient?.person?.name || ""} · ${t.professionalService?.service?.name || ""}`}
                      style={{ position: "absolute", left, width, top: 6 + col * 26, height: 22,
                        background: `${color}1a`, borderLeft: `3px solid ${color}`, borderRadius: 6, padding: "2px 6px",
                        overflow: "hidden", whiteSpace: "nowrap", cursor: "pointer", fontSize: 11, lineHeight: "18px", boxSizing: "border-box", opacity: cancel ? 0.55 : 1 }}>
                      <span style={{ fontWeight: 700, color }}>{fmtHora(t.startsAt)}</span>{" "}
                      <span style={{ color: "#334155", textDecoration: cancel ? "line-through" : "none" }}>{t.patient?.person?.name || "—"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {profs.length === 0 && <div style={{ padding: 30, textAlign: "center", color: "#94a3b8" }}>Elegí al menos un profesional.</div>}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════
const TurnosAdmin = () => {
  const { token } = useAuth();
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [vista, setVista] = useState("dia"); // 'dia' | 'semana' | 'panorama'
  const [ancla, setAncla] = useState(fechaClinicaStr()); // YYYY-MM-DD enfocado
  const [profesionales, setProfesionales] = useState([]);
  const [profSel, setProfSel] = useState([]); // ids seleccionados
  const [turnos, setTurnos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [ocultarCancelados, setOcultarCancelados] = useState(true);

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

  // Rango visible (Día y Panorama = un día; Semana = lun-dom)
  const rango = useMemo(() => {
    if (!esSemana) return { ini: ancla, fin: ancla };
    const ini = lunesDe(ancla);
    return { ini, fin: addDays(ini, 6) };
  }, [esSemana, ancla]);

  const dias = useMemo(() => {
    if (!esSemana) return [ancla];
    const ini = lunesDe(ancla);
    return Array.from({ length: 7 }, (_, i) => addDays(ini, i));
  }, [esSemana, ancla]);

  // Color estable por profesional
  const colorDe = useMemo(() => {
    const m = {};
    profesionales.forEach((p, i) => { m[p.id] = PALETA[i % PALETA.length]; });
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

  // ── Cargar turnos del rango visible ──
  const cargarTurnos = useCallback(async () => {
    if (!token) return;
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
  }, [token, apiUrl, headers, rango.ini, rango.fin]);

  useEffect(() => { cargarTurnos(); }, [cargarTurnos]);

  // ── Turnos visibles (filtro de profesionales + cancelados) ──
  const visibles = useMemo(() => turnos.filter((t) => {
    if (ocultarCancelados && (t.status === "CANCELLED" || t.status === "NO_SHOW")) return false;
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
  const navegar = (signo) => setAncla((a) => addDays(a, signo * (esSemana ? 7 : 1)));
  const irHoy = () => setAncla(fechaClinicaStr());

  const toggleProf = (id) => setProfSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const todos = () => setProfSel(profesionales.map((p) => p.id));
  const ninguno = () => setProfSel([]);

  const horas = Array.from({ length: HORA_FIN - HORA_INI }, (_, i) => HORA_INI + i);

  const tituloRango = esSemana
    ? `${parseYmd(rango.ini).getUTCDate()} – ${parseYmd(rango.fin).getUTCDate()} ${MESES[parseYmd(rango.fin).getUTCMonth()].slice(0, 3)} ${parseYmd(rango.fin).getUTCFullYear()}`
    : fmtFechaLarga(ancla);

  const minCol = vista === "dia" ? 150 : 128;

  return (
    <div>
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
      {/* ── Encabezado ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ color: "#6b21a8", margin: 0 }}>Agenda de Turnos</h2>
        <Button onClick={() => setModalNuevo(true)}>+ Agendar Turno</Button>
      </div>

      {/* ── Barra de controles ── */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, marginBottom: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {/* Vista */}
          <div style={{ display: "flex", border: "1px solid #cbd5e1", borderRadius: 8, overflow: "hidden" }}>
            {[["dia", "Día"], ["semana", "Semana"], ["panorama", "Panorama"]].map(([v, txt]) => (
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

          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#475569", cursor: "pointer" }}>
            <input type="checkbox" checked={ocultarCancelados} onChange={(e) => setOcultarCancelados(e.target.checked)} />
            Ocultar cancelados / no-show
          </label>
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
      </div>

      {/* ── Rejilla ── */}
      {cargando ? (
        <p style={{ color: "#94a3b8", textAlign: "center", padding: "40px 0" }}>Cargando agenda…</p>
      ) : vista === "panorama" ? (
        <PanoramaVista
          profs={profsVisibles}
          turnosDe={(pid) => visibles.filter((t) => t.professionalService?.professional?.id === pid && fechaDe(t) === ancla)}
          colorDe={colorDe}
          onPick={setDetalle}
        />
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

      {/* ── Modal nuevo turno ── */}
      <Modal isOpen={modalNuevo} onClose={() => setModalNuevo(false)} title="Agendar Nuevo Turno">
        <ReservaTurno embedded onCreated={() => { cargarTurnos(); setModalNuevo(false); }} />
      </Modal>
    </div>
  );
};

const navBtn = { width: 34, height: 34, borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#6b21a8", fontSize: 18, cursor: "pointer", lineHeight: 1 };
const miniLink = { border: "none", background: "transparent", color: "#6b21a8", fontSize: 12, cursor: "pointer", textDecoration: "underline", padding: "2px 4px" };

export default TurnosAdmin;
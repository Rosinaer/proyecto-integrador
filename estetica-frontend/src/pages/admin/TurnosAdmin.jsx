import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { useBanner } from "../../components/ui/Banner";
import { useAuth } from "../../hooks/useAuth";
import { fechaClinicaStr } from "../../config/clinica";
import ReservaTurno from "./ReservaTurno";
import { PageHeader } from "../../components/ui/PageHeader";
import { useNavigate } from "react-router-dom";


const HORA_INI = 7;  
const HORA_FIN = 21;  
const PX_MIN = 0.8;  
const ALTO = (HORA_FIN - HORA_INI) * 60 * PX_MIN;
const GUTTER = 52;    

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
 
const SYNC = {
  SYNCHRONIZED: { label: "Sincronizado", bg: "#dcfce7", fg: "#166534" },
  PENDING:      { label: "Pendiente",    bg: "#fef9c3", fg: "#854d0e" },
  FAILED:       { label: "Falló",        bg: "#fee2e2", fg: "#991b1b" },
};

const CANAL = { WHATSAPP: "WhatsApp", EMAIL: "Email", SMS: "SMS" };
const LOG = {
  SENT:   { label: "Enviado", bg: "#dcfce7", fg: "#166534" },
  FAILED: { label: "Falló",   bg: "#fee2e2", fg: "#991b1b" },
  READ:   { label: "Leído",   bg: "#dbeafe", fg: "#1e40af" },
};
 
const fmtMomento = (iso) =>
  new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });

const CANCELADO = (s) => s === "CANCELLED" || s === "NO_SHOW";
 
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
 
function empacar(items) {
  const evs = items
    .map((t) => ({ t, s: minutosDelDia(t.startsAt), e: minutosDelDia(t.endsAt) }))
    .sort((a, b) => a.s - b.s || a.e - b.e);
  const out = [];
  let cluster = [];
  let clusterEnd = -1;
  const cerrar = () => {
    const cols = [];  
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
 
const ColumnaCobertura = ({ slots, colorDe, nombreDe, onPick }) => { 
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
            onClick={() => onPick && onPick(t)}
            title={`${nombreDe[t.professionalId] || ""} · ${fmtHora(t.startTime)}–${fmtHora(t.endTime)}${ocupados ? ` · ${ocupados} turno${ocupados === 1 ? "" : "s"}` : " · libre"}`}
            style={{
              position: "absolute", top, height, left: `calc(${w * col}% + 2px)`, width: `calc(${w}% - 4px)`,
              background: `${color}14`, border: `1px solid ${color}40`, borderLeft: `3px solid ${color}`,
              borderRadius: 6, padding: "3px 6px", overflow: "hidden", fontSize: 11, lineHeight: 1.2,
              boxSizing: "border-box", cursor: onPick ? "pointer" : "default",
            }}>
            <div style={{ fontWeight: 700, color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {nombreDe[t.professionalId] || "—"}
            </div>
            <div style={{ color: "#475569", whiteSpace: "nowrap" }}>{fmtHora(t.startTime)}–{fmtHora(t.endTime)}</div>
            {height > 50 && (
              <div style={{ color: "#64748b" }}>
                {ocupados > 0 ? `${ocupados} turno${ocupados === 1 ? "" : "s"} reservado${ocupados === 1 ? "" : "s"}` : "libre"}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
 
const CoberturaVista = ({ dias, slots, colorDe, nombreDe, onPick }) => {
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
            const slotsDia = slotsDe(d);
            const nFranjas = slotsDia.length;
            const reservados = slotsDia.reduce((acc, s) => acc + (s.appointments || []).filter((a) => !CANCELADO(a.status)).length, 0);
            const esHoy = d === fechaClinicaStr();
            return (
              <div key={d} style={{ flex: `1 0 ${minCol}px`, padding: "8px 6px", textAlign: "center", borderLeft: "1px solid #e2e8f0", background: esHoy ? "#f5f3ff" : "#fff" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#334155", textTransform: "capitalize", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {fmtFechaLarga(d)}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>
                  {nFranjas > 0 ? `${nFranjas} franja${nFranjas === 1 ? "" : "s"} · ${reservados} reservado${reservados === 1 ? "" : "s"}` : "sin agenda"}
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
              <ColumnaCobertura slots={slotsDe(d)} colorDe={colorDe} nombreDe={nombreDe} onPick={onPick} />
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
 
const TurnosAdmin = () => {
  const { token, user } = useAuth();
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const banner = useBanner();
 
  const [confirmRem, setConfirmRem] = useState(null); // turno a recordar
  const [enviandoRem, setEnviandoRem] = useState(false);

  const enviarRecordatorio = async (turno) => {
    if (!turno) return;
    setEnviandoRem(true);
    try {
      const res = await fetch(`${apiUrl}/reminders/turno/${turno.id}`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.mensaje || data.error || "No se pudo enviar el recordatorio");

      const linea = (r) =>
        r.skipped
          ? `${r.channel === "EMAIL" ? "Email al paciente" : "Aviso a la profesional"}: omitido (${r.reason})`
          : `${r.channel === "EMAIL" ? "Email al paciente" : "Aviso a la profesional"}: ${r.status === "SENT" ? "enviado" : "falló"}`;
      banner.success("Recordatorio procesado", {
        details: (data.resultados || []).map((r) => ["", linea(r)]),
      });
      setConfirmRem(null);
    } catch (err) {
      banner.error(err.message);
    } finally {
      setEnviandoRem(false);
    }
  };
 
  const esProfesional = user?.role === "PROFESSIONAL";
  const miProfId = user?.professionalId || "";

  const [vista, setVista] = useState("dia"); 
  const [ancla, setAncla] = useState(fechaClinicaStr()); 
  const [profesionales, setProfesionales] = useState([]);
  const [profSel, setProfSel] = useState([]);  
  const [turnos, setTurnos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [ocultarCancelados, setOcultarCancelados] = useState(true);
 
  const [slotsCob, setSlotsCob] = useState([]);
  const [cargandoCob, setCargandoCob] = useState(false);

  const [detalle, setDetalle] = useState(null);
  const [detalleSlot, setDetalleSlot] = useState(null);  
  const [slotTurnos, setSlotTurnos] = useState([]);      
  const [cargandoSlot, setCargandoSlot] = useState(false);
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
 
  useEffect(() => {
    if (!token) return;
    // El profesional no lista a los demás: se arma su propio item y queda fijo.
    if (esProfesional) {
      const propio = miProfId ? [{ id: miProfId, person: { name: user?.person?.name || "Mis turnos" } }] : [];
      setProfesionales(propio);
      setProfSel(propio.map((p) => p.id));
      return;
    }
    fetch(`${apiUrl}/professionals`, { headers })
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setProfesionales(list);
        setProfSel(list.map((p) => p.id));
      })
      .catch(() => setProfesionales([]));
  }, [token, esProfesional, miProfId]);
 
  const cargarTurnos = useCallback(async () => {
    if (!token || esCobertura) return; // en Disponibilidad usamos los slots de agenda
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
 
  const visibles = useMemo(() => turnos.filter((t) => {
    if (ocultarCancelados && CANCELADO(t.status)) return false;
    return profSel.includes(t.professionalService?.professional?.id);
  }), [turnos, profSel, ocultarCancelados]);

  const profsVisibles = profesionales.filter((p) => profSel.includes(p.id));
 
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
 
  const navegar = (signo) => setAncla((a) => addDays(a, signo * (semanal ? 7 : 1)));
  const irHoy = () => setAncla(fechaClinicaStr());

  const toggleProf = (id) => setProfSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const todos = () => setProfSel(profesionales.map((p) => p.id));
  const ninguno = () => setProfSel([]);
 
  const abrirSlot = useCallback(async (slot) => {
    if (!slot) return;
    setDetalleSlot(slot); 
    setSlotTurnos(Array.isArray(slot.appointments) ? slot.appointments : []);
    if (!token) return;
    setCargandoSlot(true);
    try {
      const desde = `${slot.fecha}T00:00:00.000Z`;
      const hasta = `${slot.fecha}T23:59:59.999Z`;
      const res = await fetch(
        `${apiUrl}/appointments?desde=${desde}&hasta=${hasta}`,
        { headers }
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        const lista = data.filter((t) => t.availabilityId === slot.id);
        setSlotTurnos(lista);
      }
    } catch {
      /* silencioso: conservamos lo que ya mostramos del slot */
    } finally {
      setCargandoSlot(false);
    }
  }, [token, apiUrl, headers]);

  const cerrarSlot = () => {
    setDetalleSlot(null);
    setSlotTurnos([]);
    setCargandoSlot(false);
  };

  const horas = Array.from({ length: HORA_FIN - HORA_INI }, (_, i) => HORA_INI + i);

  const tituloRango = semanal
    ? `${parseYmd(rango.ini).getUTCDate()} – ${parseYmd(rango.fin).getUTCDate()} ${MESES[parseYmd(rango.fin).getUTCMonth()].slice(0, 3)} ${parseYmd(rango.fin).getUTCFullYear()}`
    : fmtFechaLarga(ancla);

  const minCol = vista === "dia" ? 150 : 128;

  return (
    <div> 
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
 
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, marginBottom: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
 
          <div style={{ display: "flex", border: "1px solid #cbd5e1", borderRadius: 8, overflow: "hidden" }}>
            {[["cobertura", "Disponibilidad"], ["dia", "Día"], ["semana", "Semana"]].map(([v, txt]) => (
              <button key={v} type="button" onClick={() => setVista(v)}
                style={{ border: "none", padding: "7px 16px", fontSize: 13, cursor: "pointer",
                  background: vista === v ? "#6b21a8" : "#fff", color: vista === v ? "#fff" : "#475569", fontWeight: vista === v ? 700 : 400 }}>
                {txt}
              </button>
            ))}
          </div>
 
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
            Mostrando las <strong>agendas abiertas</strong> de la semana. Cada bloque es una franja de
            disponibilidad e indica cuántos turnos tiene reservados. Hacé clic en una franja para ver el detalle de sus turnos.
          </div>
        )}
      </div>
 
      {esCobertura ? (
        cargandoCob ? (
          <p style={{ color: "#94a3b8", textAlign: "center", padding: "40px 0" }}>Cargando agendas…</p>
        ) : profsVisibles.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10 }}>
            Elegí al menos un profesional para ver la disponibilidad.
          </div>
        ) : (
          <CoberturaVista dias={dias} slots={slotsCob} colorDe={colorDe} nombreDe={nombreDe} onPick={abrirSlot} />
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
 
            <div style={{ display: "flex" }}> 
              <div style={{ width: GUTTER, flex: `0 0 ${GUTTER}px`, position: "relative", height: ALTO }}>
                {horas.map((h) => (
                  <div key={h} style={{ position: "absolute", top: (h - HORA_INI) * 60 * PX_MIN - 6, right: 6, fontSize: 11, color: "#94a3b8" }}>
                    {pad(h)}:00
                  </div>
                ))}
              </div> 
              {columnas.map((c) => (
                <div key={c.key} style={{ flex: `1 0 ${minCol}px` }}>
                  <Columna items={c.items} colorDe={colorDe} onPick={setDetalle} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
 
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

            {/* ── Sincronización con Google + recordatorios enviados ── */}
            <div style={{ marginTop: 6, padding: 10, background: "#f8fafc", borderRadius: 6, display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ margin: 0 }}>
                <strong>📅 Google Calendar:</strong>{" "}
                <Badge map={SYNC} value={detalle.googleSyncStatus} />{" "}
                {detalle.googleSyncStatus === "FAILED" && (
                  <span style={{ color: "#64748b", fontSize: 12 }}>— se reintenta solo cada 15 min</span>
                )}
                {detalle.googleSyncStatus === "PENDING" && (
                  <span style={{ color: "#64748b", fontSize: 12 }}>— todavía no subió al calendario</span>
                )}
              </p>

              <div>
                <strong>🔔 Recordatorios:</strong>
                {!detalle.reminders || detalle.reminders.length === 0 ? (
                  <span style={{ color: "#64748b" }}> sin envíos todavía (se mandan ~24 hs antes)</span>
                ) : (
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
                    {[...detalle.reminders]
                      .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
                      .map((r) => (
                        <li key={r.id} style={{ fontSize: 13 }}>
                          {CANAL[r.channel] || r.channel}{" "}
                          <Badge map={LOG} value={r.status} />{" "}
                          <span style={{ color: "#64748b" }}>{fmtMomento(r.sentAt)}</span>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>
 
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4, flexWrap: "wrap" }}>
              {detalle.patientId && (
                <Button
                  style={{ backgroundColor: "#8b5cf6" }}
                  onClick={() => { const id = detalle.patientId; setDetalle(null); navigate(`/admin/pacientes/${id}`); }}
                >
                  Ficha del paciente
                </Button>
              )}
              <Button style={{ backgroundColor: "#0ea5e9" }} onClick={() => setConfirmRem(detalle)}>
                Enviar recordatorio
              </Button>
            </div>
          </div>
        )}
      </Modal>
 
      <Modal isOpen={!!confirmRem} onClose={() => !enviandoRem && setConfirmRem(null)} title="Enviar recordatorio">
        {confirmRem && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14 }}>
            <p style={{ margin: 0 }}>
              Se enviará el recordatorio del turno de{" "}
              <strong>{confirmRem.patient?.person?.name || "—"}</strong> ({fmtHora(confirmRem.startsAt)}):
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, color: "#475569" }}>
              <li>Un <strong>email al paciente</strong> ({confirmRem.patient?.person?.email || "sin email"}).</li>
              <li>Un <strong>email para vos</strong> con el link de WhatsApp ya armado para mandárselo al paciente.</li>
            </ul>
            <p style={{ margin: 0, color: "#64748b", fontSize: 12 }}>
              El WhatsApp no se envía solo: te llega el link listo para tocar.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button type="button" style={{ backgroundColor: "#e2e8f0", color: "#475569" }} disabled={enviandoRem} onClick={() => setConfirmRem(null)}>
                Cancelar
              </Button>
              <Button type="button" disabled={enviandoRem} onClick={() => enviarRecordatorio(confirmRem)}>
                {enviandoRem ? "Enviando..." : "Sí, enviar"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
 
      <Modal isOpen={!!detalleSlot} onClose={cerrarSlot} title="Detalle de la disponibilidad">
        {detalleSlot && (() => {
          const appts = (slotTurnos || []).slice().sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
          const reservados = appts.filter((a) => !CANCELADO(a.status)).length;
          const color = colorDe[detalleSlot.professionalId] || "#6b21a8";
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
              <p style={{ margin: 0 }}>
                <strong>Profesional:</strong>{" "}
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} />
                  {nombreDe[detalleSlot.professionalId] || "—"}
                </span>
              </p>
              <p style={{ margin: 0, textTransform: "capitalize" }}>
                <strong>Fecha:</strong> {fmtFechaLarga(detalleSlot.fecha)}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Horario:</strong> {fmtHora(detalleSlot.startTime)} – {fmtHora(detalleSlot.endTime)}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Turnos reservados:</strong>{" "}
                {cargandoSlot
                  ? <span style={{ color: "#94a3b8" }}>cargando…</span>
                  : reservados === 0
                    ? <span style={{ color: "#16a34a", fontWeight: 600 }}>Ninguno (franja libre)</span>
                    : <span style={{ color: "#475569" }}>{reservados}</span>}
              </p>

              {cargandoSlot && appts.length === 0 && (
                <p style={{ margin: "4px 0", color: "#94a3b8" }}>Buscando turnos de esta franja…</p>
              )}

              {appts.length > 0 && (
                <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 6 }}>
                  {appts.map((a) => {
                    const cancel = CANCELADO(a.status);
                    const d = a.startsAt ? new Date(a.startsAt) : null;
                    const hora = d && !isNaN(d) ? fmtHora(a.startsAt) : "—";
                    return (
                      <div key={a.id}
                        onClick={() => setDetalle(a)}
                        title="Ver detalle del turno"
                        style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "6px 10px",
                          border: "1px solid #e2e8f0", borderLeft: `3px solid ${color}`, borderRadius: 8,
                          background: "#fff", opacity: cancel ? 0.6 : 1, cursor: "pointer",
                        }}>
                        <span style={{ fontWeight: 700, color, whiteSpace: "nowrap", textDecoration: cancel ? "line-through" : "none" }}>
                          {hora}
                        </span>
                        <span style={{ flex: 1, minWidth: 0, color: "#334155", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {a.patient?.person?.name || "—"}
                          <span style={{ color: "#94a3b8" }}> · {a.professionalService?.service?.name || "—"}</span>
                        </span>
                        <Badge map={ESTADOS} value={a.status} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

const navBtn = { width: 34, height: 34, borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#6b21a8", fontSize: 18, cursor: "pointer", lineHeight: 1 };
const miniLink = { border: "none", background: "transparent", color: "#6b21a8", fontSize: 12, cursor: "pointer", textDecoration: "underline", padding: "2px 4px" };

export default TurnosAdmin;
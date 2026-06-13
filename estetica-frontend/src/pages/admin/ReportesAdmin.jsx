import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { useAuth } from "../../hooks/useAuth";

const ESTADOS = {
  PENDING:     { label: "Pendiente",  bg: "#fef9c3", fg: "#854d0e" },
  CONFIRMED:   { label: "Confirmado", bg: "#dcfce7", fg: "#166534" },
  IN_PROGRESS: { label: "En curso",   bg: "#dbeafe", fg: "#1e40af" },
  COMPLETED:   { label: "Completado", bg: "#d1fae5", fg: "#065f46" },
  CANCELLED:   { label: "Cancelado",  bg: "#fee2e2", fg: "#991b1b" },
  NO_SHOW:     { label: "No asistió", bg: "#f1f5f9", fg: "#64748b" },
};
const ORDEN_ESTADOS = ["COMPLETED", "CONFIRMED", "PENDING", "IN_PROGRESS", "NO_SHOW", "CANCELLED"];

const pad = (n) => String(n).padStart(2, "0");
const localDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const moneda = (v) =>
  Number(v || 0).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const nomServ = (t) => t?.professionalService?.service?.name ?? "Sin servicio";
const pagadoDe = (t) =>
  (Array.isArray(t?.payments) ? t.payments : []).reduce(
    (acc, p) => acc + (p.isRefund ? -1 : 1) * Number(p.amount), 0);

const S = {
  card: { backgroundColor: "#fff", borderRadius: "10px", padding: "20px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0" },
  label: { display: "block", fontSize: "13px", fontWeight: "600", color: "#6b21a8", marginBottom: "5px" },
  select: { width: "100%", padding: "9px 12px", border: "1px solid #ccc", borderRadius: "6px",
            fontSize: "14px", backgroundColor: "#fff", cursor: "pointer", boxSizing: "border-box" },
  input: { width: "100%", padding: "9px 12px", border: "1px solid #ccc", borderRadius: "6px",
           fontSize: "14px", boxSizing: "border-box" },
  sectionTitle: { margin: "0 0 14px 0", color: "#6b21a8", fontSize: "1.15rem", fontWeight: "700" },
  kpi: { backgroundColor: "#fff", borderRadius: "12px", padding: "18px 20px",
         boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0", minHeight: "104px",
         display: "flex", flexDirection: "column", justifyContent: "space-between" },
  kpiLabel: { color: "#64748b", fontWeight: "600", fontSize: "0.9rem" },
  kpiNumber: { color: "#6b21a8", fontSize: "2rem", fontWeight: "800", lineHeight: "1.1", marginTop: "8px" },
  alertError: { backgroundColor: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px",
                padding: "10px 16px", fontSize: "13px", color: "#991b1b", marginBottom: "14px" },
};

const Kpi = ({ label, value, color, icon }) => (
  <div style={S.kpi}>
    <div style={{ ...S.kpiLabel, display: "flex", justifyContent: "space-between" }}>
      <span>{label}</span><span>{icon}</span>
    </div>
    <div style={{ ...S.kpiNumber, ...(color ? { color } : {}) }}>{value}</div>
  </div>
);

const ReportesAdmin = () => {
  const { token } = useAuth();
  const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const [profSel, setProfSel] = useState("");
  const [desde, setDesde] = useState(localDateStr(primerDiaMes));
  const [hasta, setHasta] = useState(localDateStr(hoy));

  const [profesionales, setProfesionales] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const headers = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/professionals`, { headers: headers() })
      .then((r) => r.json())
      .then((d) => setProfesionales(Array.isArray(d) ? d : []))
      .catch(() => setProfesionales([]));
  }, [token]);

  const cargar = useCallback(async () => {
    if (!token || !desde || !hasta) return;
    setCargando(true);
    setError("");
    const [yd, md, dd] = desde.split("-").map(Number);
    const [yh, mh, dh] = hasta.split("-").map(Number);
    const q = new URLSearchParams({
      desde: new Date(yd, md - 1, dd, 0, 0, 0, 0).toISOString(),
      hasta: new Date(yh, mh - 1, dh, 23, 59, 59, 999).toISOString(),
    });
    if (profSel) q.set("professionalId", profSel);
    try {
      const res = await fetch(`${API}/appointments?${q}`, { headers: headers() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje || data.error || "Error al cargar reportes");
      setTurnos(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setTurnos([]);
    } finally {
      setCargando(false);
    }
  }, [token, API, headers, desde, hasta, profSel]);

  useEffect(() => { cargar(); }, [cargar]);

  const r = useMemo(() => {
    const porEstado = {};
    for (const t of turnos) porEstado[t.status] = (porEstado[t.status] || 0) + 1;
    const total = turnos.length;
    const realizados = porEstado.COMPLETED || 0;
    const noShows = porEstado.NO_SHOW || 0;
    const cancelados = porEstado.CANCELLED || 0;
    const baseAsist = realizados + noShows;
    const asistencia = baseAsist > 0 ? Math.round((100 * realizados) / baseAsist) : null;
    const cancelacion = total > 0 ? Math.round((100 * cancelados) / total) : null;
    const ingresos = turnos.reduce((acc, t) => acc + pagadoDe(t), 0);
    const ticket = realizados > 0 ? ingresos / realizados : 0;
 
    const ranking = {};
    for (const t of turnos) {
      if (t.status === "CANCELLED") continue;
      const k = nomServ(t);
      ranking[k] = (ranking[k] || 0) + 1;
    }
    const rankingArr = Object.entries(ranking)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 8);
    const maxRank = rankingArr.length ? rankingArr[0].cantidad : 0;

    return { porEstado, total, realizados, noShows, cancelados, asistencia, cancelacion,
             ingresos, ticket, rankingArr, maxRank };
  }, [turnos]);

  return (
    <div style={{ width: "100%", boxSizing: "border-box" }}>
      <PageHeader
        title="Reportes"
        subtitle="Métricas del período seleccionado. Por defecto, el mes en curso y todos los profesionales."
      />

      {error && <div style={S.alertError}>{error}</div>}
 
      <div style={{ ...S.card, marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "2", minWidth: "200px" }}>
            <label style={S.label}>Profesional</label>
            <select style={S.select} value={profSel} onChange={(e) => setProfSel(e.target.value)}>
              <option value="">Todos</option>
              {profesionales.map((p) => (
                <option key={p.id} value={p.id}>{p.person?.name || p.name}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: "1", minWidth: "160px" }}>
            <label style={S.label}>Desde</label>
            <input type="date" style={S.input} value={desde} max={hasta}
                   onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div style={{ flex: "1", minWidth: "160px" }}>
            <label style={S.label}>Hasta</label>
            <input type="date" style={S.input} value={hasta} min={desde}
                   onChange={(e) => setHasta(e.target.value)} />
          </div>
        </div>
      </div>

      {cargando ? (
        <p style={{ color: "#94a3b8", textAlign: "center", padding: "40px 0" }}>Calculando reportes...</p>
      ) : (
        <> 
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: "16px", marginBottom: "24px" }}>
            <Kpi label="Ingresos" value={moneda(r.ingresos)} color="#16a34a" icon="💰" />
            <Kpi label="Turnos realizados" value={r.realizados} icon="✅" />
            <Kpi label="Tasa de asistencia" value={r.asistencia === null ? "—" : `${r.asistencia}%`} icon="📈" />
            <Kpi label="No-shows" value={r.noShows} color="#b91c1c" icon="🚫" />
            <Kpi label="Tasa de cancelación" value={r.cancelacion === null ? "—" : `${r.cancelacion}%`} color="#b45309" icon="✖️" />
            <Kpi label="Ticket promedio" value={moneda(r.ticket)} icon="🎫" />
            <Kpi label="Total de turnos" value={r.total} icon="📋" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", alignItems: "start" }}> 
            <div style={S.card}>
              <h3 style={S.sectionTitle}>Servicios más solicitados</h3>
              {r.rankingArr.length === 0 ? (
                <p style={{ color: "#94a3b8" }}>Sin datos en el período.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {r.rankingArr.map((s, i) => (
                    <div key={s.nombre}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "3px" }}>
                        <span style={{ color: "#475569" }}>
                          <strong style={{ color: "#6b21a8" }}>{i + 1}.</strong> {s.nombre}
                        </span>
                        <strong style={{ color: "#6b21a8" }}>{s.cantidad}</strong>
                      </div>
                      <div style={{ height: "8px", backgroundColor: "#f1f5f9", borderRadius: "6px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${r.maxRank ? (100 * s.cantidad) / r.maxRank : 0}%`,
                                      backgroundColor: "#8b5cf6", borderRadius: "6px" }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
 
            <div style={S.card}>
              <h3 style={S.sectionTitle}>Turnos por estado</h3>
              {r.total === 0 ? (
                <p style={{ color: "#94a3b8" }}>Sin turnos en el período.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {ORDEN_ESTADOS.filter((e) => r.porEstado[e]).map((e) => {
                    const c = ESTADOS[e];
                    const cant = r.porEstado[e];
                    const pct = Math.round((100 * cant) / r.total);
                    return (
                      <div key={e}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "3px" }}>
                          <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: "12px",
                                         fontSize: "11px", fontWeight: "700", backgroundColor: c.bg, color: c.fg }}>
                            {c.label}
                          </span>
                          <span style={{ color: "#475569" }}>{cant} · {pct}%</span>
                        </div>
                        <div style={{ height: "8px", backgroundColor: "#f1f5f9", borderRadius: "6px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, backgroundColor: c.fg, borderRadius: "6px" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportesAdmin;
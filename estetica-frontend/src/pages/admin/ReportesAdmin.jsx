import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import { fechaClinicaStr } from "../../config/clinica";
import { ymdDeInstante } from "../../utils/fecha";
import client, { mensajeDeError } from "../../api/client";
import { ESTADOS } from "../../constants/estados";
import { moneda } from "../../utils/moneda";
import {colors, status} from "../../theme/colors"; 


const ORDEN_ESTADOS = ["COMPLETED", "CONFIRMED", "PENDING", "IN_PROGRESS", "NO_SHOW", "CANCELLED"];

const pad = (n) => String(n).padStart(2, "0");
const localDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const nomServ = (t) => t?.professionalService?.service?.name ?? "Sin servicio";
const pagadoDe = (t) =>
  (Array.isArray(t?.payments) ? t.payments : []).reduce(
    (acc, p) => acc + (p.isRefund ? -1 : 1) * Number(p.amount), 0);

const S = {
  card: { backgroundColor: "#fff", borderRadius: "10px", padding: "20px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)", border: "1px solid colors.border" },
  label: { display: "block", fontSize: "13px", fontWeight: "600", color: colors.brand, marginBottom: "5px" },
  select: { width: "100%", padding: "9px 12px", border: "1px solid #ccc", borderRadius: "6px",
            fontSize: "14px", backgroundColor: "#fff", cursor: "pointer", boxSizing: "border-box" },
  input: { width: "100%", padding: "9px 12px", border: "1px solid #ccc", borderRadius: "6px",
           fontSize: "14px", boxSizing: "border-box" },
  sectionTitle: { margin: "0 0 14px 0", color: colors.brand, fontSize: "1.15rem", fontWeight: "700" },
  kpi: { backgroundColor: "#fff", borderRadius: "12px", padding: "18px 20px",
         boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid colors.border", minHeight: "104px",
         display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0 },
  kpiLabel: { color: colors.textSubtle, fontWeight: "600", fontSize: "0.9rem" },
  kpiNumber: { color: colors.brand, fontSize: "1.7rem", fontWeight: "800", lineHeight: "1.1", marginTop: "8px", overflowWrap: "anywhere" },
  alertError: { backgroundColor: status.error.bg, border: `1px solid ${status.error.border}`, borderRadius: "8px",
                padding: "10px 16px", fontSize: "13px", color: status.error.fg, marginBottom: "14px" },
};

const Kpi = ({ label, value, color, icon }) => (
  <div style={S.kpi}>
    <div style={{ ...S.kpiLabel, display: "flex", justifyContent: "space-between" }}>
      <span>{label}</span><span>{icon}</span>
    </div>
    <div style={{ ...S.kpiNumber, ...(color ? { color } : {}) }}>{value}</div>
  </div>
);

const Dashboard = () => {
  const { user, token } = useAuth();
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const [profSel, setProfSel] = useState("");
  const [desde, setDesde] = useState(localDateStr(primerDiaMes));
  const [hasta, setHasta] = useState(localDateStr(hoy));

  const [profesionales, setProfesionales] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    client.get("/professionals")
      .then(({ data }) => setProfesionales(Array.isArray(data) ? data : []))
      .catch(() => setProfesionales([]));
  }, [token]);

  const cargar = useCallback(async () => {
    if (!token || !desde || !hasta) return;
    setCargando(true);
    setError("");
    // Fechas planas (YYYY-MM-DD): el backend las interpreta en hora de la clínica.
    const params = { desde, hasta };
    if (profSel) params.professionalId = profSel;
    try {
      const { data } = await client.get("/appointments", { params });
      setTurnos(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(mensajeDeError(err) || "Error al cargar dashboard");
      setTurnos([]);
    } finally {
      setCargando(false);
    }
  }, [token, desde, hasta, profSel]);

  useEffect(() => { cargar(); }, [cargar]);

  const r = useMemo(() => {
    const hoyStr = fechaClinicaStr();
    const turnosHoy = turnos.filter((t) => ymdDeInstante(t.startsAt) === hoyStr).length;
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

    return { porEstado, turnosHoy, total, realizados, noShows, cancelados, asistencia, cancelacion,
             ingresos, ticket, rankingArr, maxRank };
  }, [turnos]);

  return (
    <div style={{ width: "100%", boxSizing: "border-box" }}>
      <PageHeader
        title={`¡Hola, ${user?.person?.name || user?.name || "Admin"}! 👋`}
        subtitle={<>Resumen de <strong>Espacio Senda</strong>.</>}
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
        <p style={{ color: colors.textMuted, textAlign: "center", padding: "40px 0" }}>Calculando dashboard...</p>
      ) : (
        <>
          <style>{`
            .kpi-grid { display: grid; gap: 16px; margin-bottom: 24px;
                        grid-template-columns: repeat(4, minmax(0, 1fr)); }
            @media (max-width: 900px) { .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
            @media (max-width: 480px) { .kpi-grid { grid-template-columns: 1fr; } }
          `}</style>
          <div className="kpi-grid">
            <Kpi label="Turnos Hoy" value={r.turnosHoy} icon="📅" />
            <Kpi label="Ingresos" value={moneda(r.ingresos)} color={status.success.strong} icon="💰" />
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
                <p style={{ color: colors.textMuted }}>Sin datos en el período.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {r.rankingArr.map((s, i) => (
                    <div key={s.nombre}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "3px" }}>
                        <span style={{ color: colors.textSecondary }}>
                          <strong style={{ color: colors.brand }}>{i + 1}.</strong> {s.nombre}
                        </span>
                        <strong style={{ color: colors.brand }}>{s.cantidad}</strong>
                      </div>
                      <div style={{ height: "8px", backgroundColor: colors.borderSoft, borderRadius: "6px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${r.maxRank ? (100 * s.cantidad) / r.maxRank : 0}%`,
                                      backgroundColor: colors.brand, borderRadius: "6px" }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={S.card}>
              <h3 style={S.sectionTitle}>Turnos por estado</h3>
              {r.total === 0 ? (
                <p style={{ color: colors.textMuted }}>Sin turnos en el período.</p>
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
                          <span style={{ color: colors.textSecondary }}>{cant} · {pct}%</span>
                        </div>
                        <div style={{ height: "8px", backgroundColor: colors.borderSoft, borderRadius: "6px", overflow: "hidden" }}>
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

export default Dashboard;
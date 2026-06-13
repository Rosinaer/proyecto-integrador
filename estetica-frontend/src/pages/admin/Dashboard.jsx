import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Tr, Td } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { useBanner } from "../../components/ui/Banner";
import { PageHeader } from "../../components/ui/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import { fechaClinicaStr } from "../../config/clinica";
 
const hora = (iso) =>
  iso ? new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) : "—";

const fechaHora = (iso) =>
  iso ? new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) : "—";


const fechaParedStr = (iso) => {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};


const hoyStr = () => fechaClinicaStr();

 
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
               "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

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

const METODOS = [
  { value: "CASH", label: "Efectivo" },
  { value: "TRANSFER", label: "Transferencia" },
  { value: "CREDIT_CARD", label: "Tarjeta crédito" },
  { value: "DEBIT_CARD", label: "Tarjeta débito" },
];
const TIPOS_PAGO = [
  { value: "FULL_PAYMENT", label: "Pago total" },
  { value: "DEPOSIT", label: "Seña" },
  { value: "FINAL_PAYMENT", label: "Pago final" },
];
 
const pad = (n) => String(n).padStart(2, "0");
const localDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const moneda = (v) =>
  Number(v || 0).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });



const nomProf = (t) => t?.professionalService?.professional?.person?.name ?? "—";
const nomServ = (t) => t?.professionalService?.service?.name ?? "—";
const nomPac  = (t) => t?.patient?.person?.name ?? "—";

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
  sectionTitle: { margin: 0, color: "#6b21a8", fontSize: "1.2rem", fontWeight: "700" },
  kpi: { backgroundColor: "#fff", borderRadius: "12px", padding: "20px 22px",
         boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0",
         display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "120px" },
  kpiLabel: { color: "#64748b", fontWeight: "600", fontSize: "0.95rem", display: "flex",
              justifyContent: "space-between", alignItems: "center" },
  kpiNumber: { color: "#6b21a8", fontSize: "2.4rem", fontWeight: "800", lineHeight: "1", marginTop: "10px" },
  btnSmall: { padding: "5px 10px", fontSize: "12px" },
  btnCancel: { backgroundColor: "#e2e8f0", color: "#475569" },
  alertOk: { backgroundColor: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px",
             padding: "10px 16px", fontSize: "13px", color: "#14532d", marginBottom: "14px" },
  alertError: { backgroundColor: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px",
                padding: "10px 16px", fontSize: "13px", color: "#991b1b", marginBottom: "14px" },
};

const Badge = ({ map, value }) => {
  const c = map[value] || { label: value, bg: "#f1f5f9", fg: "#64748b" };
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "12px",
                   fontSize: "11px", fontWeight: "700", backgroundColor: c.bg, color: c.fg }}>
      {c.label}
    </span>
  );
};
 
const Dashboard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const banner = useBanner();
  const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

  const esProfesional = user?.role === "PROFESSIONAL";
  const miProfId = user?.professionalId || "";

  const hoy = new Date();
 
  const [kpiProf, setKpiProf] = useState(esProfesional ? miProfId : "");
  const [kpiMes, setKpiMes]   = useState(hoy.getMonth() + 1);
  const [kpiAnio, setKpiAnio] = useState(hoy.getFullYear());
 
  const [tablaProf, setTablaProf] = useState(esProfesional ? miProfId : "");
  const [tablaDia, setTablaDia]   = useState(hoyStr());

  const [profesionales, setProfesionales] = useState([]);
  const [kpiTurnos, setKpiTurnos] = useState([]);
  const [tablaTurnos, setTablaTurnos] = useState([]);
  const [cargandoKpis, setCargandoKpis] = useState(false);
  const [cargandoTabla, setCargandoTabla] = useState(false);
  const [accionando, setAccionando] = useState(false);
 
  const [detalle, setDetalle] = useState(null);
  const [estadoTurno, setEstadoTurno] = useState(null); // turno al que se le cambia el estado
  const [cobroTurno, setCobroTurno] = useState(null);
  const [formCobro, setFormCobro] = useState({ amount: "", method: "CASH", type: "FULL_PAYMENT" });
  const [confirmRem, setConfirmRem] = useState(null);   // turno a recordar (confirmación)
  const [enviandoRem, setEnviandoRem] = useState(false);

  const headers = useCallback(() => ({
    Authorization: `Bearer ${token}`, "Content-Type": "application/json",
  }), [token]);

  // Mensajes ahora van al banner global persistente (no desaparecen solos).
  const mostrarOk    = (m) => banner.success(m);
  const mostrarError = (m) => banner.error(m);
 
  useEffect(() => {
    if (!token) return; 
    if (esProfesional) {
      setProfesionales(miProfId ? [{ id: miProfId, person: { name: user?.person?.name || "Mi perfil" } }] : []);
      return;
    }
    fetch(`${API}/professionals`, { headers: headers() })
      .then((r) => r.json())
      .then((d) => setProfesionales(Array.isArray(d) ? d : []))
      .catch(() => setProfesionales([]));
  }, [token, esProfesional, miProfId]);
 
  const cargarKpis = useCallback(async () => {
    if (!token) return;
    setCargandoKpis(true);
    const desde = new Date(Date.UTC(kpiAnio, kpiMes - 1, 1, 0, 0, 0, 0)).toISOString();
    const hasta = new Date(Date.UTC(kpiAnio, kpiMes, 0, 23, 59, 59, 999)).toISOString();
    const q = new URLSearchParams({ desde, hasta });
    if (kpiProf) q.set("professionalId", kpiProf);
    try {
      const res = await fetch(`${API}/appointments?${q}`, { headers: headers() });
      const data = await res.json();
      setKpiTurnos(Array.isArray(data) ? data : []);
    } catch {
      setKpiTurnos([]);
    } finally {
      setCargandoKpis(false);
    }
  }, [token, API, headers, kpiProf, kpiMes, kpiAnio]);

  useEffect(() => { cargarKpis(); }, [cargarKpis]);
 
  const cargarTabla = useCallback(async () => {
    if (!token || !tablaDia) return;
    setCargandoTabla(true);
    const [y, m, d] = tablaDia.split("-").map(Number);
    const desde = new Date(`${tablaDia}T00:00:00.000Z`).toISOString();
    const hasta = new Date(`${tablaDia}T23:59:59.999Z`).toISOString();
    const q = new URLSearchParams({ desde, hasta });
    if (tablaProf) q.set("professionalId", tablaProf);
    try {
      const res = await fetch(`${API}/appointments?${q}`, { headers: headers() });
      const data = await res.json();
      setTablaTurnos(Array.isArray(data) ? data : []);
    } catch {
      setTablaTurnos([]);
    } finally {
      setCargandoTabla(false);
    }
  }, [token, API, headers, tablaProf, tablaDia]);

  useEffect(() => { cargarTabla(); }, [cargarTabla]);

  const refrescar = () => { cargarKpis(); cargarTabla(); };
 
  const kpis = useMemo(() => {
    const hs = hoyStr();
    const turnosHoy = kpiTurnos.filter((t) => fechaParedStr(t.startsAt) === hs).length;
    const completados = kpiTurnos.filter((t) => t.status === "COMPLETED").length;
    const noShows     = kpiTurnos.filter((t) => t.status === "NO_SHOW").length;
    const base = completados + noShows;
    const asistencia = base > 0 ? Math.round((100 * completados) / base) : null;
    const ingresos = kpiTurnos.reduce((acc, t) => acc + pagadoDe(t), 0);
    return { turnosHoy, asistencia, noShows, ingresos };
  }, [kpiTurnos]);
 
  const cambiarEstado = async (turno, status) => {
    setAccionando(true);
    const prev = turno.status;
    try {
      const res = await fetch(`${API}/appointments/${turno.id}/status`, {
        method: "PATCH", headers: headers(), body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje || data.error || "No se pudo cambiar el estado");
      setEstadoTurno(null);
      refrescar();
      window.dispatchEvent(new Event("senda:appointments-changed"));
      banner.success("Estado del turno actualizado", {
        details: [
          ["Paciente", nomPac(turno)],
          ["Turno", `${fechaParedStr(turno.startsAt).split("-").reverse().join("/")} · ${hora(turno.startsAt)}`],
          ["Profesional", nomProf(turno)],
          ["Servicio", nomServ(turno)],
          ["Estado anterior", ESTADOS[prev]?.label || prev],
          ["Estado nuevo", ESTADOS[status]?.label || status],
        ],
      });
    } catch (err) {
      mostrarError(err.message);
    } finally {
      setAccionando(false);
    }
  };
 
  const enviarRecordatorio = async (turno) => {
    if (!turno) return;
    setEnviandoRem(true);
    try {
      const res = await fetch(`${API}/reminders/turno/${turno.id}`, {
        method: "POST", headers: headers(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.mensaje || data.error || "No se pudo enviar el recordatorio");

      const etiqueta = (r) => (r.channel === "EMAIL" ? "Email al paciente" : "Aviso a la profesional");
      const estado = (r) => (r.skipped ? `omitido (${r.reason})` : r.status === "SENT" ? "enviado" : "falló");
      setConfirmRem(null);
      refrescar();
      banner.success("Recordatorio procesado", {
        details: [
          ["Paciente", nomPac(turno)],
          ...(data.resultados || []).map((r) => [etiqueta(r), estado(r)]),
        ],
      });
    } catch (err) {
      mostrarError(err.message);
    } finally {
      setEnviandoRem(false);
    }
  };

  const abrirCobro = (turno) => {
    const restante = Math.max(0, Number(turno.priceSnapshot || 0) - pagadoDe(turno));
    setFormCobro({ amount: restante || "", method: "CASH", type: "FULL_PAYMENT" });
    setCobroTurno(turno);
  };

  const registrarCobro = async () => {
    if (!cobroTurno) return;
    if (!formCobro.amount || Number(formCobro.amount) <= 0) {
      mostrarError("Ingresá un monto válido."); return;
    }
    setAccionando(true);
    try {
      const res = await fetch(`${API}/payments/${cobroTurno.id}`, {
        method: "POST", headers: headers(),
        body: JSON.stringify({
          amount: Number(formCobro.amount), method: formCobro.method, type: formCobro.type,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje || data.error || "No se pudo registrar el cobro");
      const metodoLbl = METODOS.find((m) => m.value === formCobro.method)?.label || formCobro.method;
      const tipoLbl = TIPOS_PAGO.find((m) => m.value === formCobro.type)?.label || formCobro.type;
      const totalPagado = pagadoDe(cobroTurno) + Number(formCobro.amount);
      const turnoCobrado = cobroTurno;
      setCobroTurno(null);
      refrescar();
      banner.success("Cobro registrado", {
        details: [
          ["Paciente", nomPac(turnoCobrado)],
          ["Servicio", nomServ(turnoCobrado)],
          ["Monto", moneda(formCobro.amount)],
          ["Método", metodoLbl],
          ["Tipo", tipoLbl],
          ["Pagado / Total", `${moneda(totalPagado)} / ${moneda(turnoCobrado.priceSnapshot)}`],
        ],
      });
    } catch (err) {
      mostrarError(err.message);
    } finally {
      setAccionando(false);
    }
  };

  const optsProf = profesionales.map((p) => (
    <option key={p.id} value={p.id}>{p.person?.name || p.name}</option>
  ));
 
  return (
    <div style={{ width: "100%", boxSizing: "border-box" }}>
      <PageHeader
        title={`¡Hola, ${user?.person?.name || user?.name || "Admin"}! 👋`}
        subtitle={<>Resumen de <strong>Espacio Senda</strong>.</>}
      />
 
      <div style={{ ...S.card, marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "2", minWidth: "200px" }}>
            <label style={S.label}>Profesional{esProfesional ? " (vos)" : ""}</label>
            <select style={S.select} value={kpiProf} onChange={(e) => setKpiProf(e.target.value)} disabled={esProfesional}>
              {!esProfesional && <option value="">Todos</option>}
              {optsProf}
            </select>
          </div>
          <div style={{ flex: "1", minWidth: "130px" }}>
            <label style={S.label}>Mes</label>
            <select style={S.select} value={kpiMes} onChange={(e) => setKpiMes(Number(e.target.value))}>
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div style={{ flex: "0 0 100px" }}>
            <label style={S.label}>Año</label>
            <select style={S.select} value={kpiAnio} onChange={(e) => setKpiAnio(Number(e.target.value))}>
              {[hoy.getFullYear() - 1, hoy.getFullYear(), hoy.getFullYear() + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
 
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "18px", marginBottom: "16px" }}>
        <div style={S.kpi}>
          <div style={S.kpiLabel}><span>Turnos de hoy</span><span>📅</span></div>
          <div style={S.kpiNumber}>{cargandoKpis ? "…" : kpis.turnosHoy}</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiLabel}><span>Asistencia del mes</span><span>✅</span></div>
          <div style={S.kpiNumber}>
            {cargandoKpis ? "…" : kpis.asistencia === null ? "—" : `${kpis.asistencia}%`}
          </div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiLabel}><span>No-shows del mes</span><span>🚫</span></div>
          <div style={{ ...S.kpiNumber, color: "#b91c1c" }}>{cargandoKpis ? "…" : kpis.noShows}</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiLabel}><span>Ingresos del mes</span><span>💰</span></div>
          <div style={{ ...S.kpiNumber, color: "#16a34a", fontSize: "1.8rem" }}>
            {cargandoKpis ? "…" : moneda(kpis.ingresos)}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "36px" }}>
        <Button onClick={() => navigate("/admin/reserva-turno")} style={{ padding: "12px 22px", fontSize: "15px" }}>
          + Reservar turno
        </Button>
      </div>

      {/* ── Control de turnos ── */}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end",
                      gap: "16px", flexWrap: "wrap", marginBottom: "18px" }}>
          <h3 style={S.sectionTitle}>Control de Turnos</h3>
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ minWidth: "170px" }}>
              <label style={S.label}>Día</label>
              <input type="date" style={S.input} value={tablaDia}
                     onChange={(e) => setTablaDia(e.target.value)} />
            </div>
            <div style={{ minWidth: "190px" }}>
              <label style={S.label}>Profesional{esProfesional ? " (vos)" : ""}</label>
              <select style={S.select} value={tablaProf} onChange={(e) => setTablaProf(e.target.value)} disabled={esProfesional}>
                {!esProfesional && <option value="">Todos</option>}
                {optsProf}
              </select>
            </div>
          </div>
        </div>

        {cargandoTabla ? (
          <p style={{ color: "#94a3b8", textAlign: "center", padding: "32px 0" }}>Cargando turnos...</p>
        ) : tablaTurnos.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
            <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📭</div>
            No hay turnos para ese día.
          </div>
        ) : (
          <Table headers={["Inicio", "Fin", "Paciente", "Profesional", "Servicio",
                           "Estado", "Pago", "Recordatorio", "Acciones"]}>
            {tablaTurnos.map((t) => {
              const rem = Array.isArray(t.reminders) ? t.reminders : null;
              const remTxt = rem == null ? "—"
                : rem.some((r) => r.status === "SENT") ? "✓ Enviado"
                : rem.length ? "Falló" : "Pendiente";
              return (
                <Tr key={t.id}>
                  <Td><strong style={{ color: "#6b21a8" }}>{hora(t.startsAt)}</strong></Td>
                  <Td>{hora(t.endsAt)}</Td>
                  <Td>
                    {t.patientId ? (
                      <span
                        style={{ color: "#6b21a8", cursor: "pointer" }}
                        onClick={() => navigate(`/admin/pacientes/${t.patientId}`)}
                        title="Ver ficha del paciente"
                      >
                        <strong>{nomPac(t)}</strong>
                      </span>
                    ) : nomPac(t)}
                  </Td>
                  <Td>{nomProf(t)}</Td>
                  <Td>{nomServ(t)}</Td>
                  <Td><Badge map={ESTADOS} value={t.status} /></Td>
                  <Td><Badge map={PAGO} value={t.paymentStatus} /></Td>
                  <Td><span style={{ fontSize: "12px", color: "#64748b" }}>{remTxt}</span></Td>
                  <Td>
                    <div style={{ display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap" }}>
                      <Button style={{ ...S.btnSmall, backgroundColor: "#8b5cf6" }}
                              onClick={() => setDetalle(t)}>Detalle</Button>
                      <Button style={{ ...S.btnSmall, backgroundColor: "#64748b" }}
                              onClick={() => setEstadoTurno(t)}
                              title="Cambiar estado (se puede revertir a cualquier estado)">
                        Estado
                      </Button>
                      <Button style={{ ...S.btnSmall, backgroundColor: "#16a34a", color: "#fff" }}
                              disabled={t.paymentStatus === "COMPLETED" || t.status === "CANCELLED"}
                              onClick={() => abrirCobro(t)}>
                        Cobrar
                      </Button>
                      <Button variant="danger" style={S.btnSmall}
                              disabled={t.status === "CANCELLED"}
                              onClick={() => cambiarEstado(t, "CANCELLED")}>
                        Cancelar
                      </Button>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </Table>
        )}
      </div>
 
      <Modal isOpen={!!detalle} onClose={() => setDetalle(null)} title="Detalle del turno">
        {detalle && (() => {
          const pagado = pagadoDe(detalle);
          const total = Number(detalle.priceSnapshot || 0);
          const saldo = Math.max(0, total - pagado);
          const dur = Math.round((new Date(detalle.endsAt) - new Date(detalle.startsAt)) / 60000);
          const pagos = Array.isArray(detalle.payments) ? detalle.payments : [];
          const rems = Array.isArray(detalle.reminders) ? detalle.reminders : [];
          const fila = (label, val) => (
            <div><span style={{ color: "#64748b", fontSize: 12 }}>{label}</span><br /><strong>{val ?? "—"}</strong></div>
          );
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: "10px 18px" }}>
                {fila("Fecha", `${fechaHora(detalle.startsAt)} → ${hora(detalle.endsAt)}`)}
                {fila("Duración", `${dur} min`)}
                {fila("Estado", <Badge map={ESTADOS} value={detalle.status} />)}
                {fila("Paciente", nomPac(detalle))}
                {fila("Contacto", `${detalle.patient?.person?.phone || "—"} · ${detalle.patient?.person?.email || "—"}`)}
                {fila("Documento", detalle.patient?.person ? `${detalle.patient.person.documentType} ${detalle.patient.person.document}` : "—")}
                {fila("Profesional", nomProf(detalle))}
                {fila("Servicio", nomServ(detalle))}
                {fila("Tipo de turno", detalle.isOverbook ? "Sobreturno" : "Normal")}
                {fila("Creado", fechaHora(detalle.createdAt))}
              </div>
 
              <div style={{ padding: "10px 12px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <strong>Pago</strong>
                  <span><Badge map={PAGO} value={detalle.paymentStatus} /></span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px,1fr))", gap: "8px 14px", marginTop: 8 }}>
                  {fila("Total", moneda(total))}
                  {fila("Pagado", moneda(pagado))}
                  {fila("Saldo", moneda(saldo))}
                  {detalle.depositAmount ? fila("Seña", moneda(detalle.depositAmount)) : null}
                  {detalle.discountAmount ? fila("Descuento", `${moneda(detalle.discountAmount)}${detalle.discountReason ? ` (${detalle.discountReason})` : ""}`) : null}
                </div>
                {pagos.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <span style={{ color: "#64748b", fontSize: 12 }}>Movimientos:</span>
                    <ul style={{ margin: "4px 0 0", paddingLeft: 18, color: "#475569", fontSize: 13 }}>
                      {pagos.map((p) => (
                        <li key={p.id}>
                          {p.isRefund ? "− " : "+ "}{moneda(p.amount)} · {fechaHora(p.paidAt || p.createdAt)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
 
              {detalle.rescheduleRequestedAt && (
                <div style={{ padding: "8px 12px", backgroundColor: "#fff7ed", borderRadius: "8px", border: "1px solid #fed7aa", color: "#9a3412", fontSize: 13 }}>
                  ⟳ Marcado para reprogramar el {fechaHora(detalle.rescheduleRequestedAt)}
                </div>
              )}
 
              {rems.length > 0 && (
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: "#64748b", fontSize: 12 }}>Recordatorios:</span>{" "}
                  {rems.map((r, i) => (
                    <span key={r.id || i} style={{ marginRight: 8 }}>
                      {r.status === "SENT" ? "✓ Enviado" : r.status === "FAILED" ? "✕ Falló" : "Pendiente"}
                      {r.sentAt ? ` (${fechaHora(r.sentAt)})` : ""}
                    </span>
                  ))}
                </div>
              )}

              {detalle.notes && (
                <div style={{ padding: "10px", backgroundColor: "#f8fafc", borderRadius: "6px", borderLeft: "4px solid #6b21a8" }}>
                  <strong>📝 Notas:</strong>
                  <p style={{ margin: "5px 0 0 0", color: "#475569" }}>{detalle.notes}</p>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
                {detalle.patientId && (
                  <Button style={{ backgroundColor: "#8b5cf6" }}
                          onClick={() => { const id = detalle.patientId; setDetalle(null); navigate(`/admin/pacientes/${id}`); }}>
                    Ver ficha del paciente
                  </Button>
                )}
                <Button style={{ backgroundColor: "#0ea5e9" }} onClick={() => setConfirmRem(detalle)}>
                  Enviar recordatorio
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>
 
      <Modal isOpen={!!confirmRem} onClose={() => !enviandoRem && setConfirmRem(null)} title="Enviar recordatorio">
        {confirmRem && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14 }}>
            <p style={{ margin: 0 }}>
              Se enviará el recordatorio del turno de{" "}
              <strong>{nomPac(confirmRem)}</strong> ({hora(confirmRem.startsAt)}):
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
 
      <Modal isOpen={!!estadoTurno} onClose={() => setEstadoTurno(null)} title="Cambiar estado del turno">
        {estadoTurno && (
          <div>
            <p style={{ marginTop: 0 }}>
              Estado actual: <Badge map={ESTADOS} value={estadoTurno.status} /> — {nomPac(estadoTurno)} · {hora(estadoTurno.startsAt)}
            </p>
            <p style={{ fontSize: "13px", color: "#64748b" }}>
              Elegí el nuevo estado. Se puede mover a cualquier estado (por si hubo un click equivocado y querés revertirlo):
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {Object.keys(ESTADOS).map((s) => {
                const actual = s === estadoTurno.status;
                return (
                  <Button key={s}
                          variant={s === "CANCELLED" ? "danger" : "primary"}
                          disabled={accionando || actual}
                          style={actual ? { opacity: 0.5 } : undefined}
                          title={actual ? "Estado actual" : `Marcar como ${ESTADOS[s].label}`}
                          onClick={() => cambiarEstado(estadoTurno, s)}>
                    {actual ? `● ${ESTADOS[s].label} (actual)` : ESTADOS[s].label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
 
      <Modal isOpen={!!cobroTurno} onClose={() => setCobroTurno(null)} title="Registrar cobro">
        {cobroTurno && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
              {nomPac(cobroTurno)} · {nomServ(cobroTurno)} — Total {moneda(cobroTurno.priceSnapshot)},
              pagado {moneda(pagadoDe(cobroTurno))}.
            </p>
            <div>
              <label style={S.label}>Monto</label>
              <input type="number" min={1} style={S.input} value={formCobro.amount}
                     onChange={(e) => setFormCobro((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 140px" }}>
                <label style={S.label}>Método</label>
                <select style={S.select} value={formCobro.method}
                        onChange={(e) => setFormCobro((f) => ({ ...f, method: e.target.value }))}>
                  {METODOS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div style={{ flex: "1 1 140px" }}>
                <label style={S.label}>Tipo</label>
                <select style={S.select} value={formCobro.type}
                        onChange={(e) => setFormCobro((f) => ({ ...f, type: e.target.value }))}>
                  {TIPOS_PAGO.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <Button type="button" style={S.btnCancel} onClick={() => setCobroTurno(null)}>Cancelar</Button>
              <Button onClick={registrarCobro} disabled={accionando}>
                {accionando ? "Registrando..." : "Registrar cobro"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Dashboard;
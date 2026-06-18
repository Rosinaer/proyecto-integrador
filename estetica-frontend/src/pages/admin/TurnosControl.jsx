import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Tr, Td } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { useBanner } from "../../components/ui/Banner";
import { PageHeader } from "../../components/ui/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import { fechaClinicaStr } from "../../config/clinica";
import { fmtHora, ymdDeInstante, LECTURA_TZ } from "../../utils/fecha";
import DetalleTurnoModal from "../../components/calendario/DetalleTurnoModal";
import client, { mensajeDeError } from "../../api/client";
import { ESTADOS, PAGO, METODOS, TIPOS_PAGO } from "../../constants/estados";
import { moneda } from "../../utils/moneda";
import {colors, status} from "../../theme/colors"; 

const hora = (iso) => (iso ? fmtHora(iso) : "—");

const fechaParedStr = ymdDeInstante;

const fechaCorta = (iso) => (iso ? fechaParedStr(iso).split("-").reverse().join("/") : "—");

const hoyStr = () => fechaClinicaStr();

const nomProf = (t) => t?.professionalService?.professional?.person?.name ?? "—";
const nomServ = (t) => t?.professionalService?.service?.name ?? "—";
const nomPac  = (t) => t?.patient?.person?.name ?? "—";

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
  sectionTitle: { margin: 0, color: colors.brand, fontSize: "1.2rem", fontWeight: "700" },
  btnSmall: { padding: "5px 10px", fontSize: "12px" },
  btnCancel: { backgroundColor: colors.border, color: colors.textSecondary },
  alertError: { backgroundColor: status.error.bg, border: "1px solid status.error.border", borderRadius: "8px",
                padding: "10px 16px", fontSize: "13px", color: status.error.fg, marginBottom: "14px" },
};

const Badge = ({ map, value }) => {
  const c = map[value] || { label: value, bg: colors.borderSoft, fg: colors.textSubtle };
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "12px",
                   fontSize: "11px", fontWeight: "700", backgroundColor: c.bg, color: c.fg }}>
      {c.label}
    </span>
  );
};

const TurnosControl = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const banner = useBanner();

  const esProfesional = user?.role === "PROFESSIONAL";
  const miProfId = user?.professionalId || "";

  // ── Filtros ──
  const [desde, setDesde] = useState(hoyStr());           // por defecto: hoy
  const [hasta, setHasta] = useState(hoyStr());           // por defecto: hoy
  const [profSel, setProfSel] = useState(esProfesional ? miProfId : "");
  const [estadoSel, setEstadoSel] = useState("");         // "" = todos
  const [pacienteQ, setPacienteQ] = useState("");

  const [profesionales, setProfesionales] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [accionando, setAccionando] = useState(false);
  const [error, setError] = useState("");

  // Modales
  const [detalle, setDetalle] = useState(null);
  const [estadoTurno, setEstadoTurno] = useState(null);
  const [cobroTurno, setCobroTurno] = useState(null);
  const [formCobro, setFormCobro] = useState({ amount: "", method: "CASH", type: "FULL_PAYMENT" });
  const [confirmRem, setConfirmRem] = useState(null);
  const [enviandoRem, setEnviandoRem] = useState(false);

  const mostrarError = (m) => banner.error(m);

  useEffect(() => {
    if (!token) return;
    if (esProfesional) {
      setProfesionales(miProfId ? [{ id: miProfId, person: { name: user?.person?.name || "Mi perfil" } }] : []);
      return;
    }
    client.get("/professionals")
      .then(({ data }) => setProfesionales(Array.isArray(data) ? data : []))
      .catch(() => setProfesionales([]));
  }, [token, esProfesional, miProfId]);

  const cargar = useCallback(async () => {
    if (!token || !desde || !hasta) return;
    setCargando(true);
    setError("");
    // Mandamos las fechas planas (YYYY-MM-DD); el backend las interpreta en
    // hora de la clínica. Así no se pierden los turnos de la noche.
    const params = { desde, hasta };
    if (profSel) params.professionalId = profSel;
    try {
      const { data } = await client.get("/appointments", { params });
      setTurnos(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(mensajeDeError(err) || "Error al cargar turnos");
      setTurnos([]);
    } finally {
      setCargando(false);
    }
  }, [token, desde, hasta, profSel]);

  useEffect(() => { cargar(); }, [cargar]);

  const refrescar = () => { cargar(); };

  // Filtrado en cliente por estado y por paciente
  const turnosFiltrados = useMemo(() => {
    const q = pacienteQ.trim().toLowerCase();
    return turnos.filter((t) => {
      if (estadoSel && t.status !== estadoSel) return false;
      if (q && !nomPac(t).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [turnos, estadoSel, pacienteQ]);

  const cambiarEstado = async (turno, status) => {
    setAccionando(true);
    const prev = turno.status;
    try {
      await client.patch(`/appointments/${turno.id}/status`, { status });
      setEstadoTurno(null);
      setTurnos((arr) => arr.map((t) => (t.id === turno.id ? { ...t, status } : t)));
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
      mostrarError(mensajeDeError(err) || "No se pudo cambiar el estado");
    } finally {
      setAccionando(false);
    }
  };

  const enviarRecordatorio = async (turno) => {
    if (!turno) return;
    setEnviandoRem(true);
    try {
      const { data } = await client.post(`/reminders/turno/${turno.id}`);

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
      mostrarError(mensajeDeError(err) || "No se pudo enviar el recordatorio");
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
      await client.post(`/payments/${cobroTurno.id}`, {
        amount: Number(formCobro.amount), method: formCobro.method, type: formCobro.type,
      });
      const metodoLbl = METODOS.find((m) => m.value === formCobro.method)?.label || formCobro.method;
      const tipoLbl = TIPOS_PAGO.find((m) => m.value === formCobro.type)?.label || formCobro.type;
      const totalPagado = pagadoDe(cobroTurno) + Number(formCobro.amount);
      const turnoCobrado = cobroTurno;
      setCobroTurno(null);
      refrescar();
      window.dispatchEvent(new Event("senda:appointments-changed"));
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
      mostrarError(mensajeDeError(err) || "No se pudo registrar el cobro");
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
        title="Turnos"
        subtitle="Control de turnos. Filtrá por fecha, profesional, estado o paciente."
      />

      {/* + Reservar turno — a la izquierda */}
      <div style={{ marginBottom: "20px" }}>
        <Button onClick={() => navigate("/admin/reserva-turno")} style={{ padding: "12px 22px", fontSize: "15px" }}>
          + Reservar turno
        </Button>
      </div>

      {error && <div style={S.alertError}>{error}</div>}

      {/* ── Control de turnos ── */}
      <div style={S.card}>
        <h3 style={{ ...S.sectionTitle, marginBottom: "16px" }}>Control de Turnos</h3>

        {/* Filtros, debajo del título */}
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "flex-end", marginBottom: "18px" }}>
          <div style={{ flex: "1 1 150px", minWidth: "150px" }}>
            <label style={S.label}>Desde</label>
            <input type="date" style={S.input} value={desde} max={hasta}
                   onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div style={{ flex: "1 1 150px", minWidth: "150px" }}>
            <label style={S.label}>Hasta</label>
            <input type="date" style={S.input} value={hasta} min={desde}
                   onChange={(e) => setHasta(e.target.value)} />
          </div>
          <div style={{ flex: "1 1 190px", minWidth: "180px" }}>
            <label style={S.label}>Profesional{esProfesional ? " (vos)" : ""}</label>
            <select style={S.select} value={profSel} onChange={(e) => setProfSel(e.target.value)} disabled={esProfesional}>
              {!esProfesional && <option value="">Todos</option>}
              {optsProf}
            </select>
          </div>
          <div style={{ flex: "1 1 160px", minWidth: "150px" }}>
            <label style={S.label}>Estado</label>
            <select style={S.select} value={estadoSel} onChange={(e) => setEstadoSel(e.target.value)}>
              <option value="">Todos</option>
              {Object.keys(ESTADOS).map((s) => (
                <option key={s} value={s}>{ESTADOS[s].label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: "2 1 200px", minWidth: "180px" }}>
            <label style={S.label}>Paciente</label>
            <input type="text" style={S.input} value={pacienteQ} placeholder="Buscar por nombre…"
                   onChange={(e) => setPacienteQ(e.target.value)} />
          </div>
        </div>

        {cargando ? (
          <p style={{ color: colors.textMuted, textAlign: "center", padding: "32px 0" }}>Cargando turnos...</p>
        ) : turnosFiltrados.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: colors.textMuted }}>
            <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📭</div>
            No hay turnos para esos filtros.
          </div>
        ) : (
          <Table headers={["Fecha", "Inicio", "Fin", "Paciente", "Profesional", "Servicio",
                           "Estado", "Pago", "Recordatorio", "Acciones"]}>
            {turnosFiltrados.map((t) => {
              const rem = Array.isArray(t.reminders) ? t.reminders : null;
              const remTxt = rem == null ? "—"
                : rem.some((r) => r.status === "SENT") ? "✓ Enviado"
                : rem.length ? "Falló" : "Pendiente";
              return (
                <Tr key={t.id}>
                  <Td>{fechaCorta(t.startsAt)}</Td>
                  <Td><strong style={{ color: colors.brand }}>{hora(t.startsAt)}</strong></Td>
                  <Td>{hora(t.endsAt)}</Td>
                  <Td>
                    {t.patientId ? (
                      <span
                        style={{ color: colors.brand, cursor: "pointer" }}
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
                  <Td><span style={{ fontSize: "12px", color: colors.textSubtle }}>{remTxt}</span></Td>
                  <Td>
                    <div style={{ display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap" }}>
                      <Button style={{ ...S.btnSmall, backgroundColor: colors.brand }}
                              onClick={() => setDetalle(t)}>Detalle</Button>
                      <Button style={{ ...S.btnSmall, backgroundColor: colors.textSubtle }}
                              onClick={() => setEstadoTurno(t)}
                              title="Cambiar estado (se puede revertir a cualquier estado)">
                        Estado
                      </Button>
                      <Button style={{ ...S.btnSmall, backgroundColor: status.success.strong, color: "#fff" }}
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

      {/* Detalle unificado (mismo cuerpo y botones que el del calendario) */}
      <Modal isOpen={!!detalle} onClose={() => setDetalle(null)} title="Detalle del turno">
        <DetalleTurnoModal
          turno={detalle}
          onFichaPaciente={(t) => { const id = t.patientId; setDetalle(null); navigate(`/admin/pacientes/${id}`); }}
          onRecordatorio={(t) => { setDetalle(null); setConfirmRem(t); }}
          onEstado={(t) => { setDetalle(null); setEstadoTurno(t); }}
          onCobrar={(t) => { setDetalle(null); abrirCobro(t); }}
        />
      </Modal>

      <Modal isOpen={!!confirmRem} onClose={() => !enviandoRem && setConfirmRem(null)} title="Enviar recordatorio">
        {confirmRem && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14 }}>
            <p style={{ margin: 0 }}>
              Se enviará el recordatorio del turno de{" "}
              <strong>{nomPac(confirmRem)}</strong> ({hora(confirmRem.startsAt)}):
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, color: colors.textSecondary }}>
              <li>Un <strong>email al paciente</strong> ({confirmRem.patient?.person?.email || "sin email"}).</li>
              <li>Un <strong>email para vos</strong> con el link de WhatsApp ya armado para mandárselo al paciente.</li>
            </ul>
            <p style={{ margin: 0, color: colors.textSubtle, fontSize: 12 }}>
              El WhatsApp no se envía solo: te llega el link listo para tocar.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button type="button" style={{ backgroundColor: colors.border, color: colors.textSecondary }} disabled={enviandoRem} onClick={() => setConfirmRem(null)}>
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
            <p style={{ fontSize: "13px", color: colors.textSubtle }}>
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
            <p style={{ margin: 0, fontSize: "13px", color: colors.textSubtle }}>
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

export default TurnosControl;
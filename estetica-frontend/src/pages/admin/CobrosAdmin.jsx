import { useState, useEffect, useCallback, useMemo } from "react";
import { Table, Tr, Td } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Badge } from "../../components/ui/Badge";
import { PageHeader } from "../../components/ui/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import { useBanner } from "../../components/ui/Banner";
import { hoyLectura, ymdDeInstante, fmtPrecio } from "../../utils/fecha.js";
import client, { mensajeDeError } from "../../api/client";
import { PAGO, METODOS, TIPOS_PAGO } from "../../constants/estados";
import {colors, status} from "../../theme/colors"; 

// ─────────────────────────────────────────────────────────────
// Constantes y helpers (fuera del componente: no se recrean en cada render)
// ─────────────────────────────────────────────────────────────

// paidAt viene como instante UTC; lo mostramos "dd/mm/aaaa" en zona de la clínica.
// Mismo patrón que ya usás en TurnosControl: ymdDeInstante + dar vuelta el orden.
const fechaCorta = (iso) => (iso ? ymdDeInstante(iso).split("-").reverse().join("/") : "—");

// Convierte un value de dominio ("CASH") en su label legible ("Efectivo").
const labelDe = (lista, value) => lista.find((x) => x.value === value)?.label || value || "—";

// Primer día del mes en la zona de la clínica (regla de fechas: nunca toISOString del navegador).
const primerDiaMes = () => `${hoyLectura().slice(0, 7)}-01`;

const inp = { padding: "10px", borderRadius: 6, border: "1px solid colors.line", width: "100%" };

// ═════════════════════════════════════════════════════════════
export default function CobrosAdmin() {
  const { token } = useAuth();
  const banner = useBanner();

  // --- Filtros (lo que el usuario elige) ---
  const [desde, setDesde] = useState(primerDiaMes());
  const [hasta, setHasta] = useState(hoyLectura());
  const [profSel, setProfSel] = useState("");
  const [metodoSel, setMetodoSel] = useState("");
  const [tipoSel, setTipoSel] = useState("");
  const [soloDevol, setSoloDevol] = useState(false);
  const [pacienteQ, setPacienteQ] = useState(""); // se filtra en el cliente

  // --- Datos que vienen del backend ---
  const [pagos, setPagos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [profesionales, setProfesionales] = useState([]);

  // --- Estado de la UI ---
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  // --- Modal de detalle ---
  const [detalle, setDetalle] = useState(null); // { appointmentId, resumen, pagos } | null

  // --- Form de "registrar pago" dentro del modal ---
  const [formPago, setFormPago] = useState({ amount: "", method: "CASH", type: "FINAL_PAYMENT" });
  const [guardandoPago, setGuardandoPago] = useState(false);

  // ── 1) Traer profesionales para el filtro (una sola vez) ──
  useEffect(() => {
    if (!token) return;
    client.get("/professionals")
      .then(({ data }) => setProfesionales(Array.isArray(data) ? data : []))
      .catch(() => setProfesionales([]));
  }, [token]);

  // ── 2) Traer los pagos según los filtros ──
  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError("");
    try {
      // El backend convierte estas etiquetas YYYY-MM-DD a límites UTC. No las tocamos acá.
      const params = {};
      if (desde) params.desde = desde;
      if (hasta) params.hasta = hasta;
      if (profSel) params.professionalId = profSel;
      if (metodoSel) params.method = metodoSel;
      if (tipoSel) params.type = tipoSel;
      if (soloDevol) params.isRefund = "true";

      const { data } = await client.get("/payments/historial", { params });

      setPagos(Array.isArray(data.pagos) ? data.pagos : []);
      setResumen(data.resumen || null);
    } catch (err) {
      setError(mensajeDeError(err) || "No se pudieron cargar los cobros");
      setPagos([]);
      setResumen(null);
    } finally {
      setCargando(false);
    }
  }, [token, desde, hasta, profSel, metodoSel, tipoSel, soloDevol]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // ── 3) Filtro de paciente en el cliente (por nombre) ──
  const pagosFiltrados = useMemo(() => {
    const txt = pacienteQ.trim().toLowerCase();
    if (!txt) return pagos;
    return pagos.filter((p) =>
      (p.appointment?.patient?.person?.name || "").toLowerCase().includes(txt)
    );
  }, [pagos, pacienteQ]);

  // ── 4) Abrir el modal de detalle de un turno ──
  const abrirDetalle = async (appointmentId) => {
    try {
      const { data } = await client.get(`/payments/${appointmentId}`);
      setDetalle({ appointmentId, ...data });
      // Precargamos el monto del form con el saldo pendiente para ahorrar tipeo.
      const saldo = data.resumen?.saldoPendiente || 0;
      setFormPago({ amount: saldo > 0 ? saldo : "", method: "CASH", type: "FINAL_PAYMENT" });
    } catch (err) {
      banner.error(mensajeDeError(err) || "No se pudo cargar el detalle");
    }
  };

  const cerrarDetalle = () => setDetalle(null);

  // ── 5) Registrar un pago desde el modal ──
  const registrarPago = async () => {
    if (!detalle) return;
    if (!formPago.amount || Number(formPago.amount) <= 0) {
      banner.error("Ingresá un monto válido.");
      return;
    }
    setGuardandoPago(true);
    try {
      await client.post(`/payments/${detalle.appointmentId}`, {
        amount: Number(formPago.amount),
        method: formPago.method,
        type: formPago.type,
      });

      banner.success("Pago registrado", {
        details: [
          ["Monto", fmtPrecio(formPago.amount)],
          ["Método", labelDe(METODOS, formPago.method)],
          ["Tipo", labelDe(TIPOS_PAGO, formPago.type)],
        ],
      });
      await abrirDetalle(detalle.appointmentId); // refresca el modal con el saldo nuevo
      await cargar(); // refresca la tabla y los KPIs
    } catch (err) {
      banner.error(mensajeDeError(err) || "No se pudo registrar el pago");
    } finally {
      setGuardandoPago(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  return (
    <div>
      <PageHeader
        title="Cobros"
        subtitle="Registro de cobros y devoluciones. Filtrá por fecha, profesional, método o paciente."
      />

      {error && (
        <div
          style={{
            background: status.error.bg,
            border: "1px solid status.error.border",
            color: status.error.fg,
            borderRadius: 8,
            padding: "10px 16px",
            fontSize: 13,
            marginBottom: 14,
          }}
        >
          {error}
        </div>
      )}

      {/* KPIs (vienen del resumen que arma el backend) */}
      {resumen && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
          <Kpi label="Total cobrado" value={fmtPrecio(resumen.totalCobrado)} />
          <Kpi label="Reembolsado" value={fmtPrecio(resumen.totalReembolsado)} />
          <Kpi label="Neto" value={fmtPrecio(resumen.neto)} />
          <Kpi label="Registros" value={resumen.cantidadRegistros} />
        </div>
      )}

      {/* Filtros */}
      <div
        style={{
          background: "#fff",
          border: "1px solid colors.border",
          borderRadius: 10,
          padding: 16,
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
          <Campo label="Desde">
            <input type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} style={inp} />
          </Campo>
          <Campo label="Hasta">
            <input type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} style={inp} />
          </Campo>
          <Campo label="Profesional">
            <select value={profSel} onChange={(e) => setProfSel(e.target.value)} style={inp}>
              <option value="">Todos</option>
              {profesionales.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.person?.name || "—"}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Método">
            <select value={metodoSel} onChange={(e) => setMetodoSel(e.target.value)} style={inp}>
              <option value="">Todos</option>
              {METODOS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Tipo">
            <select value={tipoSel} onChange={(e) => setTipoSel(e.target.value)} style={inp}>
              <option value="">Todos</option>
              {TIPOS_PAGO.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Paciente">
            <input
              type="text"
              placeholder="Buscar por nombre…"
              value={pacienteQ}
              onChange={(e) => setPacienteQ(e.target.value)}
              style={inp}
            />
          </Campo>
          <label
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", paddingBottom: 8 }}
          >
            <input type="checkbox" checked={soloDevol} onChange={(e) => setSoloDevol(e.target.checked)} />
            Solo devoluciones
          </label>
        </div>
      </div>

      {/* Tabla */}
      {cargando ? (
        <p style={{ textAlign: "center", color: colors.textMuted, padding: 32 }}>Cargando cobros…</p>
      ) : pagosFiltrados.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: colors.textMuted }}>
          📭 No hay cobros para esos filtros.
        </div>
      ) : (
        <Table headers={["Fecha", "Paciente", "Profesional", "Servicio", "Tipo", "Método", "Monto", "Estado", ""]}>
          {pagosFiltrados.map((p) => {
            const ap = p.appointment || {};
            return (
              <Tr key={p.id}>
                <Td>{fechaCorta(p.paidAt)}</Td>
                <Td>{ap.patient?.person?.name || "—"}</Td>
                <Td>{ap.professionalService?.professional?.person?.name || "—"}</Td>
                <Td>{ap.professionalService?.service?.name || "—"}</Td>
                <Td>{p.isRefund ? "Devolución" : labelDe(TIPOS_PAGO, p.type)}</Td>
                <Td>{labelDe(METODOS, p.method)}</Td>
                <Td style={{ color: p.isRefund ? "#dc2626" : "inherit", fontWeight: p.isRefund ? 700 : 400 }}>
                  {p.isRefund ? "-" : ""}
                  {fmtPrecio(p.amount)}
                </Td>
                <Td>
                  <Badge map={PAGO} value={ap.paymentStatus} />
                </Td>
                <Td>
                  <Button
                    style={{ padding: "6px 12px", fontSize: 12, backgroundColor: colors.brand }}
                    onClick={() => abrirDetalle(ap.id)}
                  >
                    Ver detalle
                  </Button>
                </Td>
              </Tr>
            );
          })}
        </Table>
      )}

      {/* Modal de detalle de un turno */}
      <Modal isOpen={!!detalle} onClose={cerrarDetalle} title="Detalle del cobro" maxWidth={560}>
        {detalle && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 14, marginBottom: 16 }}>
              <span style={{ color: colors.textSubtle }}>Precio final:</span>
              <strong>{fmtPrecio(detalle.resumen?.precioFinal)}</strong>
              <span style={{ color: colors.textSubtle }}>Pagado:</span>
              <strong>{fmtPrecio(detalle.resumen?.totalPagado)}</strong>
              <span style={{ color: colors.textSubtle }}>Saldo pendiente:</span>
              <strong style={{ color: detalle.resumen?.saldoPendiente > 0 ? "#dc2626" : status.success.fg }}>
                {fmtPrecio(detalle.resumen?.saldoPendiente)}
              </strong>
              <span style={{ color: colors.textSubtle }}>Estado:</span>
              <span>
                <Badge map={PAGO} value={detalle.resumen?.estadoPago} />
              </span>
            </div>

            <h4 style={{ margin: "8px 0", color: colors.textSecondary }}>Pagos de este turno</h4>
            {(detalle.pagos || []).length === 0 ? (
              <p style={{ color: colors.textMuted }}>Sin pagos registrados.</p>
            ) : (
              <Table headers={["Fecha", "Tipo", "Método", "Monto"]}>
                {detalle.pagos.map((p) => (
                  <Tr key={p.id}>
                    <Td>{fechaCorta(p.paidAt)}</Td>
                    <Td>{p.isRefund ? "Devolución" : labelDe(TIPOS_PAGO, p.type)}</Td>
                    <Td>{labelDe(METODOS, p.method)}</Td>
                    <Td style={{ color: p.isRefund ? "#dc2626" : "inherit" }}>{fmtPrecio(p.amount)}</Td>
                  </Tr>
                ))}
              </Table>
            )}

            {/* El form de registrar pago solo aparece si todavía hay saldo. */}
            {detalle.resumen?.saldoPendiente > 0 && (
              <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid colors.border" }}>
                <h4 style={{ margin: "0 0 10px", color: colors.textSecondary }}>Registrar pago</h4>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <Campo label="Monto">
                    <input
                      type="number"
                      min="0"
                      value={formPago.amount}
                      onChange={(e) => setFormPago({ ...formPago, amount: e.target.value })}
                      style={inp}
                    />
                  </Campo>
                  <Campo label="Método">
                    <select
                      value={formPago.method}
                      onChange={(e) => setFormPago({ ...formPago, method: e.target.value })}
                      style={inp}
                    >
                      {METODOS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </Campo>
                  <Campo label="Tipo">
                    <select
                      value={formPago.type}
                      onChange={(e) => setFormPago({ ...formPago, type: e.target.value })}
                      style={inp}
                    >
                      {TIPOS_PAGO.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </Campo>
                  <Button onClick={registrarPago} disabled={guardandoPago} style={{ paddingBottom: 8 }}>
                    {guardandoPago ? "Guardando…" : "Registrar"}
                  </Button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
              <Button style={{ backgroundColor: colors.border, color: colors.textSecondary }} onClick={cerrarDetalle}>
                Cerrar
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-componentes de presentación (se "consumen" varias veces arriba)
// ─────────────────────────────────────────────────────────────
function Kpi({ label, value }) {
  return (
    <div
      style={{
        flex: "1 1 150px",
        minWidth: 150,
        background: "#fff",
        border: "1px solid colors.border",
        borderRadius: 10,
        padding: "12px 16px",
      }}
    >
      <div style={{ fontSize: 12, color: colors.textSubtle }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: colors.brand }}>{value}</div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div style={{ flex: "1 1 160px", minWidth: 150 }}>
      <label style={{ display: "block", fontSize: 12, color: colors.textSubtle, marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}
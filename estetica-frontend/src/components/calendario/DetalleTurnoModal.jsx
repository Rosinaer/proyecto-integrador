import { Button } from "../ui/Button";
import { fmtHora, LECTURA_TZ } from "../../utils/fecha";
import { abrirWhatsAppTurno, numeroWa } from "../../utils/whatsapp";
import { ESTADOS, PAGO, SYNC } from "../../constants/estados";
import { moneda } from "../../utils/moneda";
import {colors, status} from "../../theme/colors"; 

const Badge = ({ map, value }) => {
  const c = map[value] || { label: value, bg: colors.borderSoft, fg: colors.textSubtle };
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 12,
      fontSize: 11, fontWeight: 700, backgroundColor: c.bg, color: c.fg }}>
      {c.label}
    </span>
  );
};

const hora = (iso) => (iso ? fmtHora(iso) : "—");

const fechaHora = (iso) =>
  iso ? new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: LECTURA_TZ,
  }) : "—";

const nomProf = (t) => t?.professionalService?.professional?.person?.name ?? "—";
const nomServ = (t) => t?.professionalService?.service?.name ?? "—";
const nomPac  = (t) => t?.patient?.person?.name ?? "—";

const pagadoDe = (t) =>
  (Array.isArray(t?.payments) ? t.payments : []).reduce(
    (acc, p) => acc + (p.isRefund ? -1 : 1) * Number(p.amount), 0);

const fila = (label, val) => (
  <div>
    <span style={{ color: colors.textSubtle, fontSize: 12 }}>{label}</span><br />
    <strong>{val ?? "—"}</strong>
  </div>
);

const DetalleTurnoModal = ({
  turno,
  onFichaPaciente,
  onRecordatorio,
  onEstado,
  onCobrar,
}) => {
  if (!turno) return null;

  const pagado = pagadoDe(turno);
  const total  = Number(turno.priceSnapshot || 0);
  const saldo  = Math.max(0, total - pagado);
  const dur    = turno.endsAt
    ? Math.round((new Date(turno.endsAt) - new Date(turno.startsAt)) / 60000)
    : turno.professionalService?.service?.durationMinutes ?? null;
  const pagos  = Array.isArray(turno.payments) ? turno.payments : [];
  const rems   = Array.isArray(turno.reminders) ? turno.reminders : [];

  const tieneTel  = !!numeroWa(turno.patient?.person?.phone);
  const cobroOff  = turno.paymentStatus === "COMPLETED" || turno.status === "CANCELLED";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: "10px 18px" }}>
        {fila("Fecha", `${fechaHora(turno.startsAt)} → ${hora(turno.endsAt)}`)}
        {fila("Duración", dur != null ? `${dur} min` : "—")}
        {fila("Estado", <Badge map={ESTADOS} value={turno.status} />)}
        {fila("Paciente", nomPac(turno))}
        {fila("Contacto", `${turno.patient?.person?.phone || "—"} · ${turno.patient?.person?.email || "—"}`)}
        {fila("Documento", turno.patient?.person ? `${turno.patient.person.documentType ?? ""} ${turno.patient.person.document ?? ""}`.trim() || "—" : "—")}
        {fila("Profesional", nomProf(turno))}
        {fila("Servicio", nomServ(turno))}
        {fila("Tipo de turno", turno.isOverbook ? "Sobreturno" : "Normal")}
        {fila("Google Calendar", <Badge map={SYNC} value={turno.googleSyncStatus} />)}
        {turno.createdAt ? fila("Creado", fechaHora(turno.createdAt)) : null}
      </div>

      {/* Bloque de pago */}
      <div style={{ padding: "10px 12px", backgroundColor: colors.bg, borderRadius: 8, border: "1px solid colors.border" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <strong>Pago</strong>
          <span><Badge map={PAGO} value={turno.paymentStatus} /></span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px,1fr))", gap: "8px 14px", marginTop: 8 }}>
          {fila("Total", moneda(total))}
          {fila("Pagado", moneda(pagado))}
          {fila("Saldo", moneda(saldo))}
          {turno.depositAmount ? fila("Seña", moneda(turno.depositAmount)) : null}
          {turno.discountAmount ? fila("Descuento", `${moneda(turno.discountAmount)}${turno.discountReason ? ` (${turno.discountReason})` : ""}`) : null}
        </div>
        {pagos.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <span style={{ color: colors.textSubtle, fontSize: 12 }}>Movimientos:</span>
            <ul style={{ margin: "4px 0 0", paddingLeft: 18, color: colors.textSecondary, fontSize: 13 }}>
              {pagos.map((p) => (
                <li key={p.id}>
                  {p.isRefund ? "− " : "+ "}{moneda(p.amount)} · {fechaHora(p.paidAt || p.createdAt)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {turno.rescheduleRequestedAt && (
        <div style={{ padding: "8px 12px", backgroundColor: "#fff7ed", borderRadius: 8, border: "1px solid #fed7aa", color: "#9a3412", fontSize: 13 }}>
          ⟳ Marcado para reprogramar el {fechaHora(turno.rescheduleRequestedAt)}
        </div>
      )}

      {rems.length > 0 && (
        <div style={{ fontSize: 13 }}>
          <span style={{ color: colors.textSubtle, fontSize: 12 }}>Recordatorios:</span>{" "}
          {rems.map((r, i) => (
            <span key={r.id || i} style={{ marginRight: 8 }}>
              {r.status === "SENT" ? "✓ Enviado" : r.status === "FAILED" ? "✕ Falló" : "Pendiente"}
              {r.sentAt ? ` (${fechaHora(r.sentAt)})` : ""}
            </span>
          ))}
        </div>
      )}

      {turno.notes && (
        <div style={{ padding: 10, backgroundColor: colors.bg, borderRadius: 6, borderLeft: "4px solid colors.brand" }}>
          <strong>📝 Notas:</strong>
          <p style={{ margin: "5px 0 0 0", color: colors.textSecondary }}>{turno.notes}</p>
        </div>
      )}

      {/* Botonera unificada */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
        {turno.patientId && onFichaPaciente && (
          <Button style={{ backgroundColor: "#8b5cf6" }} onClick={() => onFichaPaciente(turno)}>
            Ficha del paciente
          </Button>
        )}

        <Button
          style={{ backgroundColor: tieneTel ? "#25D366" : colors.line, color: "#fff" }}
          disabled={!tieneTel}
          title={tieneTel ? "Abrir WhatsApp con el recordatorio escrito" : "El paciente no tiene teléfono cargado"}
          onClick={() => abrirWhatsAppTurno(turno)}
        >
          💬 WhatsApp
        </Button>

        {onRecordatorio && (
          <Button style={{ backgroundColor: "#0ea5e9" }} onClick={() => onRecordatorio(turno)}>
            Enviar recordatorio
          </Button>
        )}

        {onEstado && (
          <Button style={{ backgroundColor: colors.textSubtle }} onClick={() => onEstado(turno)}>
            Estado
          </Button>
        )}

        {onCobrar && (
          <Button
            style={{ backgroundColor: cobroOff ? colors.line : status.success.strong, color: "#fff" }}
            disabled={cobroOff}
            onClick={() => onCobrar(turno)}
          >
            Cobrar
          </Button>
        )}
      </div>
    </div>
  );
};

export default DetalleTurnoModal;
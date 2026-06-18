import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { useAuth } from "../../hooks/useAuth";
import { useBanner } from "../../components/ui/Banner";
import { PageHeader } from "../../components/ui/PageHeader";
import { LECTURA_TZ, ymdDeInstante } from "../../utils/fecha";
import client, { mensajeDeError } from "../../api/client";
import { moneda } from "../../utils/moneda";
import {colors, status} from "../../theme/colors"; 

const PURPLE = colors.brand;
const PURPLE_BG = "#f3e8ff";
const BORDER = colors.line;
const MUTED = colors.textMuted;

const pagadoDe = (t) => (Array.isArray(t?.payments) ? t.payments : []).reduce((a, p) => a + (p.isRefund ? -1 : 1) * Number(p.amount), 0);
const PAGO_LBL = { PENDING: "Pendiente", PARTIAL: "Parcial", COMPLETED: "Pagado", REFUNDED: "Reembolsado" };

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const fmtHora = (iso) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: LECTURA_TZ });
const fmtFecha = (iso) => new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: LECTURA_TZ });
const fmtFechaLarga = (iso) => new Date(iso).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: LECTURA_TZ });


function MiniCalendario({ year, month, dias, diaSel, onPick, onNav }) {
  const diasSet = useMemo(() => new Set(dias), [dias]);
  const offset = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const total = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const fmt = (d) => `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const celdas = [];
  for (let i = 0; i < offset; i++) celdas.push(null);
  for (let d = 1; d <= total; d++) celdas.push(d);
  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: 10, background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <button type="button" onClick={() => onNav(-1)} style={navBtn}>‹</button>
        <strong style={{ fontSize: 13, color: PURPLE }}>{MESES[month - 1]} {year}</strong>
        <button type="button" onClick={() => onNav(1)} style={navBtn}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, fontSize: 11, textAlign: "center", color: MUTED }}>
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginTop: 4, fontSize: 12, textAlign: "center" }}>
        {celdas.map((d, i) => {
          if (d === null) return <span key={i} />;
          const fecha = fmt(d);
          const disp = diasSet.has(fecha);
          const sel = diaSel === fecha;
          return (
            <button key={i} type="button" disabled={!disp} onClick={() => onPick(fecha)}
              style={{ padding: "5px 0", borderRadius: 6, border: "none", fontSize: 12, cursor: disp ? "pointer" : "default",
                background: sel ? PURPLE : disp ? PURPLE_BG : "transparent", color: sel ? "#fff" : disp ? PURPLE : colors.line, fontWeight: disp ? "bold" : "normal" }}>
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
 
function ReprogramarModal({ turno, onClose, onDone }) {
  const profId = turno.professionalService?.professional?.id;
  const servId = turno.professionalService?.service?.id;
  const duracion = turno.professionalService?.durationMinutes;

  const [iniY, iniM] = ymdDeInstante(turno.startsAt).split("-").map(Number);
  const [verMes, setVerMes] = useState({ year: iniY, month: iniM });
  const [dias, setDias] = useState([]);
  const [diaSel, setDiaSel] = useState("");
  const [slots, setSlots] = useState([]);
  const [slotSel, setSlotSel] = useState(null);
  const [availabilityId, setAvailabilityId] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
 
  useEffect(() => {
    setDiaSel(""); setSlots([]); setSlotSel(null); setAvailabilityId("");
    if (!profId || !servId) return;
    (async () => {
      try {
        const { data } = await client.get("/appointments/available-days", {
          params: { professionalId: profId, serviceIds: servId, year: verMes.year, month: verMes.month },
        });
        setDias(data.days || []);
      } catch {
        setDias([]);
      }
    })();
  }, [verMes.year, verMes.month]);
 
  useEffect(() => {
    setSlots([]); setSlotSel(null);
    if (!diaSel) return;
    (async () => {
      try {
        const { data } = await client.get("/appointments/available-slots", {
          params: { professionalId: profId, serviceIds: servId, date: diaSel },
        });
        setSlots(data.slots || []);
        setAvailabilityId(data.availabilityId || "");
      } catch {
        setSlots([]);
        setAvailabilityId("");
      }
    })();
  }, [diaSel]);

  const confirmar = async () => {
    setError("");
    if (!slotSel) return;
    setGuardando(true);
    try {
      await client.patch(`/appointments/${turno.id}/reschedule`, {
        availabilityId: availabilityId || slotSel.availabilityId,
        startsAt: slotSel.startsAt,
      });
      onDone({
        startsAt: slotSel.startsAt,
        paciente: turno.patient?.person?.name || "—",
        servicio: turno.professionalService?.service?.name || "—",
        profesional: turno.professionalService?.professional?.person?.name || "—",
        antes: `${fmtFecha(turno.startsAt)} ${fmtHora(turno.startsAt)}`,
        duracion,
        total: turno.priceSnapshot,
        pagado: pagadoDe(turno),
      });
    } catch (e) {
      setError(mensajeDeError(e) || "No se pudo reprogramar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Reprogramar turno">
      <div style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 12 }}>
        <strong>{turno.patient?.person?.name}</strong> · {turno.professionalService?.service?.name} con {turno.professionalService?.professional?.person?.name}
        <br />
        <span style={{ color: MUTED }}>Venía de: {fmtFecha(turno.startsAt)} {fmtHora(turno.startsAt)} · {duracion} min</span>
      </div>

      <label style={lbl}>Nuevo día</label>
      <MiniCalendario
        year={verMes.year} month={verMes.month} dias={dias} diaSel={diaSel} onPick={setDiaSel}
        onNav={(delta) => setVerMes((v) => {
          const m = v.month + delta;
          if (m < 1) return { year: v.year - 1, month: 12 };
          if (m > 12) return { year: v.year + 1, month: 1 };
          return { year: v.year, month: m };
        })}
      />

      <label style={{ ...lbl, marginTop: 14 }}>Nuevo horario</label>
      {!diaSel && <div style={{ fontSize: 12, color: MUTED }}>Elegí un día.</div>}
      {diaSel && slots.length === 0 && <div style={{ fontSize: 12, color: MUTED }}>Sin horarios libres ese día.</div>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {slots.map((s, i) => {
          const on = slotSel?.startsAt === s.startsAt;
          return (
            <button key={i} type="button" onClick={() => setSlotSel(s)}
              style={{ fontSize: 13, padding: "6px 12px", borderRadius: 8, cursor: "pointer", border: on ? `2px solid ${PURPLE}` : `1px solid ${BORDER}`, background: on ? PURPLE_BG : "#fff", color: on ? PURPLE : colors.text }}>
              {fmtHora(s.startsAt)}
            </button>
          );
        })}
      </div>

      {error && <div style={{ color: "#b91c1c", fontSize: 13, marginTop: 10 }}>{error}</div>}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
        <Button type="button" style={{ backgroundColor: colors.border, color: colors.textSecondary }} onClick={onClose}>Cancelar</Button>
        <Button onClick={confirmar} disabled={!slotSel || guardando}>
          {guardando ? "Reprogramando…" : "Confirmar nuevo horario"}
        </Button>
      </div>
    </Modal>
  );
}
 
export default function ReprogramarAdmin() {
  const { token } = useAuth();
  const banner = useBanner();

  const [turnos, setTurnos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [reprogramar, setReprogramar] = useState(null);
  const [cancelar, setCancelar] = useState(null);
  const [accionando, setAccionando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    try {
      const { data } = await client.get("/appointments", { params: { needsReschedule: true } });
      setTurnos(Array.isArray(data) ? data : []);
    } catch {
      setTurnos([]);
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => { cargar(); }, [cargar]);

  const ejecutarCancelar = async () => {
    if (!cancelar) return;
    setAccionando(true);
    setError("");
    const t = cancelar;
    const pagado = pagadoDe(t);
    try {
      await client.patch(`/appointments/${t.id}/status`, { status: "CANCELLED" });
      setCancelar(null);
      await cargar();
      window.dispatchEvent(new Event("senda:appointments-changed"));
      banner.warning("Turno cancelado", {
        details: [
          ["Paciente", t.patient?.person?.name || "—"],
          ["Servicio", t.professionalService?.service?.name || "—"],
          ["Profesional", t.professionalService?.professional?.person?.name || "—"],
          ["Era", `${fmtFecha(t.startsAt)} ${fmtHora(t.startsAt)}`],
          ["Total", moneda(t.priceSnapshot)],
          ["Pagado", moneda(pagado)],
        ],
        warnings: pagado > 0 ? [`Este turno tenía ${moneda(pagado)} pagado. El reembolso se gestiona desde la pestaña Turnos.`] : [],
      });
    } catch (e) {
      setError(mensajeDeError(e) || "No se pudo cancelar");
      setCancelar(null);
      banner.error(mensajeDeError(e) || "No se pudo cancelar");
    } finally {
      setAccionando(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Turnos a reprogramar"
        subtitle="Turnos que quedaron sin agenda (su slot fue archivado). Reprogramalos a un nuevo horario o cancelalos."
      />

      {error && <div style={{ background: status.error.bg, border: "1px solid status.error.border", color: status.error.fg, borderRadius: 8, padding: "10px 16px", fontSize: 13, marginBottom: 14 }}>{error}</div>}

      {cargando ? (
        <p style={{ color: MUTED, textAlign: "center", padding: "40px 0" }}>Cargando…</p>
      ) : turnos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", background: "#fff", border: "1px solid colors.border", borderRadius: 10, color: MUTED }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>✅</div>
          No hay turnos pendientes de reprogramar.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {turnos.map((t) => (
            <div key={t.id} style={{ background: "#fff", border: "1px solid colors.border", borderLeft: "4px solid #f59e0b", borderRadius: 10, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontSize: 14 }}>
                <strong style={{ color: colors.text }}>{t.patient?.person?.name || "—"}</strong>
                <span style={{ color: MUTED }}> · {t.professionalService?.service?.name} con {t.professionalService?.professional?.person?.name}</span>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 4, textTransform: "capitalize" }}>
                  Era: {fmtFechaLarga(t.startsAt)} a las {fmtHora(t.startsAt)}
                  {t.rescheduleRequestedAt && <span> · pendiente desde {fmtFecha(t.rescheduleRequestedAt)}</span>}
                </div>
                <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <span>Total: <strong>{moneda(t.priceSnapshot)}</strong></span>
                  <span>Pagado: <strong style={{ color: pagadoDe(t) > 0 ? status.success.fg : MUTED }}>{moneda(pagadoDe(t))}</strong></span>
                  <span>Pago: <strong>{PAGO_LBL[t.paymentStatus] || t.paymentStatus}</strong></span>
                  {t.isOverbook && <span style={{ color: "#9a3412" }}>Sobreturno</span>}
                </div>
                {t.notes && <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>📝 {t.notes}</div>}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button onClick={() => setReprogramar(t)} style={{ fontSize: 13, padding: "7px 14px" }}>Reprogramar</Button>
                <Button variant="danger" onClick={() => setCancelar(t)} style={{ fontSize: 13, padding: "7px 14px" }}>Cancelar</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {reprogramar && (
        <ReprogramarModal
          turno={reprogramar}
          onClose={() => setReprogramar(null)}
          onDone={(info) => {
            setReprogramar(null);
            cargar();
            window.dispatchEvent(new Event("senda:appointments-changed"));
            banner.success("Turno reprogramado", {
              details: [
                ["Paciente", info.paciente],
                ["Servicio", info.servicio],
                ["Profesional", info.profesional],
                ["Antes", info.antes],
                ["Ahora", `${fmtFecha(info.startsAt)} ${fmtHora(info.startsAt)}`],
                ["Duración", `${info.duracion} min`],
                ["Total", moneda(info.total)],
                ["Pagado", moneda(info.pagado)],
              ],
            });
          }}
        />
      )}

      <Modal isOpen={!!cancelar} onClose={() => setCancelar(null)} title="Cancelar turno">
        {cancelar && (
          <div>
            <p style={{ marginTop: 0 }}>
              ¿Cancelar definitivamente el turno de <strong>{cancelar.patient?.person?.name}</strong> ({cancelar.professionalService?.service?.name})?
            </p>
            <div style={{ fontSize: 13, color: colors.textSecondary, background: colors.bg, border: "1px solid colors.border", borderRadius: 8, padding: "10px 12px", margin: "8px 0" }}>
              <div>Era: {fmtFecha(cancelar.startsAt)} {fmtHora(cancelar.startsAt)}</div>
              <div>Total: <strong>{moneda(cancelar.priceSnapshot)}</strong> · Pagado: <strong style={{ color: pagadoDe(cancelar) > 0 ? status.success.fg : MUTED }}>{moneda(pagadoDe(cancelar))}</strong></div>
            </div>
            {pagadoDe(cancelar) > 0 && (
              <p style={{ fontSize: 12, color: "#9a3412" }}>⚠ Este turno tiene {moneda(pagadoDe(cancelar))} pagado. El reembolso se gestiona aparte desde la pestaña Turnos.</p>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <Button type="button" style={{ backgroundColor: colors.border, color: colors.textSecondary }} onClick={() => setCancelar(null)}>No</Button>
              <Button variant="danger" onClick={ejecutarCancelar} disabled={accionando}>
                {accionando ? "Cancelando…" : "Sí, cancelar turno"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

const lbl = { fontSize: 12, color: colors.textSubtle, display: "block", marginBottom: 4 };
const navBtn = { background: "transparent", border: "none", fontSize: 18, cursor: "pointer", color: PURPLE, padding: "0 6px", lineHeight: 1 };
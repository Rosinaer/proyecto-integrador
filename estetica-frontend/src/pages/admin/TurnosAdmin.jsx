import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { useBanner } from "../../components/ui/Banner";
import { useAuth } from "../../hooks/useAuth";
import { fechaClinicaStr } from "../../config/clinica";
import ReservaTurno from "./ReservaTurno";
import { PageHeader } from "../../components/ui/PageHeader";
import { useNavigate } from "react-router-dom";
import { fmtHora, fmtFechaLarga, parseYmd, addDays, lunesDe, ymdDeInstante } from "../../utils/fecha";
import { GrillaAgenda, Columna, CoberturaVista, CANCELADO } from "../../components/calendario/GrillaAgenda";
import DetalleTurnoModal from "../../components/calendario/DetalleTurnoModal";
import client, { mensajeDeError } from "../../api/client";
import { ESTADOS, METODOS, TIPOS_PAGO } from "../../constants/estados";
import { moneda } from "../../utils/moneda";
import {colors, status} from "../../theme/colors"; 


const PALETA = [colors.brand, "#0ea5e9", status.success.strong, "#ea580c", "#db2777", "#0d9488", "#ca8a04", "#4f46e5"];

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

const fmtMomento = (iso) =>
  new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
    timeZone: "America/Argentina/Buenos_Aires",
  });



const fechaDe = (t) => ymdDeInstante(t.startsAt);

const nomPac  = (t) => t?.patient?.person?.name ?? "—";
const nomServ = (t) => t?.professionalService?.service?.name ?? "—";

const pagadoDe = (t) => (Array.isArray(t?.payments) ? t.payments : []).reduce((a, p) => a + (p.isRefund ? -1 : 1) * Number(p.amount), 0);

const Badge = ({ map, value }) => {
  const c = map[value] || { label: value, bg: colors.borderSoft, fg: colors.textSubtle };
  return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: c.bg, color: c.fg }}>{c.label}</span>;
};

const TurnosAdmin = () => {
  const { token, user } = useAuth();
  const banner = useBanner();

  const [confirmRem, setConfirmRem] = useState(null); // turno a recordar
  const [enviandoRem, setEnviandoRem] = useState(false);

  // Acciones de estado y cobro (igual que en Control de Turnos)
  const [estadoTurno, setEstadoTurno] = useState(null);
  const [cobroTurno, setCobroTurno] = useState(null);
  const [formCobro, setFormCobro] = useState({ amount: "", method: "CASH", type: "FULL_PAYMENT" });
  const [accionando, setAccionando] = useState(false);

  const enviarRecordatorio = async (turno) => {
    if (!turno) return;
    setEnviandoRem(true);
    try {
      const { data } = await client.post(`/reminders/turno/${turno.id}`);

      const linea = (r) =>
        r.skipped
          ? `${r.channel === "EMAIL" ? "Email al paciente" : "Aviso a la profesional"}: omitido (${r.reason})`
          : `${r.channel === "EMAIL" ? "Email al paciente" : "Aviso a la profesional"}: ${r.status === "SENT" ? "enviado" : "falló"}`;
      banner.success("Recordatorio procesado", {
        details: (data.resultados || []).map((r) => ["", linea(r)]),
      });
      setConfirmRem(null);
      try {
        const { data: fresh } = await client.get(`/appointments/${turno.id}`);
        setDetalle((d) => (d && d.id === fresh.id ? fresh : d));
        setSlotTurnos((arr) => arr.map((t) => (t.id === fresh.id ? fresh : t)));
      } catch { /* se verá al reabrir el turno */ }
    } catch (err) {
      banner.error(mensajeDeError(err) || "No se pudo enviar el recordatorio");
    } finally {
      setEnviandoRem(false);
    }
  };

  const cambiarEstado = async (turno, status) => {
    setAccionando(true);
    const prev = turno.status;
    try {
      await client.patch(`/appointments/${turno.id}/status`, { status });
      setEstadoTurno(null);
      setTurnos((arr) => arr.map((t) => (t.id === turno.id ? { ...t, status } : t)));
      setSlotTurnos((arr) => arr.map((t) => (t.id === turno.id ? { ...t, status } : t)));
      cargarTurnos();
      window.dispatchEvent(new Event("senda:appointments-changed"));
      banner.success("Estado del turno actualizado", {
        details: [
          ["Paciente", nomPac(turno)],
          ["Turno", `${ymdDeInstante(turno.startsAt).split("-").reverse().join("/")} · ${fmtHora(turno.startsAt)}`],
          ["Estado anterior", ESTADOS[prev]?.label || prev],
          ["Estado nuevo", ESTADOS[status]?.label || status],
        ],
      });
    } catch (err) {
      banner.error(mensajeDeError(err) || "No se pudo cambiar el estado");
    } finally {
      setAccionando(false);
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
      banner.error("Ingresá un monto válido."); return;
    }
    setAccionando(true);
    try {
      await client.post(`/payments/${cobroTurno.id}`, {
        amount: Number(formCobro.amount), method: formCobro.method, type: formCobro.type,
      });
      const turnoCobrado = cobroTurno;
      const totalPagado = pagadoDe(cobroTurno) + Number(formCobro.amount);
      setCobroTurno(null);

      // Releer el turno y propagarlo a TODAS las vistas abiertas: lista semanal
      // (turnos), modal de agenda/slot del día (slotTurnos) y detalle. El
      // setSlotTurnos es el que arregla que, al reabrir el turno desde el modal
      // de la agenda del día que quedó abierto, figure el pago recién hecho.
      try {
        const { data: fresh } = await client.get(`/appointments/${turnoCobrado.id}`);
        setTurnos((arr) => arr.map((t) => (t.id === fresh.id ? fresh : t)));
        setSlotTurnos((arr) => arr.map((t) => (t.id === fresh.id ? fresh : t)));
        setDetalle((d) => (d && d.id === fresh.id ? fresh : d));
      } catch { /* se reflejará al recargar la agenda */ }

      cargarTurnos();
      window.dispatchEvent(new Event("senda:appointments-changed"));
      banner.success("Cobro registrado", {
        details: [
          ["Paciente", nomPac(turnoCobrado)],
          ["Servicio", nomServ(turnoCobrado)],
          ["Monto", moneda(formCobro.amount)],
          ["Pagado / Total", `${moneda(totalPagado)} / ${moneda(turnoCobrado.priceSnapshot)}`],
        ],
      });
    } catch (err) {
      banner.error(mensajeDeError(err) || "No se pudo registrar el cobro");
    } finally {
      setAccionando(false);
    }
  };

  const esProfesional = user?.role === "PROFESSIONAL";
  const miProfId = user?.professionalId || "";

  const [vista, setVista] = useState("cobertura"); // "cobertura", "semana"
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
        const { data } = await client.get("/appointments", { params: { needsReschedule: true } });
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
    if (esProfesional) {
      const propio = miProfId ? [{ id: miProfId, person: { name: user?.person?.name || "Mis turnos" } }] : [];
      setProfesionales(propio);
      setProfSel(propio.map((p) => p.id));
      return;
    }
    client.get("/professionals")
      .then(({ data: d }) => {
        const list = Array.isArray(d) ? d : [];
        setProfesionales(list);
        setProfSel(list.map((p) => p.id));
      })
      .catch(() => setProfesionales([]));
  }, [token, esProfesional, miProfId]);

  const cargarTurnos = useCallback(async () => {
    if (!token || esCobertura) return;
    setCargando(true);
    // Fechas planas (YYYY-MM-DD): el backend las interpreta en hora de la
    // clínica, así no se pierden los turnos de la noche cerca de medianoche.
    try {
      const { data } = await client.get("/appointments", {
        params: { desde: rango.ini, hasta: rango.fin },
      });
      setTurnos(Array.isArray(data) ? data : []);
    } catch {
      setTurnos([]);
    } finally {
      setCargando(false);
    }
  }, [token, rango.ini, rango.fin, esCobertura]);

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
              const { data } = await client.get(`/professionals/${pid}/availability`, {
                params: { year, month },
              });
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
  }, [esCobertura, token, profesionales, profSel, dias]);

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
      // Fecha plana: el backend la interpreta en hora de la clínica.
      const { data } = await client.get("/appointments", {
        params: { desde: slot.fecha, hasta: slot.fecha },
      });
      if (Array.isArray(data)) {
        const lista = data.filter((t) => t.availabilityId === slot.id);
        setSlotTurnos(lista);
      }
    } catch {
      /* silencioso: conservamos lo que ya mostramos del slot */
    } finally {
      setCargandoSlot(false);
    }
  }, [token]);

  const cerrarSlot = () => {
    setDetalleSlot(null);
    setSlotTurnos([]);
    setCargandoSlot(false);
  };


  const tituloRango = semanal
    ? `${parseYmd(rango.ini).getUTCDate()} – ${parseYmd(rango.fin).getUTCDate()} ${MESES[parseYmd(rango.fin).getUTCMonth()].slice(0, 3)} ${parseYmd(rango.fin).getUTCFullYear()}`
    : fmtFechaLarga(ancla);

  const minCol = vista === "dia" ? 150 : 128;

  const columnasGrilla = columnas.map((c) => ({
    key: c.key,
    esHoy: c.esHoy,
    cabecera: (
      <>
        <div style={{ fontSize: 13, fontWeight: 700, color: c.color || colors.text, textTransform: "capitalize", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {!esSemana && c.color && <span style={{ width: 10, height: 10, borderRadius: "50%", background: c.color, display: "inline-block", marginRight: 6 }} />}
          {c.titulo}
        </div>
        <div style={{ fontSize: 11, color: colors.textMuted }}>{c.items.length} turno{c.items.length === 1 ? "" : "s"}</div>
      </>
    ),
    cuerpo: <Columna items={c.items} colorDe={colorDe} onPick={setDetalle} />,
  }));

  return (
    <div>
      <PageHeader
        title="Calendario"
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
        <div style={{ background: "#fff", border: "1px solid colors.border", borderRadius: 10, padding: 18, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ color: colors.brand, margin: 0, fontSize: "1.05rem" }}>Agendar nuevo turno</h3>
            <button type="button" onClick={() => setModalNuevo(false)}
              style={{ background: "transparent", border: "none", color: colors.textMuted, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
          </div>
          <ReservaTurno embedded onCreated={() => { cargarTurnos(); }} />
        </div>
      )}

      <div style={{ background: "#fff", border: "1px solid colors.border", borderRadius: 10, padding: 14, marginBottom: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>

          <div style={{ display: "flex", border: "1px solid colors.line", borderRadius: 8, overflow: "hidden" }}>
            {[["cobertura", "Agendas"], ["semana", "Turnos"]].map(([v, txt]) => (
              <button key={v} type="button" onClick={() => setVista(v)}
                style={{ border: "none", padding: "7px 16px", fontSize: 13, cursor: "pointer",
                  background: vista === v ? colors.brand : "#fff", color: vista === v ? "#fff" : colors.textSecondary, fontWeight: vista === v ? 700 : 400 }}>
                {txt}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button type="button" onClick={() => navegar(-1)} style={navBtn}>‹</button>
            <button type="button" onClick={irHoy} style={{ ...navBtn, width: "auto", padding: "0 12px", fontSize: 13 }}>Hoy</button>
            <button type="button" onClick={() => navegar(1)} style={navBtn}>›</button>
          </div>

          <strong style={{ color: colors.brand, fontSize: 15, textTransform: "capitalize", minWidth: 180 }}>{tituloRango}</strong>

          <input type="date" value={ancla} onChange={(e) => e.target.value && setAncla(e.target.value)}
            style={{ marginLeft: "auto", padding: "7px 10px", border: "1px solid colors.line", borderRadius: 8, fontSize: 13 }} />

          {!esCobertura && (
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: colors.textSecondary, cursor: "pointer" }}>
              <input type="checkbox" checked={ocultarCancelados} onChange={(e) => setOcultarCancelados(e.target.checked)} />
              Ocultar cancelados / no-show
            </label>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", borderTop: "1px solid colors.borderSoft", paddingTop: 12 }}>
          <span style={{ fontSize: 12, color: colors.textSubtle, marginRight: 4 }}>Profesionales:</span>
          {profesionales.map((p) => {
            const on = profSel.includes(p.id);
            const c = colorDe[p.id];
            return (
              <button key={p.id} type="button" onClick={() => toggleProf(p.id)}
                style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${on ? c : colors.line}`,
                  background: on ? `${c}1a` : "#fff", color: on ? c : colors.textMuted, borderRadius: 999, padding: "4px 10px", fontSize: 12, cursor: "pointer", fontWeight: on ? 600 : 400 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: on ? c : colors.line, display: "inline-block" }} />
                {p.person?.name}
              </button>
            );
          })}
          <button type="button" onClick={todos} style={miniLink}>Todos</button>
          <button type="button" onClick={ninguno} style={miniLink}>Ninguno</button>
        </div>

        {esCobertura && (
          <div style={{ fontSize: 12, color: colors.textSubtle, borderTop: "1px solid colors.borderSoft", paddingTop: 10 }}>
            Mostrando las <strong>agendas abiertas</strong> de la semana. Cada bloque es una franja de
            disponibilidad e indica cuántos turnos tiene reservados. Hacé clic en una franja para ver el detalle de sus turnos.
          </div>
        )}
      </div>

      {esCobertura ? (
        cargandoCob ? (
          <p style={{ color: colors.textMuted, textAlign: "center", padding: "40px 0" }}>Cargando agendas…</p>
        ) : profsVisibles.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: colors.textMuted, background: "#fff", border: "1px solid colors.border", borderRadius: 10 }}>
            Elegí al menos un profesional para ver la disponibilidad.
          </div>
        ) : (
          <CoberturaVista dias={dias} slots={slotsCob} colorDe={colorDe} nombreDe={nombreDe} onPick={abrirSlot} />
        )
      ) : cargando ? (
        <p style={{ color: colors.textMuted, textAlign: "center", padding: "40px 0" }}>Cargando agenda…</p>
      ) : columnas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: colors.textMuted, background: "#fff", border: "1px solid colors.border", borderRadius: 10 }}>
          Elegí al menos un profesional para ver la agenda.
        </div>
      ) : (
        <GrillaAgenda columnas={columnasGrilla} minCol={minCol} />
      )}

      {/* Detalle unificado (mismo cuerpo y botones que Control de Turnos) */}
      <Modal isOpen={!!detalle} onClose={() => setDetalle(null)} title="Detalle del turno">
        <DetalleTurnoModal
          turno={detalle}
          onFichaPaciente={(t) => { const id = t.patientId; setDetalle(null); navigate(`/admin/pacientes/${id}`); }}
          onRecordatorio={(t) => { setConfirmRem(t); }}
          onEstado={(t) => { setDetalle(null); setEstadoTurno(t); }}
          onCobrar={(t) => { setDetalle(null); abrirCobro(t); }}
        />
      </Modal>

      <Modal isOpen={!!confirmRem} onClose={() => !enviandoRem && setConfirmRem(null)} title="Enviar recordatorio">
        {confirmRem && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14 }}>
            <p style={{ margin: 0 }}>
              Se enviará el recordatorio del turno de{" "}
              <strong>{confirmRem.patient?.person?.name || "—"}</strong> ({fmtHora(confirmRem.startsAt)}):
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

      {/* Cambiar estado (igual que Control de Turnos) */}
      <Modal isOpen={!!estadoTurno} onClose={() => setEstadoTurno(null)} title="Cambiar estado del turno">
        {estadoTurno && (
          <div>
            <p style={{ marginTop: 0 }}>
              Estado actual: <Badge map={ESTADOS} value={estadoTurno.status} /> — {nomPac(estadoTurno)} · {fmtHora(estadoTurno.startsAt)}
            </p>
            <p style={{ fontSize: 13, color: colors.textSubtle }}>
              Elegí el nuevo estado (se puede revertir a cualquiera):
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
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

      {/* Registrar cobro (igual que Control de Turnos) */}
      <Modal isOpen={!!cobroTurno} onClose={() => setCobroTurno(null)} title="Registrar cobro">
        {cobroTurno && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ margin: 0, fontSize: 13, color: colors.textSubtle }}>
              {nomPac(cobroTurno)} · {nomServ(cobroTurno)} — Total {moneda(cobroTurno.priceSnapshot)},
              pagado {moneda(pagadoDe(cobroTurno))}.
            </p>
            <div>
              <label style={lbl}>Monto</label>
              <input type="number" min={1} style={inp} value={formCobro.amount}
                     onChange={(e) => setFormCobro((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 140px" }}>
                <label style={lbl}>Método</label>
                <select style={inp} value={formCobro.method}
                        onChange={(e) => setFormCobro((f) => ({ ...f, method: e.target.value }))}>
                  {METODOS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div style={{ flex: "1 1 140px" }}>
                <label style={lbl}>Tipo</label>
                <select style={inp} value={formCobro.type}
                        onChange={(e) => setFormCobro((f) => ({ ...f, type: e.target.value }))}>
                  {TIPOS_PAGO.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <Button type="button" style={{ backgroundColor: colors.border, color: colors.textSecondary }} onClick={() => setCobroTurno(null)}>Cancelar</Button>
              <Button onClick={registrarCobro} disabled={accionando}>
                {accionando ? "Registrando..." : "Registrar cobro"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!detalleSlot} onClose={cerrarSlot} title="Detalle de la disponibilidad">
        {detalleSlot && (() => {
          const appts = (slotTurnos || []).slice().sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
          const reservados = appts.filter((a) => !CANCELADO(a.status)).length;
          const color = colorDe[detalleSlot.professionalId] || colors.brand;
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
                  ? <span style={{ color: colors.textMuted }}>cargando…</span>
                  : reservados === 0
                    ? <span style={{ color: status.success.strong, fontWeight: 600 }}>Ninguno (franja libre)</span>
                    : <span style={{ color: colors.textSecondary }}>{reservados}</span>}
              </p>

              {cargandoSlot && appts.length === 0 && (
                <p style={{ margin: "4px 0", color: colors.textMuted }}>Buscando turnos de esta franja…</p>
              )}

              {appts.length > 0 && (
                <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 6 }}>
                  {appts.map((a) => {
                    const cancel = CANCELADO(a.status);
                    const d = a.startsAt ? new Date(a.startsAt) : null;
                    const horaA = d && !isNaN(d) ? fmtHora(a.startsAt) : "—";
                    return (
                      <div key={a.id}
                        onClick={() => setDetalle(a)}
                        title="Ver detalle del turno"
                        style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "6px 10px",
                          border: "1px solid colors.border", borderLeft: `3px solid ${color}`, borderRadius: 8,
                          background: "#fff", opacity: cancel ? 0.6 : 1, cursor: "pointer",
                        }}>
                        <span style={{ fontWeight: 700, color, whiteSpace: "nowrap", textDecoration: cancel ? "line-through" : "none" }}>
                          {horaA}
                        </span>
                        <span style={{ flex: 1, minWidth: 0, color: colors.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {a.patient?.person?.name || "—"}
                          <span style={{ color: colors.textMuted }}> · {a.professionalService?.service?.name || "—"}</span>
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

const navBtn = { width: 34, height: 34, borderRadius: 8, border: "1px solid colors.line", background: "#fff", color: colors.brand, fontSize: 18, cursor: "pointer", lineHeight: 1 };
const miniLink = { border: "none", background: "transparent", color: colors.brand, fontSize: 12, cursor: "pointer", textDecoration: "underline", padding: "2px 4px" };
const lbl = { display: "block", fontSize: 13, fontWeight: 600, color: colors.brand, marginBottom: 5 };
const inp = { width: "100%", padding: "9px 12px", border: "1px solid #ccc", borderRadius: 6, fontSize: 14, boxSizing: "border-box" };

export default TurnosAdmin;
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";
import { PacienteFormModal } from "../../components/PacienteFormModal";
import { useBanner } from "../../components/ui/Banner";
import { PageHeader } from "../../components/ui/PageHeader";
import { fmtHora, fmtFechaLargaISO, ymdDeInstante, instanteParaApi, LECTURA_TZ } from "../../utils/fecha";
 
const pacienteLabel = (p) => {
  if (!p) return "";
  const per = p.person || p;
  const doc = [per.documentType, per.document].filter(Boolean).join(" ");
  return [per.name, doc, per.email].filter(Boolean).join(" · ");
}; 

const PURPLE = "#6b21a8";
const PURPLE_BG = "#f3e8ff";
const BORDER = "#cbd5e1";
const WARN_BG = "#fef9c3";
const WARN_TX = "#854d0e";
const MUTED = "#94a3b8";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const fmtPrecio = (n) => "$" + Number(n || 0).toLocaleString("es-AR"); 
const fmtFechaCorta = (iso) => new Date(iso).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short", timeZone: LECTURA_TZ });
const fmtFechaLarga = fmtFechaLargaISO;
 
function avisosDeServicio(service) {
  if (!service) return [];
  const out = [];
  if (service.reminderNote) out.push(`${service.name}: ${service.reminderNote}`);
  if (service.requiresPreConsult) out.push(`${service.name}: requiere pre-consulta antes de confirmar`);
  return out;
}
 
function MiniCalendario({ year, month, dias, diaSel, onPick, onNav }) {
  const diasSet = useMemo(() => new Set(dias), [dias]);
  const offset = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7; // Lun = 0
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
            <button
              key={i}
              type="button"
              disabled={!disp}
              onClick={() => onPick(fecha)}
              style={{
                padding: "5px 0", borderRadius: 6, border: "none", fontSize: 12,
                cursor: disp ? "pointer" : "default",
                background: sel ? PURPLE : disp ? PURPLE_BG : "transparent",
                color: sel ? "#fff" : disp ? PURPLE : "#cbd5e1",
                fontWeight: disp ? "bold" : "normal",
              }}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ReservaTurno({ onCreated, embedded = false }) {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const banner = useBanner();
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  const headers = { Authorization: `Bearer ${token}` };
  const jsonHeaders = { "Content-Type": "application/json", ...headers };
 
  const esProfesional = user?.role === "PROFESSIONAL";
  const miProfId = user?.professionalId || "";

  const [modo, setModo] = useState("profesional"); 
  const [sobreturno, setSobreturno] = useState(false);
 
  const [profesionales, setProfesionales] = useState([]);
  const [servicios, setServicios] = useState([]);
 
  const [profSel, setProfSel] = useState("");
  const [serviciosProf, setServiciosProf] = useState([]); 
  const [elegidos, setElegidos] = useState([]);
 
  const [servSel, setServSel] = useState("");
  const [opciones, setOpciones] = useState([]);
  const [opcionSel, setOpcionSel] = useState(null);
  const [servInfo, setServInfo] = useState(null);
  const [cargandoOpciones, setCargandoOpciones] = useState(false);
 
  const hoy = new Date();
  const [verMes, setVerMes] = useState({ year: hoy.getFullYear(), month: hoy.getMonth() + 1 });
  const [dias, setDias] = useState([]);
  const [diaSel, setDiaSel] = useState("");
  const [slots, setSlots] = useState([]);
  const [slotSel, setSlotSel] = useState(null);
  const [availabilityId, setAvailabilityId] = useState("");

 
  const [stFecha, setStFecha] = useState("");
  const [stHora, setStHora] = useState("");

 
  const [pacQuery, setPacQuery] = useState("");
  const [pacientes, setPacientes] = useState([]);
  const [pacSel, setPacSel] = useState("");
  const [pacBuscado, setPacBuscado] = useState(false);
  const [modalPacAbierto, setModalPacAbierto] = useState(false);

  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (esProfesional) {
      if (miProfId) {
        setProfesionales([{ id: miProfId, person: { name: user?.person?.name || "Mi agenda" } }]);
        setProfSel(miProfId);
      }
      return;
    }
    (async () => {
      try {
        const [rp, rs] = await Promise.all([
          fetch(`${apiUrl}/professionals`, { headers }),
          fetch(`${apiUrl}/services?active=true`, { headers }),
        ]);
        setProfesionales(await rp.json());
        setServicios(await rs.json());
      } catch {
        setError("No se pudieron cargar profesionales o servicios.");
      }
    })();
  }, []);
 
  useEffect(() => {
    const pre = location.state?.patient;
    if (pre?.id) {
      setPacSel(pre.id);
      setPacQuery(pre.name || "");
    }
  }, [location.state]);
 
  useEffect(() => {
    setElegidos([]);
    if (!profSel) { setServiciosProf([]); return; }
    (async () => {
      const res = await fetch(`${apiUrl}/professionals/${profSel}`, { headers });
      const data = await res.json();
      setServiciosProf(data.services || []);
    })();
  }, [profSel]);
 
  useEffect(() => {
    setOpcionSel(null);
    setOpciones([]);
    setServInfo(null);
    if (!servSel) return;
    (async () => {
      setCargandoOpciones(true);
      try {
        const res = await fetch(`${apiUrl}/appointments/service-options?serviceId=${servSel}`, { headers });
        const data = await res.json();
        setOpciones(data.options || []);
        setServInfo(data.service || null);
      } finally {
        setCargandoOpciones(false);
      }
    })();
  }, [servSel]);
 
  const contexto = useMemo(() => {
    if (modo === "profesional") {
      if (!profSel || elegidos.length === 0) return null;
      const rows = elegidos.map((sid) => serviciosProf.find((s) => s.serviceId === sid)).filter(Boolean);
      if (rows.length !== elegidos.length) return null;
      return {
        professionalId: profSel,
        serviceIds: elegidos,
        professionalServiceIds: rows.map((r) => r.id),
        duration: rows.reduce((a, r) => a + r.durationMinutes, 0),
        price: rows.reduce((a, r) => a + Number(r.price), 0),
        avisos: rows.flatMap((r) => avisosDeServicio(r.service)),
      };
    }
    if (!servSel || !opcionSel) return null;
    return {
      professionalId: opcionSel.professionalId,
      serviceIds: [servSel],
      professionalServiceIds: [opcionSel.professionalServiceId],
      duration: opcionSel.durationMinutes,
      price: opcionSel.price,
      avisos: servInfo ? avisosDeServicio({ ...servInfo }) : [],
    };
  }, [modo, profSel, elegidos, serviciosProf, servSel, opcionSel, servInfo]);

  const ctxKey = contexto ? `${contexto.professionalId}|${contexto.serviceIds.join(",")}` : "";
 
  useEffect(() => {
    setDiaSel(""); setSlots([]); setSlotSel(null); setAvailabilityId("");
    if (sobreturno || !ctxKey) { setDias([]); return; }
    (async () => {
      const q = `professionalId=${contexto.professionalId}&serviceIds=${contexto.serviceIds.join(",")}&year=${verMes.year}&month=${verMes.month}`;
      const res = await fetch(`${apiUrl}/appointments/available-days?${q}`, { headers });
      const data = await res.json();
      setDias(data.days || []);
    })();
  }, [ctxKey, verMes.year, verMes.month, sobreturno]);
 
  useEffect(() => {
    setSlots([]); setSlotSel(null);
    if (sobreturno || !ctxKey || !diaSel) return;
    (async () => {
      const q = `professionalId=${contexto.professionalId}&serviceIds=${contexto.serviceIds.join(",")}&date=${diaSel}`;
      const res = await fetch(`${apiUrl}/appointments/available-slots?${q}`, { headers });
      const data = await res.json();
      setSlots(data.slots || []);
      setAvailabilityId(data.availabilityId || "");
    })();
  }, [diaSel]);
 
  useEffect(() => {
    if (pacQuery.trim().length < 1) { setPacientes([]); setPacBuscado(false); return; }
    setPacBuscado(false);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${apiUrl}/patients?search=${encodeURIComponent(pacQuery)}`, { headers });
        const data = await res.json();
        setPacientes(Array.isArray(data) ? data : []);
      } catch {
        setPacientes([]);
      } finally {
        setPacBuscado(true);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [pacQuery]);
 
  const toggleServicio = (serviceId) => {
    setElegidos((prev) => prev.includes(serviceId) ? prev.filter((s) => s !== serviceId) : [...prev, serviceId]);
  };

  const elegirOpcion = (op) => {
    setOpcionSel(op);
    if (op.nextSlot && !sobreturno) {
      const [y, m] = ymdDeInstante(op.nextSlot.startsAt).split("-").map(Number);
      setVerMes({ year: y, month: m });
    }
  };

  const onPacienteGuardado = (pac) => {
    setPacSel(pac.id);
    setPacQuery(pacienteLabel(pac));
    setPacientes([]);
    setPacBuscado(false);
    setModalPacAbierto(false);
  }; 

  const cambiarSobreturno = (on) => {
    setSobreturno(on);
    setSlotSel(null); setDiaSel("");
    setStFecha(""); setStHora("");
  };
 
  const confirmar = async () => {
    setError("");
    if (!contexto || !pacSel) return;
    if (sobreturno ? (!stFecha || !stHora) : !slotSel) return;
    setGuardando(true);
    try {
      let startsAtISO;
      let res;

      if (sobreturno) {
        startsAtISO = instanteParaApi(stFecha, stHora);
        const payload = { patientId: pacSel, startsAt: startsAtISO, ...(notas ? { notes: notas } : {}) };
        if (contexto.professionalServiceIds.length > 1) payload.professionalServiceIds = contexto.professionalServiceIds;
        else payload.professionalServiceId = contexto.professionalServiceIds[0];
        res = await fetch(`${apiUrl}/appointments/overbook`, { method: "POST", headers: jsonHeaders, body: JSON.stringify(payload) });
      } else {
        startsAtISO = slotSel.startsAt;
        const payload = { availabilityId: availabilityId || slotSel.availabilityId, patientId: pacSel, startsAt: slotSel.startsAt, ...(notas ? { notes: notas } : {}) };
        if (contexto.professionalServiceIds.length > 1) payload.professionalServiceIds = contexto.professionalServiceIds;
        else payload.professionalServiceId = contexto.professionalServiceIds[0];
        res = await fetch(`${apiUrl}/appointments`, { method: "POST", headers: jsonHeaders, body: JSON.stringify(payload) });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje || data.error || "No se pudo crear el turno");

      const profNombre = modo === "profesional"
        ? (profesionales.find((p) => p.id === profSel)?.person?.name || "—")
        : (opcionSel?.professionalName || "—");
      const servNombres = modo === "profesional"
        ? elegidos.map((sid) => serviciosProf.find((s) => s.serviceId === sid)?.service?.name).filter(Boolean)
        : (servInfo?.name ? [servInfo.name] : []);

      const finISO = new Date(new Date(startsAtISO).getTime() + contexto.duration * 60000).toISOString();
      const pacienteTxt = pacQuery;
 
      setSlotSel(null); setDiaSel(""); setNotas("");
      setStFecha(""); setStHora("");
      setPacQuery(""); setPacSel("");
      setElegidos([]); setOpcionSel(null);
 
      banner.success(`Turno agendado${sobreturno ? " (sobreturno)" : ""}`, {
        details: [
          ["Fecha", fmtFechaLarga(startsAtISO)],
          ["Horario", `${fmtHora(startsAtISO)} – ${fmtHora(finISO)} (${contexto.duration} min)`],
          ["Profesional", profNombre],
          ["Paciente", pacienteTxt || "—"],
          [servNombres.length > 1 ? "Servicios" : "Servicio", servNombres.join(" + ") || "—"],
          ["Precio", fmtPrecio(contexto.price)],
        ],
        notes: notas || "",
        warnings: contexto.avisos || [],
        actions: embedded
          ? [{ label: "Reservar otro", onClick: () => banner.clear() }]
          : [
              { label: "Reservar otro", onClick: () => banner.clear() },
              { label: "Ir a la agenda", primary: true, onClick: () => navigate("/admin/turnos") },
            ],
      });

      onCreated?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };
 
  const horarioListo = sobreturno ? (stFecha && stHora) : slotSel;
  const puedeConfirmar = contexto && horarioListo && pacSel && !guardando;

  const faltantes = [];
  if (sobreturno) {
    if (!stFecha) faltantes.push("elegir la fecha");
    if (!stHora) faltantes.push("elegir la hora");
  } else {
    if (!diaSel) faltantes.push("elegir un día");
    if (!slotSel) faltantes.push("elegir un horario");
  }
  if (!pacSel) faltantes.push("seleccionar un paciente");
 
  const stFin = (sobreturno && stFecha && stHora && contexto)
    ? fmtHora(new Date(new Date(instanteParaApi(stFecha, stHora)).getTime() + contexto.duration * 60000).toISOString())
    : "";

  const tabBtn = (activo) => ({
    fontSize: 13, padding: "6px 14px", borderRadius: 8, cursor: "pointer", border: "none",
    background: activo ? PURPLE_BG : "transparent",
    color: activo ? PURPLE : MUTED,
    fontWeight: activo ? "bold" : "normal",
  });

  return (
    <div> 
      {!embedded && (
        <PageHeader
          title="Reservar Turno"
          subtitle="Elegí por profesional o por servicio, seleccioná día y horario, y asigná el paciente."
        />
      )}
 
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {!esProfesional ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" style={tabBtn(modo === "profesional")} onClick={() => setModo("profesional")}>Por profesional</button>
            <button type="button" style={tabBtn(modo === "servicio")} onClick={() => setModo("servicio")}>Por servicio</button>
          </div>
        ) : <div />}
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", color: sobreturno ? WARN_TX : MUTED, fontWeight: sobreturno ? "bold" : "normal", background: sobreturno ? WARN_BG : "transparent", borderRadius: 8, padding: "4px 10px" }}>
          <input type="checkbox" checked={sobreturno} onChange={(e) => cambiarSobreturno(e.target.checked)} />
          Sobreturno (ignora agenda)
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
 
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {modo === "profesional" ? (
            <>
              <div>
                <label style={lbl}>1 · Profesional</label>
                <select value={profSel} onChange={(e) => setProfSel(e.target.value)} style={sel} disabled={esProfesional}>
                  <option value="">Seleccionar…</option>
                  {profesionales.map((p) => <option key={p.id} value={p.id}>{p.person?.name}</option>)}
                </select>
              </div>

              <div>
                <label style={lbl}>2 · Servicios (uno o varios)</label>
                <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden", background: "#fff" }}>
                  {serviciosProf.length === 0 && (
                    <div style={vacio}>
                      {profSel
                        ? (esProfesional ? "No tenés servicios cargados." : "Este profesional no tiene servicios cargados.")
                        : "Elegí un profesional…"}
                    </div>
                  )}
                  {serviciosProf.map((s) => {
                    const on = elegidos.includes(s.serviceId);
                    return (
                      <div key={s.id} onClick={() => toggleServicio(s.serviceId)}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", cursor: "pointer", background: on ? PURPLE_BG : "#fff", borderBottom: `1px solid #f1f5f9` }}>
                        <span style={{ fontSize: 13, color: on ? PURPLE : "#334155" }}>{on ? "☑" : "☐"} {s.service?.name}</span>
                        <span style={{ fontSize: 11, color: "#64748b" }}>{s.durationMinutes} min · {fmtPrecio(s.price)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label style={lbl}>1 · Servicio</label>
                <select value={servSel} onChange={(e) => setServSel(e.target.value)} style={sel}>
                  <option value="">Seleccionar…</option>
                  {servicios.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label style={lbl}>2 · Profesional</label>
                <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden", background: "#fff" }}>
                  {!servSel && <div style={vacio}>Elegí un servicio…</div>}
                  {servSel && cargandoOpciones && <div style={vacio}>Buscando turnos…</div>}
                  {servSel && !cargandoOpciones && opciones.length === 0 && <div style={vacio}>Nadie ofrece este servicio.</div>}
                  {opciones.map((op) => {
                    const on = opcionSel?.professionalServiceId === op.professionalServiceId;
                    const sinTurno = !op.nextSlot;
                    const clickable = sobreturno || !sinTurno;  
                    return (
                      <div key={op.professionalServiceId}
                        onClick={() => clickable && elegirOpcion(op)}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", cursor: clickable ? "pointer" : "default", opacity: clickable ? 1 : 0.55, background: on ? PURPLE_BG : "#fff", borderBottom: `1px solid #f1f5f9` }}>
                        <span style={{ fontSize: 13, color: on ? PURPLE : "#334155" }}>{on ? "◉" : "○"} {op.professionalName}</span>
                        <span style={{ fontSize: 11, color: "#64748b", textAlign: "right" }}>
                          {op.durationMinutes} min · {fmtPrecio(op.price)}<br />
                          <span style={{ color: MUTED }}>{sinTurno ? (sobreturno ? "elegible (sobreturno)" : "sin turnos próximos") : `1er turno: ${fmtFechaCorta(op.nextSlot.startsAt)}`}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
 
          {contexto && (
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: 12, background: "#fff" }}>
              <div style={resRow}><span style={{ color: "#64748b" }}>Duración{contexto.serviceIds.length > 1 ? " total" : ""}</span><strong>{contexto.duration} min</strong></div>
              <div style={resRow}><span style={{ color: "#64748b" }}>Precio{contexto.serviceIds.length > 1 ? " total" : ""}</span><strong>{fmtPrecio(contexto.price)}</strong></div>
            </div>
          )}

          {/* Avisos */}
          {contexto?.avisos?.length > 0 && (
            <div style={{ background: WARN_BG, color: WARN_TX, borderRadius: 8, padding: "10px 12px", fontSize: 12 }}>
              {contexto.avisos.map((a, i) => <div key={i}>⚠ {a}</div>)}
            </div>
          )}
        </div>
 
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}> 
          {!contexto && !sobreturno && (
            <div>
              <label style={lbl}>Día</label>
              <div style={{ opacity: 0.55, pointerEvents: "none" }}>
                <MiniCalendario
                  year={verMes.year} month={verMes.month} dias={[]} diaSel=""
                  onPick={() => {}} onNav={() => {}}
                />
              </div>
              <div style={{ ...vacio, padding: "10px 0 0", textAlign: "center" }}>
                Elegí {modo === "profesional" ? "profesional y servicios" : "servicio y profesional"} para ver los días con turno.
              </div>
            </div>
          )}
          {!contexto && sobreturno && (
            <div style={{ ...vacio, padding: "40px 12px", textAlign: "center" }}>
              Elegí {modo === "profesional" ? "profesional y servicios" : "servicio y profesional"} para cargar el sobreturno.
            </div>
          )}

          {contexto && (
            <>
              {sobreturno ? (
                <>
                  <div style={{ background: WARN_BG, color: WARN_TX, borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
                    ⚠ Sobreturno: ignora la agenda y los solapamientos. Cargá fecha y hora a mano.
                  </div>
                  <div>
                    <label style={lbl}>3 · Fecha y hora (bloque de {contexto.duration} min)</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input type="date" value={stFecha} onChange={(e) => setStFecha(e.target.value)} style={{ ...sel, padding: "8px 10px" }} />
                      <input type="time" value={stHora} onChange={(e) => setStHora(e.target.value)} style={{ ...sel, padding: "8px 10px" }} />
                    </div>
                    {stFin && <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>Termina aprox. a las {stFin}.</div>}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label style={lbl}>3 · Día (resaltados = entra el bloque de {contexto.duration} min)</label>
                    <MiniCalendario
                      year={verMes.year} month={verMes.month} dias={dias} diaSel={diaSel}
                      onPick={setDiaSel}
                      onNav={(delta) => setVerMes((v) => {
                        const m = v.month + delta;
                        if (m < 1) return { year: v.year - 1, month: 12 };
                        if (m > 12) return { year: v.year + 1, month: 1 };
                        return { year: v.year, month: m };
                      })}
                    />
                  </div>

                  <div>
                    <label style={lbl}>4 · Horarios del día</label>
                    {!diaSel && <div style={{ fontSize: 12, color: MUTED }}>Elegí un día.</div>}
                    {diaSel && slots.length === 0 && <div style={{ fontSize: 12, color: MUTED }}>Sin horarios libres ese día.</div>}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {slots.map((s, i) => {
                        const on = slotSel?.startsAt === s.startsAt;
                        return (
                          <button key={i} type="button" onClick={() => setSlotSel(s)}
                            style={{ fontSize: 13, padding: "6px 12px", borderRadius: 8, cursor: "pointer", border: on ? `2px solid ${PURPLE}` : `1px solid ${BORDER}`, background: on ? PURPLE_BG : "#fff", color: on ? PURPLE : "#334155" }}>
                            {fmtHora(s.startsAt)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
 
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <label style={{ ...lbl, marginBottom: 0 }}>Paciente</label>
                  <button type="button" onClick={() => setModalPacAbierto(true)}
                    style={{ border: `1px solid ${PURPLE}`, background: PURPLE_BG, color: PURPLE, borderRadius: 6, padding: "3px 8px", fontSize: 11, cursor: "pointer", fontWeight: "bold" }}>
                    + Nuevo paciente
                  </button>
                </div>

                <input value={pacQuery} onChange={(e) => { setPacQuery(e.target.value); setPacSel(""); }} placeholder="Buscar por nombre, email o teléfono…" style={{ ...sel, padding: "8px 12px" }} />

                {pacientes.length > 0 && !pacSel && (
                  <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, marginTop: 4, maxHeight: 180, overflowY: "auto", background: "#fff" }}>
                    {pacientes.map((p) => (
                      <div key={p.id} onClick={() => { setPacSel(p.id); setPacQuery(pacienteLabel(p)); setPacientes([]); }}
                        style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid #f1f5f9" }}>
                        <strong style={{ color: "#334155" }}>{p.person?.name}</strong>
                        <div style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>
                          {p.person?.documentType} {p.person?.document}
                          {p.person?.email ? ` · ${p.person.email}` : ""}
                          {p.person?.phone ? ` · ${p.person.phone}` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {pacBuscado && !pacSel && pacientes.length === 0 && (
                  <div style={{ marginTop: 6, fontSize: 12, color: MUTED }}>
                    No se encontró ningún paciente. Podés crearlo con el botón <strong style={{ color: PURPLE }}>+ Nuevo paciente</strong>.
                  </div>
                )}

                {pacSel && <div style={{ fontSize: 12, color: PURPLE, marginTop: 4 }}>✓ Paciente seleccionado</div>}
              </div>

              <textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Notas (opcional)" rows={2} style={{ ...sel, padding: "8px 12px", resize: "vertical" }} />

              {error && <div style={{ color: "#b91c1c", fontSize: 13 }}>{error}</div>}

              {!guardando && faltantes.length > 0 && (
                <div style={{ fontSize: 12, color: WARN_TX, background: WARN_BG, borderRadius: 8, padding: "8px 12px" }}>
                  Para agendar falta: {faltantes.join(" · ")}.
                </div>
              )}

              <Button type="button" onClick={confirmar} disabled={!puedeConfirmar}>
                {guardando ? "Agendando…" : `${sobreturno ? "Agendar sobreturno" : "Agendar turno"} · ${contexto.duration} min`}
              </Button>
            </>
          )}
        </div>
      </div>
 
      <PacienteFormModal
        isOpen={modalPacAbierto}
        onClose={() => setModalPacAbierto(false)}
        token={token}
        initialName={pacQuery}
        onSaved={onPacienteGuardado}
      />
    </div>
  );
}
 
const lbl = { fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 };
const sel = { width: "100%", boxSizing: "border-box", padding: "9px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 14 };
const vacio = { padding: "12px", fontSize: 12, color: MUTED };
const resRow = { display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 };
const navBtn = { background: "transparent", border: "none", fontSize: 18, cursor: "pointer", color: PURPLE, padding: "0 6px", lineHeight: 1 };
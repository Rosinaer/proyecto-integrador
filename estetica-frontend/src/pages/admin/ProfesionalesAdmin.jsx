import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Tr, Td } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../hooks/useAuth";
import { puedeEditar } from "../../config/permisos";
import { useBanner } from "../../components/ui/Banner";
import { PageHeader } from "../../components/ui/PageHeader";
import { TEL_PAIS, TEL_AREA_DEFAULT } from "../../config/clinica";
import { armarTelefono, validarTelefono, partirTelefono } from "../../utils/telefono";
import client, { mensajeDeError } from "../../api/client";
import {colors, status} from "../../theme/colors"; 

const TIPOS_DOC = ["DNI", "PASSPORT", "OTHER"];
const DOC_LABEL = { DNI: "DNI", PASSPORT: "Pasaporte", OTHER: "Otro" };

const ProfesionalesAdmin = () => {
  const [profesionales, setProfesionales] = useState([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  // Activar / desactivar (mismo patrón que Usuarios)
  const [modalEstadoAbierto, setModalEstadoAbierto] = useState(false);
  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState(null);

  // Form crear / editar
  const [modalFormAbierto, setModalFormAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [profesionalEditandoId, setProfesionalEditandoId] = useState(null);

  // Claves EXACTAS que espera el backend
  const formVacio = {
    name: "",
    documentType: "DNI",
    document: "",
    email: "",
    area: TEL_AREA_DEFAULT,
    numero: "",
    specialty: "",
    bio: "",
    googleCalendarId: "",
    password: "",
    cuilCuit: "",
  };
  const [formData, setFormData] = useState(formVacio);

  const [errorForm, setErrorForm] = useState("");
  const [cargandoForm, setCargandoForm] = useState(false);
  const [confirmDataProf, setConfirmDataProf] = useState(null); // persona existente a asociar

  const { user } = useAuth();
  const editable = puedeEditar(user?.role, "profesionales"); // recepción ve, no edita
  const banner = useBanner();
  const navigate = useNavigate();

  const ordenarPorEstadoYNombre = (lista) => {
    const nombre = (p) => (p.person?.name || p.name || "").toLowerCase();
    return [...lista].sort((a, b) => {
      if (Boolean(a.active) !== Boolean(b.active)) return a.active ? -1 : 1;
      return nombre(a).localeCompare(nombre(b));
    });
  };

  const obtenerProfesionales = async () => {
    try {
      const { data: datos } = await client.get("/professionals");
      setProfesionales(ordenarPorEstadoYNombre(datos));
    } catch (err) {
      setError(mensajeDeError(err) || "Error al traer profesionales");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    obtenerProfesionales();
  }, []);
 
  const abrirModalCrear = () => {
    setModoEdicion(false);
    setProfesionalEditandoId(null);
    setFormData(formVacio);
    setErrorForm("");
    setConfirmDataProf(null);
    setModalFormAbierto(true);
  };

  const abrirModalEditar = (p) => {
    setModoEdicion(true);
    setProfesionalEditandoId(p.id);
    setErrorForm("");
    setConfirmDataProf(null);
    const { area, numero } = partirTelefono(p.person?.phone || p.phone || "");
    setFormData({
      name: p.person?.name || p.name || "",
      documentType: p.person?.documentType || "DNI",
      document: p.person?.document || "",
      email: p.person?.email || p.email || "",
      area: area || TEL_AREA_DEFAULT,
      numero: numero || "",
      specialty: p.specialty || "",
      bio: p.bio || "",
      googleCalendarId: p.googleCalendarId || "",
      password: "",
      cuilCuit: p.person?.cuilCuit || "",
    });
    setModalFormAbierto(true);
  };

  const manejarGuardado = (e) => {
    e.preventDefault();
    doGuardarProf(false);
  };

  const doGuardarProf = async (confirmLink) => {
    setErrorForm("");
 
    const errTel = validarTelefono({ area: formData.area, numero: formData.numero });
    if (errTel) {
      setErrorForm(errTel);
      return;
    }
    const telefono = armarTelefono({ area: formData.area, numero: formData.numero, pais: TEL_PAIS });

    setCargandoForm(true);
    try {
      const url = modoEdicion
        ? `/professionals/${profesionalEditandoId}`
        : `/professionals`;

      let payload;
      if (modoEdicion) { 
        payload = {
          name: formData.name,
          documentType: formData.documentType,
          document: formData.document,
          phone: telefono,
          specialty: formData.specialty,
          bio: formData.bio,
          googleCalendarId: formData.googleCalendarId,
          cuilCuit: formData.cuilCuit,
        };
      } else { 
        const { area, numero, ...resto } = formData;
        payload = { ...resto, phone: telefono };
        if (!payload.bio) delete payload.bio;
        if (!payload.googleCalendarId) delete payload.googleCalendarId; 
        if (!payload.password) delete payload.password;
        if (confirmLink) payload.confirmLink = true;
      }

      if (modoEdicion) {
        await client.patch(url, payload);
      } else {
        await client.post(url, payload);
      }

      setConfirmDataProf(null);
      setModalFormAbierto(false);
      banner.success(modoEdicion ? "Profesional actualizado" : "Profesional creado", {
        details: [
          ["Nombre", payload.name],
          ["Especialidad", payload.specialty || "—"],
          ["Documento", `${DOC_LABEL[payload.documentType] || payload.documentType || ""} ${payload.document || ""}`.trim() || "—"],
          ["Teléfono", payload.phone || "—"],
          ["CUIL/CUIT", payload.cuilCuit || "—"],
          ["Acceso al sistema", !modoEdicion && payload.password ? "Sí (usuario creado)" : "—"],
        ],
      });
      obtenerProfesionales();
    } catch (err) {
      const datos = err.response?.data;
      if (datos?.needsConfirmation) {
        setConfirmDataProf(datos);
        return;
      }
      setErrorForm(mensajeDeError(err) || "Error al guardar.");
    } finally {
      setCargandoForm(false);
    }
  };
 
  const confirmarCambioEstado = (p) => {
    setProfesionalSeleccionado(p);
    setModalEstadoAbierto(true);
  };

  const ejecutarCambioEstado = async () => {
    try {
      const estaActivo = profesionalSeleccionado.active;
      await client.patch(`/professionals/${profesionalSeleccionado.id}`, { active: !estaActivo });

      setModalEstadoAbierto(false);
      const nombre = profesionalSeleccionado.person?.name || profesionalSeleccionado.name;
      banner[estaActivo ? "warning" : "success"](
        estaActivo ? "Profesional desactivado" : "Profesional reactivado",
        { details: [["Profesional", nombre]] }
      );
      obtenerProfesionales();
    } catch (err) {
      banner.error(mensajeDeError(err) || "No se pudo cambiar el estado");
    }
  };

  if (cargando)
    return <p style={{ textAlign: "center", marginTop: "50px" }}>Cargando profesionales...</p>;

  return (
    <div>
      <PageHeader
        title="Gestión de Profesionales"
        actions={editable ? <Button onClick={abrirModalCrear}>+ Nuevo Profesional</Button> : null}
      />

      {error && (
        <div style={{ backgroundColor: status.error.bg, border: "1px solid status.error.border", color: status.error.fg, borderRadius: "8px", padding: "12px 16px", marginBottom: "16px" }}>
          {error}
        </div>
      )}

      <Table headers={["Nombre", "Especialidad", "Contacto", "Estado", "Acciones"]}>
        {profesionales.map((p) => {
          const nombre = p.person?.name || p.name || "Sin nombre";
          const email = p.person?.email || p.email || "Sin email";
          const especialidad = p.specialty || "General";
          const tel = p.person?.phone || p.phone || "-";
          const estaActivo = p.active;

          return (
            <Tr key={p.id} style={!estaActivo ? { backgroundColor: colors.borderSoft, color: colors.textMuted } : undefined}>
              <Td>
                <span
                  style={{ color: colors.brand, cursor: "pointer" }}
                  onClick={() => navigate(`/admin/profesionales/${p.id}`)}
                >
                  <strong>{nombre}</strong>
                </span>
              </Td>
              <Td>{especialidad}</Td>
              <Td>
                <div style={{ display: "flex", flexDirection: "column", fontSize: "13px" }}>
                  <span>{email}</span>
                  <span style={{ color: colors.textSubtle }}>{tel}</span>
                </div>
              </Td>
              <Td>
                <span style={{ color: estaActivo ? status.success.strong : status.error.strong, fontWeight: "bold" }}>
                  {estaActivo ? "● Activo" : "○ Inactivo"}
                </span>
              </Td>
              <Td>
                <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                  <Button
                    style={{ padding: "6px 12px", fontSize: "12px", backgroundColor: colors.brand }}
                    onClick={() => navigate(`/admin/profesionales/${p.id}`)}
                  >
                    Ver
                  </Button>
                  {editable && (
                    <>
                      <Button
                        style={{ padding: "6px 12px", fontSize: "12px", backgroundColor: colors.textSubtle }}
                        onClick={() => abrirModalEditar(p)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant={estaActivo ? "danger" : "primary"}
                        style={{ padding: "6px 12px", fontSize: "12px", backgroundColor: estaActivo ? status.error.strong : status.success.strong, color: "#fff" }}
                        onClick={() => confirmarCambioEstado(p)}
                      >
                        {estaActivo ? "Desactivar" : "Activar"}
                      </Button>
                    </>
                  )}
                </div>
              </Td>
            </Tr>
          );
        })}
      </Table>
 
      <Modal
        isOpen={modalFormAbierto}
        onClose={() => setModalFormAbierto(false)}
        title={modoEdicion ? "Editar Profesional" : "Crear Nuevo Profesional"}
      >
        <form autoComplete="off" onSubmit={manejarGuardado} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {confirmDataProf && (
            <div style={{ border: "1px solid #fde047", background: status.warning.soft, color: status.warning.fg, borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 14, marginBottom: 8 }}>{confirmDataProf.mensaje}</div>
              {confirmDataProf.person && (
                <div style={{ fontSize: 12, marginBottom: 10 }}>
                  {confirmDataProf.person.name} · {confirmDataProf.person.email || "sin email"}
                  {confirmDataProf.person.isPatient ? " · ya es paciente" : ""}
                  {confirmDataProf.person.isUser ? " · ya es usuario" : ""}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Button type="button" style={{ backgroundColor: colors.border, color: colors.textSecondary }} onClick={() => setConfirmDataProf(null)}>
                  No, revisar
                </Button>
                <Button type="button" disabled={cargandoForm} onClick={() => doGuardarProf(true)}>
                  {cargandoForm ? "Asociando..." : "Sí, asociar como profesional"}
                </Button>
              </div>
            </div>
          )}
          <Input
            type="text" placeholder="Nombre completo" autoComplete="off"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div style={{ display: "flex", gap: "10px" }}>
            <select
              value={formData.documentType}
              onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
              style={{ padding: "10px", borderRadius: "5px", border: "1px solid colors.line" }}
            >
              {TIPOS_DOC.map((t) => <option key={t} value={t}>{DOC_LABEL[t]}</option>)}
            </select>
            <div style={{ flex: 1 }}>
              <Input
                type="text" placeholder="N° de documento" autoComplete="off"
                value={formData.document}
                onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                required
              />
            </div>
          </div>

          <Input
            type="email" placeholder="Email" autoComplete="new-email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required={!modoEdicion}
            disabled={modoEdicion}
          />

          <div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <span style={{ color: colors.textSubtle, fontSize: 14 }}>+{TEL_PAIS}</span>
              <input
                type="text" inputMode="numeric" placeholder="Área" autoComplete="off"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                maxLength={4}
                style={{ padding: "10px", borderRadius: "5px", border: "1px solid colors.line", width: 80, boxSizing: "border-box" }}
                required
              />
              <div style={{ flex: 1 }}>
                <Input
                  type="text" inputMode="numeric" placeholder="Número (sin 0 ni 15)" autoComplete="off"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  required
                />
              </div>
            </div>
            <span style={{ fontSize: 11, color: colors.textMuted }}>
              Se guarda como {armarTelefono({ area: formData.area, numero: formData.numero, pais: TEL_PAIS }) || "—"} para WhatsApp.
            </span>
          </div>

          <Input
            type="text" placeholder="CUIL/CUIT (opcional)" autoComplete="off"
            value={formData.cuilCuit}
            onChange={(e) => setFormData({ ...formData, cuilCuit: e.target.value })}
          />

          <Input
            type="text" placeholder="Especialidad" autoComplete="off"
            value={formData.specialty}
            onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
            required
          />

          <textarea
            placeholder="Bio (opcional)"
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            rows={3}
            style={{ width: "100%", boxSizing: "border-box", padding: "10px", borderRadius: "5px", border: "1px solid colors.line", fontFamily: "inherit", resize: "vertical" }}
          />

          <Input
            type="text" placeholder="Google Calendar ID (opcional)" autoComplete="off"
            value={formData.googleCalendarId}
            onChange={(e) => setFormData({ ...formData, googleCalendarId: e.target.value })}
          />

          {!modoEdicion && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <Input
                type="password" placeholder="Contraseña (opcional · crea acceso al sistema)" autoComplete="new-password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <span style={{ fontSize: 11, color: colors.textMuted }}>
                Dejala vacía para registrar al profesional sin acceso al sistema.
                Si cargás una contraseña, además se le crea el usuario para iniciar sesión.
              </span>
            </div>
          )}

          {errorForm && (
            <div style={{ backgroundColor: status.error.bg, border: "1px solid status.error.border", color: status.error.fg, borderRadius: "6px", padding: "10px 12px", fontSize: "13px" }}>
              {errorForm}
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <Button type="button" style={{ backgroundColor: colors.border, color: colors.textSecondary }} onClick={() => setModalFormAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit">{cargandoForm ? "Guardando..." : "Guardar"}</Button>
          </div>
        </form>
      </Modal>


      <Modal isOpen={modalEstadoAbierto} onClose={() => setModalEstadoAbierto(false)} title="Confirmar Acción">
        <p>
          ¿Seguro que deseas {profesionalSeleccionado?.active ? "desactivar" : "activar"} a{" "}
          {profesionalSeleccionado?.person?.name || profesionalSeleccionado?.name}?
        </p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
          <Button type="button" style={{ backgroundColor: colors.border, color: colors.textSecondary }} onClick={() => setModalEstadoAbierto(false)}>
            Cancelar
          </Button>
          <Button variant={profesionalSeleccionado?.active ? "danger" : "primary"} onClick={ejecutarCambioEstado}>
            Sí, {profesionalSeleccionado?.active ? "desactivar" : "activar"}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default ProfesionalesAdmin;
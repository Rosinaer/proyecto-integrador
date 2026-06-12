import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Tr, Td } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../hooks/useAuth";
import { useBanner } from "../../components/ui/Banner";
import { PageHeader } from "../../components/ui/PageHeader";

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
    phone: "",
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

  const { token } = useAuth();
  const banner = useBanner();
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

  // Primero los activos, luego los inactivos; alfabético dentro de cada grupo.
  const ordenarPorEstadoYNombre = (lista) => {
    const nombre = (p) => (p.person?.name || p.name || "").toLowerCase();
    return [...lista].sort((a, b) => {
      if (Boolean(a.active) !== Boolean(b.active)) return a.active ? -1 : 1;
      return nombre(a).localeCompare(nombre(b));
    });
  };

  const obtenerProfesionales = async () => {
    try {
      const respuesta = await fetch(`${apiUrl}/professionals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error || "Error al traer profesionales");
      setProfesionales(ordenarPorEstadoYNombre(datos));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    obtenerProfesionales();
  }, []);

  // ── Crear / editar ──
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
    setFormData({
      name: p.person?.name || p.name || "",
      documentType: p.person?.documentType || "DNI",
      document: p.person?.document || "",
      email: p.person?.email || p.email || "",
      phone: p.person?.phone || p.phone || "",
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
    setCargandoForm(true);
    try {
      const url = modoEdicion
        ? `${apiUrl}/professionals/${profesionalEditandoId}`
        : `${apiUrl}/professionals`;
      const method = modoEdicion ? "PATCH" : "POST";

      let payload;
      if (modoEdicion) {
        // En edición no se manda email ni password (el backend no los toca acá)
        payload = {
          name: formData.name,
          documentType: formData.documentType,
          document: formData.document,
          phone: formData.phone,
          specialty: formData.specialty,
          bio: formData.bio,
          googleCalendarId: formData.googleCalendarId,
          cuilCuit: formData.cuilCuit,
        };
      } else {
        payload = { ...formData };
        if (!payload.bio) delete payload.bio;
        if (!payload.googleCalendarId) delete payload.googleCalendarId;
        if (confirmLink) payload.confirmLink = true;
      }

      const respuesta = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const datos = await respuesta.json();

      // La persona ya existe (otro rol): pedimos confirmación en vez de cortar.
      if (!respuesta.ok && datos.needsConfirmation) {
        setConfirmDataProf(datos);
        return;
      }
      if (!respuesta.ok) throw new Error(datos.mensaje || datos.error || "Error al guardar.");

      setConfirmDataProf(null);
      setModalFormAbierto(false);
      banner.success(modoEdicion ? "Profesional actualizado" : "Profesional creado", {
        details: [
          ["Nombre", payload.name],
          ["Especialidad", payload.specialty || "—"],
          ["Documento", `${DOC_LABEL[payload.documentType] || payload.documentType || ""} ${payload.document || ""}`.trim() || "—"],
          ["Teléfono", payload.phone || "—"],
          ["CUIL/CUIT", payload.cuilCuit || "—"],
        ],
      });
      obtenerProfesionales();
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setCargandoForm(false);
    }
  };

  // ── Activar / desactivar ──
  const confirmarCambioEstado = (p) => {
    setProfesionalSeleccionado(p);
    setModalEstadoAbierto(true);
  };

  const ejecutarCambioEstado = async () => {
    try {
      const estaActivo = profesionalSeleccionado.active;
      const respuesta = await fetch(`${apiUrl}/professionals/${profesionalSeleccionado.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ active: !estaActivo }),
      });

      if (!respuesta.ok) {
        const datos = await respuesta.json();
        throw new Error(datos.mensaje || datos.error || "No se pudo cambiar el estado");
      }

      setModalEstadoAbierto(false);
      const nombre = profesionalSeleccionado.person?.name || profesionalSeleccionado.name;
      banner[estaActivo ? "warning" : "success"](
        estaActivo ? "Profesional desactivado" : "Profesional reactivado",
        { details: [["Profesional", nombre]] }
      );
      obtenerProfesionales();
    } catch (err) {
      banner.error(err.message);
    }
  };

  if (cargando)
    return <p style={{ textAlign: "center", marginTop: "50px" }}>Cargando profesionales...</p>;

  return (
    <div>
      <PageHeader
        title="Gestión de Profesionales"
        actions={<Button onClick={abrirModalCrear}>+ Nuevo Profesional</Button>}
      />

      {error && (
        <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px" }}>
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
            <Tr key={p.id} style={!estaActivo ? { backgroundColor: "#f1f5f9", color: "#94a3b8" } : undefined}>
              <Td>
                <span
                  style={{ color: "#6b21a8", cursor: "pointer" }}
                  onClick={() => navigate(`/admin/profesionales/${p.id}`)}
                >
                  <strong>{nombre}</strong>
                </span>
              </Td>
              <Td>{especialidad}</Td>
              <Td>
                <div style={{ display: "flex", flexDirection: "column", fontSize: "13px" }}>
                  <span>{email}</span>
                  <span style={{ color: "#64748b" }}>{tel}</span>
                </div>
              </Td>
              <Td>
                <span style={{ color: estaActivo ? "#16a34a" : "#d32f2f", fontWeight: "bold" }}>
                  {estaActivo ? "● Activo" : "○ Inactivo"}
                </span>
              </Td>
              <Td>
                <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                  <Button
                    style={{ padding: "6px 12px", fontSize: "12px", backgroundColor: "#8b5cf6" }}
                    onClick={() => navigate(`/admin/profesionales/${p.id}`)}
                  >
                    Ver
                  </Button>
                  <Button
                    style={{ padding: "6px 12px", fontSize: "12px", backgroundColor: "#64748b" }}
                    onClick={() => abrirModalEditar(p)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant={estaActivo ? "danger" : "primary"}
                    style={{ padding: "6px 12px", fontSize: "12px", backgroundColor: estaActivo ? "#d32f2f" : "#16a34a", color: "#fff" }}
                    onClick={() => confirmarCambioEstado(p)}
                  >
                    {estaActivo ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              </Td>
            </Tr>
          );
        })}
      </Table>

      {/* ── Modal Crear / Editar ── */}
      <Modal
        isOpen={modalFormAbierto}
        onClose={() => setModalFormAbierto(false)}
        title={modoEdicion ? "Editar Profesional" : "Crear Nuevo Profesional"}
      >
        <form autoComplete="off" onSubmit={manejarGuardado} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {confirmDataProf && (
            <div style={{ border: "1px solid #fde047", background: "#fef9c3", color: "#854d0e", borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 14, marginBottom: 8 }}>{confirmDataProf.mensaje}</div>
              {confirmDataProf.person && (
                <div style={{ fontSize: 12, marginBottom: 10 }}>
                  {confirmDataProf.person.name} · {confirmDataProf.person.email || "sin email"}
                  {confirmDataProf.person.isPatient ? " · ya es paciente" : ""}
                  {confirmDataProf.person.isUser ? " · ya es usuario" : ""}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Button type="button" style={{ backgroundColor: "#e2e8f0", color: "#475569" }} onClick={() => setConfirmDataProf(null)}>
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
              style={{ padding: "10px", borderRadius: "5px", border: "1px solid #cbd5e1" }}
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

          <Input
            type="text" placeholder="Teléfono" autoComplete="off"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />

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
            style={{ width: "100%", boxSizing: "border-box", padding: "10px", borderRadius: "5px", border: "1px solid #cbd5e1", fontFamily: "inherit", resize: "vertical" }}
          />

          <Input
            type="text" placeholder="Google Calendar ID (opcional)" autoComplete="off"
            value={formData.googleCalendarId}
            onChange={(e) => setFormData({ ...formData, googleCalendarId: e.target.value })}
          />

          {!modoEdicion && (
            <Input
              type="password" placeholder="Contraseña" autoComplete="new-password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          )}

          {errorForm && (
            <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", borderRadius: "6px", padding: "10px 12px", fontSize: "13px" }}>
              {errorForm}
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <Button type="button" style={{ backgroundColor: "#e2e8f0", color: "#475569" }} onClick={() => setModalFormAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit">{cargandoForm ? "Guardando..." : "Guardar"}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal Activar / Desactivar ── */}
      <Modal isOpen={modalEstadoAbierto} onClose={() => setModalEstadoAbierto(false)} title="Confirmar Acción">
        <p>
          ¿Seguro que deseas {profesionalSeleccionado?.active ? "desactivar" : "activar"} a{" "}
          {profesionalSeleccionado?.person?.name || profesionalSeleccionado?.name}?
        </p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
          <Button type="button" style={{ backgroundColor: "#e2e8f0", color: "#475569" }} onClick={() => setModalEstadoAbierto(false)}>
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
import { useState, useEffect } from "react";
import { Table, Tr, Td } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../hooks/useAuth";
import { useBanner } from "../../components/ui/Banner";
 
const ROLES = [
  { value: "RECEPTIONIST", label: "Recepcionista" },
  { value: "ADMIN", label: "Administrador" },
  { value: "PROFESSIONAL", label: "Profesional" },
];

const selectStyle = { padding: "10px", borderRadius: "5px", border: "1px solid #cbd5e1", width: "100%" };

const VACIO_USER = {
  nombre: "", email: "", password: "", rol: "RECEPTIONIST",
  document: "", documentType: "DNI", specialty: "", bio: "",
};

const UsuariosAdmin = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  const [modalEstadoAbierto, setModalEstadoAbierto] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);

  const [modalFormAbierto, setModalFormAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [usuarioEditandoId, setUsuarioEditandoId] = useState(null);
  const [formData, setFormData] = useState(VACIO_USER);
  const [errorForm, setErrorForm] = useState("");
  const [cargandoForm, setCargandoForm] = useState(false);
 
  const [docVerificado, setDocVerificado] = useState(false);
  const [verificandoDoc, setVerificandoDoc] = useState(false);
  const [resultadoDoc, setResultadoDoc] = useState(null); // { existe, tieneUser, esPaciente, esProfesional, persona }

  const { token } = useAuth();
  const banner = useBanner();
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

  const ordenarPorEstadoYNombre = (lista) => {
    const esActivo = (x) => Boolean(x.active ?? x.activo);
    const nombre = (x) => (x.nombre || x.person?.name || x.name || "").toLowerCase();
    return [...lista].sort((a, b) => {
      if (esActivo(a) !== esActivo(b)) return esActivo(a) ? -1 : 1;
      return nombre(a).localeCompare(nombre(b));
    });
  };

  const obtenerUsuarios = async () => {
    try {
      const respuesta = await fetch(`${apiUrl}/users`, { headers: { Authorization: `Bearer ${token}` } });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error || "Error al traer usuarios");
      setUsuarios(ordenarPorEstadoYNombre(datos));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { obtenerUsuarios(); }, []);

  const resetForm = () => {
    setFormData(VACIO_USER);
    setErrorForm("");
    setDocVerificado(false);
    setResultadoDoc(null);
    setVerificandoDoc(false);
  };

  const abrirModalCrear = () => {
    setModoEdicion(false);
    setUsuarioEditandoId(null);
    resetForm();
    setModalFormAbierto(true);
  };

  const abrirModalEditar = async (u) => {
    setModoEdicion(true);
    setUsuarioEditandoId(u.id);
    setErrorForm("");
    setDocVerificado(true);    
    setResultadoDoc(null); 
    setFormData({
      nombre: u.nombre || u.person?.name || u.name || "",
      email: u.email || u.person?.email || "",
      password: "",
      rol: u.rol || u.role,
      document: u.person?.document || u.document || "",
      documentType: u.person?.documentType || u.documentType || "DNI",
      specialty: "",
      bio: "",
    });
    setModalFormAbierto(true);
 
    try {
      const res = await fetch(`${apiUrl}/users/${u.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setFormData((f) => ({
          ...f,
          nombre: data.nombre ?? f.nombre,
          email: data.email ?? f.email,
          rol: data.rol ?? f.rol,
          specialty: data.specialty ?? f.specialty,
          bio: data.bio ?? f.bio,
        }));
      }
    } catch {
      /* si falla, queda lo de la fila y el usuario puede recompletar */
    }
  };
 
  const cambiarDocumento = (campo, valor) => {
    setFormData((f) => ({ ...f, [campo]: valor }));
    if (!modoEdicion) {
      setDocVerificado(false);
      setResultadoDoc(null);
    }
  };

  const verificarDoc = async () => {
    setErrorForm("");
    setVerificandoDoc(true);
    try {
      const q = new URLSearchParams({ documentType: formData.documentType, document: formData.document.trim() });
      const res = await fetch(`${apiUrl}/users/check-document?${q}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje || data.error || "No se pudo verificar el documento");

      setResultadoDoc(data);
      setDocVerificado(true);
 
      if (data.existe && !data.tieneUser && data.persona) {
        setFormData((f) => ({
          ...f,
          nombre: data.persona.name || f.nombre,
          email: data.persona.email || f.email,
          specialty: data.persona.specialty || f.specialty,
          bio: data.persona.bio || f.bio,
        }));
      }
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setVerificandoDoc(false);
    }
  };

  const manejarGuardado = (e) => {
    e.preventDefault();
    doGuardarUsuario();
  };

  const doGuardarUsuario = async () => {
    setErrorForm("");
    setCargandoForm(true);
    try {
      const url = modoEdicion ? `${apiUrl}/users/${usuarioEditandoId}` : `${apiUrl}/users`;
      const method = modoEdicion ? "PATCH" : "POST";

      const payload = {
        nombre: formData.nombre,
        email: formData.email,
        rol: formData.rol,
        document: formData.document,
        documentType: formData.documentType,
      };
      if (formData.password) payload.password = formData.password;
      if (formData.rol === "PROFESSIONAL") {
        payload.specialty = formData.specialty;
        payload.bio = formData.bio;
      } 
      if (!modoEdicion && resultadoDoc?.existe && !resultadoDoc?.tieneUser) {
        payload.confirmLink = true;
      }

      const respuesta = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.mensaje || datos.error || "Error al guardar");

      const rolLabel = ROLES.find((r) => r.value === formData.rol)?.label || formData.rol;
      banner.success(modoEdicion ? "Usuario actualizado" : "Usuario creado", {
        details: [
          ["Nombre", formData.nombre],
          ["Email", formData.email],
          ["Rol", rolLabel],
        ],
      });

      setModalFormAbierto(false);
      obtenerUsuarios();
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setCargandoForm(false);
    }
  };

  const confirmarCambioEstado = (u) => {
    setUsuarioSeleccionado(u);
    setModalEstadoAbierto(true);
  };

  const ejecutarCambioEstado = async () => {
    try {
      const estaActivo = usuarioSeleccionado.active || usuarioSeleccionado.activo;
      const endpoint = estaActivo ? "deactivate" : "activate";
      const respuesta = await fetch(`${apiUrl}/users/${usuarioSeleccionado.id}/${endpoint}`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}` },
      });
      if (!respuesta.ok) throw new Error(`No se pudo ${estaActivo ? "desactivar" : "activar"} al usuario`);
      setModalEstadoAbierto(false);
      obtenerUsuarios();
    } catch (err) {
      alert(err.message);
    }
  };

  if (cargando) return <p style={{ textAlign: "center", marginTop: "50px" }}>Cargando usuarios...</p>;

  const docCargado = formData.document.trim().length > 0;
  const bloqueadoPorUser = !!(resultadoDoc?.existe && resultadoDoc?.tieneUser);
  const puedeCompletar = modoEdicion || (docVerificado && !bloqueadoPorUser);
  const esProfesional = formData.rol === "PROFESSIONAL";

  return (
    <div>
      <PageHeader
        title="Gestión de Usuarios"
        actions={<Button onClick={abrirModalCrear}>+ Nuevo Usuario</Button>}
      />

      {error && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", borderRadius: 8, padding: "10px 16px", fontSize: 13, marginBottom: 14 }}>{error}</div>}

      <Table headers={["Nombre", "Email", "Rol", "Estado", "Acciones"]}>
        {usuarios.map((u) => {
          const estaActivo = u.active || u.activo;
          return (
            <Tr key={u.id} style={!estaActivo ? { backgroundColor: "#f1f5f9", color: "#94a3b8" } : undefined}>
              <Td>{u.nombre || u.person?.name || u.name}</Td>
              <Td>{u.email || u.person?.email}</Td>
              <Td>
                <span style={{ padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold", backgroundColor: "#6b21a815", color: "#6b21a8" }}>
                  {u.rol || u.role}
                </span>
              </Td>
              <Td>
                <span style={{ color: estaActivo ? "#16a34a" : "#d32f2f", fontWeight: "bold" }}>
                  {estaActivo ? "● Activo" : "○ Inactivo"}
                </span>
              </Td>
              <Td>
                <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                  <Button style={{ padding: "6px 12px", fontSize: "12px", backgroundColor: "#64748b" }} onClick={() => abrirModalEditar(u)}>Editar</Button>
                  <Button
                    variant={estaActivo ? "danger" : "primary"}
                    style={{ padding: "6px 12px", fontSize: "12px", backgroundColor: estaActivo ? "#d32f2f" : "#16a34a", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    onClick={() => confirmarCambioEstado(u)}
                  >
                    {estaActivo ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              </Td>
            </Tr>
          );
        })}
      </Table>

      <Modal isOpen={modalFormAbierto} onClose={() => setModalFormAbierto(false)} title={modoEdicion ? "Editar Usuario" : "Crear Nuevo Usuario"}>
        <form autoComplete="off" onSubmit={manejarGuardado} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
 
          {!modoEdicion && (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 14px" }}>
              <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 6 }}>
                1 · Documento de la persona
              </label>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <select
                  value={formData.documentType}
                  onChange={(e) => cambiarDocumento("documentType", e.target.value)}
                  style={{ ...selectStyle, width: "auto" }}
                >
                  <option value="DNI">DNI</option>
                  <option value="PASSPORT">Pasaporte</option>
                  <option value="OTHER">Otro</option>
                </select>
                <div style={{ flex: 1 }}>
                  <Input
                    type="text" placeholder="N° de documento" autoComplete="off"
                    value={formData.document}
                    onChange={(e) => cambiarDocumento("document", e.target.value)}
                  />
                </div>
                <Button type="button" onClick={verificarDoc} disabled={!docCargado || verificandoDoc || docVerificado}>
                  {verificandoDoc ? "Verificando…" : docVerificado ? "✓ Verificado" : "Verificar"}
                </Button>
              </div> 
              {docVerificado && resultadoDoc && (
                <div style={{ marginTop: 10, fontSize: 13 }}>
                  {bloqueadoPorUser ? (
                    <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", borderRadius: 8, padding: "10px 12px" }}>
                      <strong>{resultadoDoc.persona?.name}</strong> ya tiene un usuario asociado. No se puede crear otro con el mismo documento. Si necesitás cambiar sus datos, editá ese usuario desde la lista.
                    </div>
                  ) : resultadoDoc.existe ? (
                    <div style={{ background: "#fef9c3", border: "1px solid #fde047", color: "#854d0e", borderRadius: 8, padding: "10px 12px" }}>
                      Encontramos a <strong>{resultadoDoc.persona?.name}</strong> ({resultadoDoc.persona?.email || "sin email"})
                      {resultadoDoc.esPaciente ? " · es paciente" : ""}
                      {resultadoDoc.esProfesional ? " · ya tiene ficha de profesional" : ""}.
                      <br />Le vamos a crear el acceso. Completá lo que falta.
                    </div>
                  ) : (
                    <div style={{ background: "#f0fdf4", border: "1px solid #86efac", color: "#166534", borderRadius: 8, padding: "10px 12px" }}>
                      Documento libre. Completá los datos del nuevo usuario.
                    </div>
                  )}
                </div>
              )}
              {!docVerificado && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>
                  Verificá el documento para continuar con el alta.
                </div>
              )}
            </div>
          )}

          {errorForm && (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
              {errorForm}
            </div>
          )} 
          {puedeCompletar && (
            <>
              {!modoEdicion && (
                <label style={{ fontSize: 12, color: "#64748b", marginBottom: -6 }}>2 · Datos del usuario</label>
              )}
              <Input type="text" placeholder="Nombre completo" autoComplete="off" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} required />
              <Input type="email" placeholder="Email" autoComplete="new-email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              <Input type="password" placeholder={modoEdicion ? "Contraseña (dejar vacío para no cambiar)" : "Contraseña"} autoComplete="new-password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required={!modoEdicion} />

              <select value={formData.rol} onChange={(e) => setFormData({ ...formData, rol: e.target.value })} style={selectStyle}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
 
              {esProfesional && (
                <div style={{ background: "#f8f4ff", border: "1px solid #e9d5ff", borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontSize: 12, color: "#6b21a8", fontWeight: "bold" }}>Ficha de profesional</div>
                  <Input type="text" placeholder="Especialidad (ej. Cosmetología)" autoComplete="off" value={formData.specialty} onChange={(e) => setFormData({ ...formData, specialty: e.target.value })} required />
                  <textarea
                    placeholder="Bio (opcional)"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={3}
                    style={{ padding: "10px", borderRadius: "5px", border: "1px solid #cbd5e1", fontFamily: "inherit", fontSize: 14, resize: "vertical" }}
                  />
                  {resultadoDoc?.esProfesional && (
                    <div style={{ fontSize: 12, color: "#7c3aed" }}>
                      Esta persona ya tiene ficha de profesional: se vincula a la existente.
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: 4 }}>
            <Button type="button" style={{ backgroundColor: "#e2e8f0", color: "#475569" }} onClick={() => setModalFormAbierto(false)}>Cancelar</Button>
            <Button type="submit" disabled={!puedeCompletar || cargandoForm}>
              {cargandoForm ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={modalEstadoAbierto} onClose={() => setModalEstadoAbierto(false)} title="Confirmar Acción">
        <p>¿Seguro que deseas {usuarioSeleccionado?.active || usuarioSeleccionado?.activo ? "desactivar" : "activar"} a {usuarioSeleccionado?.nombre || usuarioSeleccionado?.person?.name}?</p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
          <Button type="button" style={{ backgroundColor: "#e2e8f0", color: "#475569" }} onClick={() => setModalEstadoAbierto(false)}>Cancelar</Button>
          <Button variant={usuarioSeleccionado?.active || usuarioSeleccionado?.activo ? "danger" : "primary"} onClick={ejecutarCambioEstado}>
            Sí, {usuarioSeleccionado?.active || usuarioSeleccionado?.activo ? "desactivar" : "activar"}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default UsuariosAdmin;
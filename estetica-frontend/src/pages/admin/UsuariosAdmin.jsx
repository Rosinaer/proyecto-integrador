import { useState, useEffect } from "react";
import { Table, Tr, Td } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../hooks/useAuth";

const UsuariosAdmin = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  
  // Cambiamos el estado de "Eliminar" a "Cambio de Estado"
  const [modalEstadoAbierto, setModalEstadoAbierto] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);

  const [modalFormAbierto, setModalFormAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [usuarioEditandoId, setUsuarioEditandoId] = useState(null);
  const [formData, setFormData] = useState({ nombre: "", email: "", password: "", rol: "RECEPTIONIST" });
  const [errorForm, setErrorForm] = useState("");
  const [cargandoForm, setCargandoForm] = useState(false);

  const { token } = useAuth(); 
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

  const obtenerUsuarios = async () => {
    try {
      const respuesta = await fetch(`${apiUrl}/users`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error || "Error al traer usuarios");
      setUsuarios(datos);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { obtenerUsuarios(); }, []);

  const abrirModalCrear = () => {
    setModoEdicion(false);
    setUsuarioEditandoId(null);
    setFormData({ nombre: "", email: "", password: "", rol: "RECEPTIONIST" });
    setModalFormAbierto(true);
  };

  const abrirModalEditar = (u) => {
    setModoEdicion(true);
    setUsuarioEditandoId(u.id);
    setFormData({ 
      nombre: u.nombre || u.person?.name || u.name || "", 
      email: u.email || u.person?.email || "", 
      password: "", 
      rol: u.rol || u.role 
    });
    setModalFormAbierto(true);
  };

  const manejarGuardado = async (e) => {
    e.preventDefault();
    setErrorForm("");
    setCargandoForm(true);
    try {
      const url = modoEdicion ? `${apiUrl}/users/${usuarioEditandoId}` : `${apiUrl}/users`;
      const method = modoEdicion ? "PATCH" : "POST";
      const payload = { ...formData };
      if (modoEdicion && !payload.password) delete payload.password;

      const respuesta = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!respuesta.ok) {
        const datos = await respuesta.json();
        throw new Error(datos.mensaje || datos.error || "Error al guardar");
      }

      setModalFormAbierto(false);
      obtenerUsuarios(); 
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setCargandoForm(false);
    }
  };

  // Función que abre el modal para activar/desactivar
  const confirmarCambioEstado = (u) => {
    setUsuarioSeleccionado(u);
    setModalEstadoAbierto(true);
  };

  // Función que le pega a los endpoints correctos de desactivación/activación (PATCH)
  const ejecutarCambioEstado = async () => {
    try {
      const estaActivo = usuarioSeleccionado.active || usuarioSeleccionado.activo;
      const endpoint = estaActivo ? "deactivate" : "activate";
      
      const respuesta = await fetch(`${apiUrl}/users/${usuarioSeleccionado.id}/${endpoint}`, {
        method: 'PATCH',
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (!respuesta.ok) throw new Error(`No se pudo ${estaActivo ? "desactivar" : "activar"} al usuario`);
      
      setModalEstadoAbierto(false);
      obtenerUsuarios();
    } catch (err) {
      alert(err.message);
    }
  };

  if (cargando) return <p style={{ textAlign: 'center', marginTop: '50px' }}>Cargando usuarios...</p>;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: '#6b21a8' }}>Gestión de Usuarios</h2>
        <Button onClick={abrirModalCrear}>+ Nuevo Usuario</Button>
      </div>

      <Table headers={["Nombre", "Email", "Rol", "Estado", "Acciones"]}>
        {usuarios.map((u) => {
          const estaActivo = u.active || u.activo;
          
          return (
            <Tr key={u.id}>
              <Td>{u.nombre || u.person?.name || u.name}</Td>
              <Td>{u.email || u.person?.email}</Td>
              <Td>
                <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#6b21a815', color: '#6b21a8' }}>
                  {u.rol || u.role}
                </span>
              </Td>
              <Td>
                <span style={{ color: estaActivo ? '#16a34a' : '#d32f2f', fontWeight: 'bold' }}>
                  {estaActivo ? '● Activo' : '○ Inactivo'}
                </span>
              </Td>
              <Td>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <Button style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#64748b' }} onClick={() => abrirModalEditar(u)}>Editar</Button>
                  
                  {/* Botón dinámico: Desactivar o Activar */}
                  <Button 
                    variant={estaActivo ? "danger" : "primary"} 
                    style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: estaActivo ? '#d32f2f' : '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }} 
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
        {/* Agregamos autoComplete="off" al formulario para bloquear las sugerencias de Chrome */}
        <form autoComplete="off" onSubmit={manejarGuardado} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          <Input type="text" placeholder="Nombre completo" autoComplete="off" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} required />
          <Input type="email" placeholder="Email" autoComplete="new-email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
          <Input type="password" placeholder={modoEdicion ? "Contraseña (dejar vacío para no cambiar)" : "Contraseña"} autoComplete="new-password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required={!modoEdicion} />
          
          <select value={formData.rol} onChange={(e) => setFormData({...formData, rol: e.target.value})} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #cbd5e1' }}>
            <option value="RECEPTIONIST">Recepcionista</option>
            <option value="ADMIN">Administrador</option>
            <option value="PROFESSIONAL">Profesional</option>
            <option value="PATIENT">Paciente</option>
          </select>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button type="button" style={{ backgroundColor: '#e2e8f0', color: '#475569' }} onClick={() => setModalFormAbierto(false)}>Cancelar</Button>
            <Button type="submit">{cargandoForm ? "Guardando..." : "Guardar"}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={modalEstadoAbierto} onClose={() => setModalEstadoAbierto(false)} title="Confirmar Acción">
        <p>¿Seguro que deseas {usuarioSeleccionado?.active || usuarioSeleccionado?.activo ? "desactivar" : "activar"} a {usuarioSeleccionado?.nombre || usuarioSeleccionado?.person?.name}?</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <Button type="button" style={{ backgroundColor: '#e2e8f0', color: '#475569' }} onClick={() => setModalEstadoAbierto(false)}>Cancelar</Button>
          <Button variant={usuarioSeleccionado?.active || usuarioSeleccionado?.activo ? "danger" : "primary"} onClick={ejecutarCambioEstado}>
            Sí, {usuarioSeleccionado?.active || usuarioSeleccionado?.activo ? "desactivar" : "activar"}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default UsuariosAdmin;
import { useState, useEffect } from "react";
import { Table, Tr, Td } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../hooks/useAuth";

const ProfesionalesAdmin = () => {
  const [profesionales, setProfesionales] = useState([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false);
  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState(null);
  const [modalFormAbierto, setModalFormAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [profesionalEditandoId, setProfesionalEditandoId] = useState(null);
  
  const [formData, setFormData] = useState({ 
    nombre: "", 
    especialidad: "", 
    email: "", 
    telefono: "" 
  });
  
  const [errorForm, setErrorForm] = useState("");
  const [cargandoForm, setCargandoForm] = useState(false);

  const { token } = useAuth(); 
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

  const obtenerProfesionales = async () => {
    try {
      const respuesta = await fetch(`${apiUrl}/professionals`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const datos = await respuesta.json();
      console.log("Datos recibidos:", datos);
      if (!respuesta.ok) throw new Error(datos.error || "Error al traer profesionales");
      setProfesionales(datos);
    } catch (err) {
      setError(err.message);
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
    setFormData({ nombre: "", especialidad: "", email: "", telefono: "" });
    setModalFormAbierto(true);
  };

  const abrirModalEditar = (p) => {
    setModoEdicion(true);
    setProfesionalEditandoId(p.id);
    setFormData({ 
      nombre: p.nombre || p.name || p.person?.name || p.user?.person?.name || "", 
      especialidad: p.especialidad || p.specialty || "", 
      email: p.email || p.person?.email || p.user?.person?.email || "", 
      telefono: p.telefono || p.phone || p.person?.phone || "" 
    });
    setModalFormAbierto(true);
  };

  const manejarGuardado = async (e) => {
    e.preventDefault();
    setErrorForm("");
    setCargandoForm(true);
    try {
      const url = modoEdicion ? `${apiUrl}/professionals/${profesionalEditandoId}` : `${apiUrl}/professionals`;
      const method = modoEdicion ? "PATCH" : "POST";
      const respuesta = await fetch(url, {
        method: method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify(formData),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.mensaje || datos.error || "Error al guardar.");
      setModalFormAbierto(false);
      obtenerProfesionales(); 
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setCargandoForm(false);
    }
  };

  const ejecutarEliminacion = async () => {
    try {
      const respuesta = await fetch(`${apiUrl}/professionals/${profesionalSeleccionado.id}`, {
        method: 'DELETE',
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!respuesta.ok) throw new Error("No se pudo eliminar");
      setModalEliminarAbierto(false);
      obtenerProfesionales();
    } catch (err) {
      alert(err.message);
    }
  };

  if (cargando) return <p style={{ textAlign: 'center', marginTop: '50px' }}>Cargando profesionales...</p>;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: '#6b21a8' }}>Gestión de Profesionales</h2>
        <Button onClick={abrirModalCrear}>+ Nuevo Profesional</Button>
      </div>

      <Table headers={["Nombre", "Especialidad", "Contacto", "Acciones"]}>
        {profesionales.map((p) => {
          const nombre = p.nombre || p.name || p.person?.name || p.user?.person?.name || "Sin nombre";
          const email = p.email || p.person?.email || p.user?.person?.email || "Sin email";
          const especialidad = p.especialidad || p.specialty || "General";
          const tel = p.telefono || p.phone || p.person?.phone || "-";

          return (
            <Tr key={p.id}>
              <Td><strong>{nombre}</strong></Td>
              <Td>{especialidad}</Td>
              <Td>
                <div style={{ display: 'flex', flexDirection: 'column', fontSize: '13px' }}>
                  <span>{email}</span>
                  <span style={{ color: '#64748b' }}>{tel}</span>
                </div>
              </Td>
              <Td>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <Button style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#64748b' }} onClick={() => abrirModalEditar(p)}>Editar</Button>
                  <Button variant="danger" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => { setProfesionalSeleccionado(p); setModalEliminarAbierto(true); }}>Eliminar</Button>
                </div>
              </Td>
            </Tr>
          );
        })}
      </Table>

      <Modal isOpen={modalFormAbierto} onClose={() => setModalFormAbierto(false)} title={modoEdicion ? "Editar Profesional" : "Crear Nuevo Profesional"}>
        <form autoComplete="off" onSubmit={manejarGuardado} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <Input type="text" placeholder="Nombre completo" autoComplete="off" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} required />
          <Input type="text" placeholder="Especialidad" autoComplete="off" value={formData.especialidad} onChange={(e) => setFormData({...formData, especialidad: e.target.value})} required />
          <Input type="email" placeholder="Email" autoComplete="new-email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
          <Input type="text" placeholder="Teléfono" autoComplete="off" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button type="submit">{cargandoForm ? "Guardando..." : "Guardar"}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={modalEliminarAbierto} onClose={() => setModalEliminarAbierto(false)} title="Confirmar">
        <p>¿Eliminar a {profesionalSeleccionado?.nombre || profesionalSeleccionado?.person?.name}?</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <Button variant="danger" onClick={ejecutarEliminacion}>Sí, eliminar</Button>
        </div>
      </Modal>
    </div>
  );
};

export default ProfesionalesAdmin;
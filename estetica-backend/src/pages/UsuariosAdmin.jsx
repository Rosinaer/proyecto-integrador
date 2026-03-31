import { useEffect, useState } from "react";
import {
  obtenerUsuarios,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario
} from "../api/usuario.api";

export default function UsuariosAdmin() {
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    password: "",
    rol: "CLIENTE"
  });

  const [editId, setEditId] = useState(null);
  const token = localStorage.getItem("token");

  const cargarUsuarios = async () => {
    try {
      const data = await obtenerUsuarios(token);
      setUsuarios(data);
    } catch (error) {
      alert("Error al cargar usuarios");
    }
  };

  useEffect(() => {
    if (token) {
      cargarUsuarios();
    }
  }, []);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editId) {
        await actualizarUsuario(editId, form, token);
      } else {
        await crearUsuario(form, token);
      }

      setForm({
        nombre: "",
        apellido: "",
        email: "",
        password: "",
        rol: "CLIENTE"
      });

      setEditId(null);
      cargarUsuarios();
    } catch (error) {
      alert("Error al guardar usuario");
    }
  };

  const handleEdit = (u) => {
    setForm({
      nombre: u.nombre,
      apellido: u.apellido,
      email: u.email,
      password: "",
      rol: u.rol
    });
    setEditId(u.id);
  };

  const handleDelete = async (id) => {
    try {
      await eliminarUsuario(id, token);
      cargarUsuarios();
    } catch (error) {
      alert("Error al eliminar usuario");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    window.location.href = "/login";
  };

  return (
    <div>
      <h2>Usuarios</h2>

      <button onClick={logout}>Cerrar sesión</button>

      <form onSubmit={handleSubmit}>
        <input
          name="nombre"
          placeholder="Nombre"
          value={form.nombre}
          onChange={handleChange}
        />

        <input
          name="apellido"
          placeholder="Apellido"
          value={form.apellido}
          onChange={handleChange}
        />

        <input
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
        />

        <input
          name="password"
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={handleChange}
        />

        <select name="rol" value={form.rol} onChange={handleChange}>
          <option value="ADMIN">ADMIN</option>
          <option value="RECEPCIONISTA">RECEPCIONISTA</option>
          <option value="TECNICO">TECNICO</option>
          <option value="CLIENTE">CLIENTE</option>
        </select>

        <button type="submit">
          {editId ? "Actualizar" : "Crear"}
        </button>
      </form>

      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id}>
              <td>{u.nombre} {u.apellido}</td>
              <td>{u.email}</td>
              <td>{u.rol}</td>
              <td>
                <button onClick={() => handleEdit(u)}>Editar</button>
                <button onClick={() => handleDelete(u.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
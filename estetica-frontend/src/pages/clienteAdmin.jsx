import { useEffect, useState } from "react";
import {
  obtenerClientes,
  crearCliente,
  actualizarCliente,
  eliminarCliente
} from "../api/cliente.api";

export default function ClientesAdmin() {
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    email: ""
  });

  const [editId, setEditId] = useState(null);
  const token = localStorage.getItem("token");

  const cargarClientes = async () => {
    try {
      const data = await obtenerClientes(token);
      setClientes(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editId) {
        await actualizarCliente(editId, form, token);
      } else {
        await crearCliente(form, token);
      }

      setForm({
        nombre: "",
        telefono: "",
        email: ""
      });

      setEditId(null);
      cargarClientes();
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = (c) => {
    setForm({
      nombre: c.nombre,
      telefono: c.telefono,
      email: c.email
    });
    setEditId(c.id);
  };

  const handleDelete = async (id) => {
    try {
      await eliminarCliente(id, token);
      cargarClientes();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <h2>Clientes</h2>

      <form onSubmit={handleSubmit}>
        <input
          name="nombre"
          placeholder="Nombre"
          value={form.nombre}
          onChange={handleChange}
        />

        <input
          name="telefono"
          placeholder="Teléfono"
          value={form.telefono}
          onChange={handleChange}
        />

        <input
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
        />

        <button type="submit">
          {editId ? "Actualizar" : "Crear"}
        </button>
      </form>

      <table border="1">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Teléfono</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {clientes.map((c) => (
            <tr key={c.id}>
              <td>{c.nombre}</td>
              <td>{c.email}</td>
              <td>{c.telefono}</td>
              <td>
                <button onClick={() => handleEdit(c)}>Editar</button>
                <button onClick={() => handleDelete(c.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
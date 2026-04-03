import { useEffect, useState } from "react";
import {
  obtenerServicios,
  crearServicio,
  actualizarServicio,
  eliminarServicio
} from "../api/servicio.api";

export default function ServiciosAdmin() {
  const [servicios, setServicios] = useState([]);
  const [form, setForm] = useState({
    nombre: "",
    duracionMinutos: "",
    precio: ""
  });

  const [editId, setEditId] = useState(null);
  const token = localStorage.getItem("token");

  const cargarServicios = async () => {
    try {
      const data = await obtenerServicios(token);
      setServicios(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    cargarServicios();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editId) {
        await actualizarServicio(editId, form, token);
      } else {
        await crearServicio(form, token);
      }

      setForm({
        nombre: "",
        duracionMinutos: "",
        precio: ""
      });

      setEditId(null);
      cargarServicios();
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = (s) => {
    setForm({
      nombre: s.nombre,
      duracionMinutos: s.duracionMinutos,
      precio: s.precio
    });
    setEditId(s.id);
  };

  const handleDelete = async (id) => {
    try {
      await eliminarServicio(id, token);
      cargarServicios();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <h2>Servicios</h2>

      <form onSubmit={handleSubmit}>
        <input
          name="nombre"
          placeholder="Nombre"
          value={form.nombre}
          onChange={handleChange}
        />

        <input
          type="number"
          name="duracionMinutos"
          placeholder="Duración (min)"
          value={form.duracionMinutos}
          onChange={handleChange}
        />
          

        <input
          type="number"
          name="precio"
          placeholder="Precio"
          value={form.precio}
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
            <th>Duración (min)</th>
            <th>Precio</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {servicios.map((s) => (
            <tr key={s.id}>
              <td>{s.nombre}</td>
              <td>{s.duracionMinutos}</td>
              <td>{s.precio}</td>
              <td>
                <button onClick={() => handleEdit(s)}>Editar</button>
                <button onClick={() => handleDelete(s.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
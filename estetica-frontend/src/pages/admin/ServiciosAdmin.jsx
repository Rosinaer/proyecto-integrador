import { useState, useEffect } from "react";
import { Table, Tr, Td } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { useAuth } from "../../hooks/useAuth";
import {
  obtenerServicios,
  crearServicio,
  actualizarServicio,
  desactivarServicio,
  obtenerCategorias,
} from "../../api/services.api";

const ServiciosAdmin = () => {
  const [servicios, setServicios] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  // Modal de eliminación
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false);
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);

  // Modal de Formulario (Crear / Editar)
  const [modalFormAbierto, setModalFormAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [servicioEditandoId, setServicioEditandoId] = useState(null);

  // Adaptamos el formData a lo que necesita un Servicio
  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    defaultDurationMinutes: "",
    active: true,
    requiresPreConsult: false,
    reminderNote: "",
  });

  const [errorForm, setErrorForm] = useState("");
  const [cargandoForm, setCargandoForm] = useState(false);

  const { token } = useAuth();

  // Obtener servicios

  const cargarServicios = async () => {
    try {
      const data = await obtenerServicios(token);
      setServicios(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  // OBTENER CATEGORÍAS

  const cargarCategorias = async () => {
    try {
      const data = await obtenerCategorias(token);
      setCategorias(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) {
      cargarServicios();
      cargarCategorias();
    }
  }, [token]);

  // MODAL CREAR

  const abrirModalCrear = () => {
    setModoEdicion(false);

    setServicioEditandoId(null);
    setFormData({
      name: "",
      categoryId: "",
      defaultDurationMinutes: "",
      active: true,
      requiresPreConsult: false,
      reminderNote: "",
    });

    setModalFormAbierto(true);
  };

  // MODAL EDITAR

  const abrirModalEditar = (servicio) => {
    setModoEdicion(true);

    setServicioEditandoId(servicio.id);
    setFormData({
      name: servicio.name || "",
      categoryId: servicio.categoryId || "",
      defaultDurationMinutes: servicio.defaultDurationMinutes || "",
      active: servicio.active,
      requiresPreConsult: servicio.requiresPreConsult || false,
      reminderNote: servicio.reminderNote || "",
    });

    setModalFormAbierto(true);
  };

  // GUARDAR

  const guardarServicio = async (e) => {
    e.preventDefault();

    setErrorForm("");
    setCargandoForm(true);

    try {
      const payload = {
        ...formData,
        categoryId: Number(formData.categoryId),
        defaultDurationMinutes: Number(formData.defaultDurationMinutes),
      };

      if (modoEdicion) {
        await actualizarServicio(servicioEditandoId, payload, token);
      } else {
        await crearServicio(payload, token);
      }
      setModalFormAbierto(false);

      cargarServicios();
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setCargandoForm(false);
    }
  };

  // DESACTIVAR

  const confirmarEliminacion = (servicio) => {
    setServicioSeleccionado(servicio);
    setModalEliminarAbierto(true);
  };

  const ejecutarEliminacion = async () => {
    try {
      await desactivarServicio(servicioSeleccionado.id, token);

      setModalEliminarAbierto(false);

      cargarServicios();
    } catch (err) {
      alert(err.message);
    }
  };

  if (cargando) {
    return (
      <p style={{ textAlign: "center", marginTop: "50px" }}>
        Cargando servicios...
      </p>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ color: "#6b21a8" }}>Gestión de Servicios</h2>

        <Button onClick={abrirModalCrear}>+ Nuevo Servicio</Button>
      </div>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <Table
        headers={["Servicio", "Categoría", "Duración", "Estado", "Acciones"]}
      >
        {servicios.map((s) => (
          <Tr key={s.id}>
            <Td>
              <strong>{s.name}</strong>
            </Td>

            <Td>{s.category?.name}</Td>

            <Td>{s.defaultDurationMinutes} min</Td>

            <Td>{s.active ? "Activo" : "Inactivo"}</Td>

            <Td>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  justifyContent: "center",
                }}
              >
                <Button
                  style={{
                    padding: "6px 12px",
                    fontSize: "12px",
                    backgroundColor: "#64748b",
                  }}
                  onClick={() => abrirModalEditar(s)}
                >
                  Editar
                </Button>

                <Button
                  variant="danger"
                  style={{
                    padding: "6px 12px",
                    fontSize: "12px",
                  }}
                  onClick={() => confirmarEliminacion(s)}
                >
                  Desactivar
                </Button>
              </div>
            </Td>
          </Tr>
        ))}
      </Table>

      {/* MODAL FORMULARIO */}

      <Modal
        isOpen={modalFormAbierto}
        onClose={() => setModalFormAbierto(false)}
        title={modoEdicion ? "Editar Servicio" : "Crear Nuevo Servicio"}
      >
        {errorForm && (
          <p
            style={{
              color: "red",
              fontSize: "14px",
              textAlign: "center",
            }}
          >
            {errorForm}
          </p>
        )}

        <form
          onSubmit={guardarServicio}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "15px",
            marginTop: "10px",
          }}
        >
          <Input
            type="text"
            placeholder="Nombre del servicio"
            value={formData.name}
            onChange={(e) =>
              setFormData({
                ...formData,
                name: e.target.value,
              })
            }
            required
          />

          <Select
            value={formData.categoryId}
            onChange={(e) =>
              setFormData({
                ...formData,
                categoryId: e.target.value,
              })
            }
            options={categorias.map((categoria) => ({
              value: categoria.id,
              label: categoria.name,
            }))}
          />

          <Input
            type="number"
            placeholder="Duración (minutos)"
            value={formData.defaultDurationMinutes}
            onChange={(e) =>
              setFormData({
                ...formData,
                defaultDurationMinutes: e.target.value,
              })
            }
            required
          />

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  active: e.target.checked,
                })
              }
            />
            Servicio activo
          </label>

          <Input
            type="text"
            placeholder="Nota recordatorio (ej: venir sin maquillaje)"
            value={formData.reminderNote}
            onChange={(e) =>
              setFormData({ ...formData, reminderNote: e.target.value })
            }
          />

          <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              type="checkbox"
              checked={formData.requiresPreConsult}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  requiresPreConsult: e.target.checked,
                })
              }
            />
            Requiere pre-consulta
          </label>

          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "10px",
              justifyContent: "flex-end",
            }}
          >
            <Button
              type="button"
              style={{
                backgroundColor: "#e2e8f0",
                color: "#475569",
              }}
              onClick={() => setModalFormAbierto(false)}
            >
              Cancelar
            </Button>

            <Button type="submit" disabled={cargandoForm}>
              {cargandoForm ? "Guardando..." : "Guardar Servicio"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL ELIMINAR */}

      <Modal
        isOpen={modalEliminarAbierto}
        onClose={() => setModalEliminarAbierto(false)}
        title="Confirmar desactivación"
      >
        <p>
          {" "}
          ¿Estás segura de que querés desactivar el servicio{" "}
          <b>{servicioSeleccionado?.name}</b>?
        </p>

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "25px",
            justifyContent: "flex-end",
          }}
        >
          <Button
            style={{
              backgroundColor: "#e2e8f0",
              color: "#475569",
            }}
            onClick={() => setModalEliminarAbierto(false)}
          >
            Cancelar
          </Button>

          <Button variant="danger" onClick={ejecutarEliminacion}>
            Sí, desactivar
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default ServiciosAdmin;

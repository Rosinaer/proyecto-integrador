import { useState, useEffect } from "react";
import { Table, Tr, Td } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { useAuth } from "../../hooks/useAuth";
import { useBanner } from "../../components/ui/Banner";
import { PageHeader } from "../../components/ui/PageHeader";
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
  const banner = useBanner();

  // Activos primero, luego inactivos; alfabético dentro de cada grupo (mismo patrón que Profesionales/Usuarios)
  const ordenarPorEstado = (lista) =>
    [...lista].sort((a, b) => {
      if (Boolean(a.active) !== Boolean(b.active)) return a.active ? -1 : 1;
      return (a.name || "").localeCompare(b.name || "");
    });

  // Obtener servicios

  const cargarServicios = async () => {
    try {
      const data = await obtenerServicios(token);
      setServicios(ordenarPorEstado(data));
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
        categoryId: formData.categoryId,
        defaultDurationMinutes: Number(formData.defaultDurationMinutes),
      };

      if (modoEdicion) {
        await actualizarServicio(servicioEditandoId, payload, token);
      } else {
        await crearServicio(payload, token);
      }
      setModalFormAbierto(false);

      const catNombre = categorias.find((c) => c.id === formData.categoryId)?.name || "—";
      banner.success(modoEdicion ? "Servicio actualizado" : "Servicio creado", {
        details: [
          ["Nombre", payload.name],
          ["Categoría", catNombre],
          ["Duración", `${payload.defaultDurationMinutes} min`],
          ["Pre-consulta", payload.requiresPreConsult ? "Sí" : "No"],
          ["Estado", payload.active === false ? "Inactivo" : "Activo"],
        ],
        notes: payload.reminderNote || "",
      });

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
      banner.warning("Servicio desactivado", { details: [["Servicio", servicioSeleccionado.name]] });
      cargarServicios();
    } catch (err) {
      banner.error(err.message);
    }
  };

  // REACTIVAR
  const reactivarServicio = async (servicio) => {
    try {
      await actualizarServicio(servicio.id, { active: true }, token);
      banner.success("Servicio reactivado", { details: [["Servicio", servicio.name]] });
      cargarServicios();
    } catch (err) {
      banner.error(err.message);
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
    <div>
      <PageHeader
        title="Gestión de Servicios"
        actions={<Button onClick={abrirModalCrear}>+ Nuevo Servicio</Button>}
      />

      {error && <p style={{ color: "red" }}>{error}</p>}

      <Table
        headers={["Servicio", "Categoría", "Duración", "Estado", "Acciones"]}
      >
        {servicios.map((s) => (
          <Tr
            key={s.id}
            style={!s.active ? { backgroundColor: "#f1f5f9", color: "#94a3b8" } : undefined}
          >
            <Td>
              <strong>{s.name}</strong>
            </Td>

            <Td>{s.category?.name}</Td>

            <Td>{s.defaultDurationMinutes} min</Td>

            <Td>
              <span style={{ color: s.active ? "#16a34a" : "#d32f2f", fontWeight: "bold" }}>
                {s.active ? "● Activo" : "○ Inactivo"}
              </span>
            </Td>

            <Td>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  justifyContent: "center",
                }}
              >
                {s.active ? (
                  <>
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
                  </>
                ) : (
                  <Button
                    style={{
                      padding: "6px 12px",
                      fontSize: "12px",
                      backgroundColor: "#16a34a",
                      color: "#fff",
                    }}
                    onClick={() => reactivarServicio(s)}
                  >
                    Reactivar
                  </Button>
                )}
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
            required
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
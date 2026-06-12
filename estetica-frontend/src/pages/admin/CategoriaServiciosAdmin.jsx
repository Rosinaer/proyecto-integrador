import { useState, useEffect, Fragment } from "react";
import { Table, Tr, Td } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../hooks/useAuth";
import { useBanner } from "../../components/ui/Banner";
import { PageHeader } from "../../components/ui/PageHeader";
import {
  obtenerCategorias,
  crearCategoria,
  actualizarCategoria,
} from "../../api/services.api";

const PURPLE = "#6b21a8";

const CategoriaServiciosAdmin = () => {
  const [categorias, setCategorias] = useState([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [reordenando, setReordenando] = useState(false);
  const [expandida, setExpandida] = useState(null); // id de categoría desplegada

  // Modal de Formulario (Crear / Editar)
  const [modalFormAbierto, setModalFormAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [categoriaEditandoId, setCategoriaEditandoId] = useState(null);
  const [formData, setFormData] = useState({ name: "" });

  const [errorForm, setErrorForm] = useState("");
  const [cargandoForm, setCargandoForm] = useState(false);

  const { token } = useAuth();
  const banner = useBanner();

  const mensajeDeError = (err) =>
    err.response?.data?.mensaje ||
    err.response?.data?.error ||
    err.message ||
    "Ocurrió un error inesperado";

  // OBTENER CATEGORÍAS
  const cargarCategorias = async () => {
    try {
      const data = await obtenerCategorias(token);
      setCategorias(data);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (token) cargarCategorias();
  }, [token]);

  // MODAL CREAR / EDITAR
  const abrirModalCrear = () => {
    setModoEdicion(false);
    setCategoriaEditandoId(null);
    setFormData({ name: "" });
    setErrorForm("");
    setModalFormAbierto(true);
  };

  const abrirModalEditar = (categoria) => {
    setModoEdicion(true);
    setCategoriaEditandoId(categoria.id);
    setFormData({ name: categoria.name || "" });
    setErrorForm("");
    setModalFormAbierto(true);
  };

  // GUARDAR
  const guardarCategoria = async (e) => {
    e.preventDefault();
    setErrorForm("");

    if (!formData.name.trim()) {
      setErrorForm("El nombre es obligatorio");
      return;
    }

    setCargandoForm(true);
    try {
      let payload;
      if (modoEdicion) {
        payload = { name: formData.name.trim() };
        await actualizarCategoria(categoriaEditandoId, payload, token);
      } else {
        // El orden se asigna automáticamente al final (no se pide a mano).
        const siguienteOrden =
          categorias.reduce((max, c) => Math.max(max, c.displayOrder || 0), 0) + 1;
        payload = { name: formData.name.trim(), displayOrder: siguienteOrden };
        await crearCategoria(payload, token);
      }
      setModalFormAbierto(false);
      banner.success(modoEdicion ? "Categoría actualizada" : "Categoría creada", {
        details: [["Nombre", payload.name]],
      });
      cargarCategorias();
    } catch (err) {
      setErrorForm(mensajeDeError(err));
    } finally {
      setCargandoForm(false);
    }
  };

  // REORDENAR (flechas): recalcula displayOrder automáticamente
  const mover = async (index, dir) => {
    const destino = index + dir;
    if (destino < 0 || destino >= categorias.length || reordenando) return;

    const nuevo = [...categorias];
    const [item] = nuevo.splice(index, 1);
    nuevo.splice(destino, 0, item);

    setReordenando(true);
    try {
      const cambios = [];
      nuevo.forEach((c, i) => {
        const ordenNuevo = i + 1;
        if (c.displayOrder !== ordenNuevo) cambios.push({ id: c.id, displayOrder: ordenNuevo });
      });
      for (const c of cambios) {
        await actualizarCategoria(c.id, { displayOrder: c.displayOrder }, token);
      }
      // Reflejamos el nuevo orden en pantalla
      setCategorias(nuevo.map((c, i) => ({ ...c, displayOrder: i + 1 })));
      banner.success("Orden de categorías actualizado", {
        details: [["Categoría movida", item.name], ["Nueva posición", String(destino + 1)]],
      });
    } catch (err) {
      banner.error(mensajeDeError(err));
      cargarCategorias();
    } finally {
      setReordenando(false);
    }
  };

  const toggleExpandir = (id) => setExpandida((prev) => (prev === id ? null : id));

  if (cargando) {
    return <p style={{ textAlign: "center", marginTop: "50px" }}>Cargando categorías...</p>;
  }

  return (
    <div>
      <PageHeader
        title="Gestión de Categorías"
        actions={<Button onClick={abrirModalCrear}>+ Nueva Categoría</Button>}
      />
      {error && <p style={{ color: "red" }}>{error}</p>}

      <p style={{ fontSize: 12, color: "#64748b", marginTop: 0 }}>
        Usá las flechas para reordenar (el orden se recalcula solo). Hacé click en una categoría para ver sus servicios.
      </p>

      <Table headers={["Orden", "Categoría", "Servicios activos", "Acciones"]}>
        {categorias.map((c, i) => (
          <Fragment key={c.id}>
            <Tr>
              <Td>
                <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <button type="button" onClick={() => mover(i, -1)} disabled={i === 0 || reordenando}
                      title="Subir" style={arrowBtn(i === 0 || reordenando)}>▲</button>
                    <button type="button" onClick={() => mover(i, 1)} disabled={i === categorias.length - 1 || reordenando}
                      title="Bajar" style={arrowBtn(i === categorias.length - 1 || reordenando)}>▼</button>
                  </div>
                  <span style={{ color: "#64748b" }}>{c.displayOrder}</span>
                </div>
              </Td>

              <Td>
                <span style={{ cursor: "pointer", color: PURPLE }} onClick={() => toggleExpandir(c.id)}>
                  {expandida === c.id ? "▾" : "▸"} <strong>{c.name}</strong>
                </span>
              </Td>

              <Td>{c.services?.length ?? 0}</Td>

              <Td>
                <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                  <Button style={{ padding: "6px 12px", fontSize: "12px", backgroundColor: "#64748b" }}
                    onClick={() => abrirModalEditar(c)}>
                    Editar
                  </Button>
                </div>
              </Td>
            </Tr>

            {expandida === c.id && (
              <Tr>
                <Td colSpan={4}>
                  <div style={{ padding: "6px 10px", textAlign: "left" }}>
                    {(c.services?.length ?? 0) === 0 ? (
                      <span style={{ color: "#94a3b8", fontSize: 13 }}>Sin servicios activos en esta categoría.</span>
                    ) : (
                      <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.7 }}>
                        {c.services.map((s) => (
                          <div key={s.id}>– {s.name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </Td>
              </Tr>
            )}
          </Fragment>
        ))}
      </Table>

      {/* MODAL FORMULARIO */}
      <Modal isOpen={modalFormAbierto} onClose={() => setModalFormAbierto(false)}
        title={modoEdicion ? "Editar Categoría" : "Crear Nueva Categoría"}>
        {errorForm && <p style={{ color: "red", fontSize: "14px", textAlign: "center" }}>{errorForm}</p>}

        <form onSubmit={guardarCategoria} style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "10px" }}>
          <Input
            type="text"
            placeholder="Nombre de la categoría"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          {!modoEdicion && (
            <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
              El orden se asigna automáticamente al final. Después podés reordenar con las flechas.
            </p>
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: "10px", justifyContent: "flex-end" }}>
            <Button type="button" style={{ backgroundColor: "#e2e8f0", color: "#475569" }}
              onClick={() => setModalFormAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={cargandoForm}>
              {cargandoForm ? "Guardando..." : "Guardar Categoría"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const arrowBtn = (disabled) => ({
  background: "transparent",
  border: "none",
  cursor: disabled ? "default" : "pointer",
  color: disabled ? "#cbd5e1" : "#6b21a8",
  fontSize: 11,
  lineHeight: 1,
  padding: "1px 2px",
});

export default CategoriaServiciosAdmin;

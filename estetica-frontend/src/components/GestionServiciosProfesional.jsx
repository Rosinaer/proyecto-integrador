

import { useState, useEffect, useCallback } from "react";
import { Table, Tr, Td } from "./ui/Table";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";
import { useBanner } from "./ui/Banner";
import {
  obtenerServiciosDeProfesional,
  crearProfessionalService,
  actualizarProfessionalService,
  obtenerServicios,
} from "../api/services.api";

const moneda = (v) =>
  Number(v).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

const esActivo = (ps) => ps.active !== false; // tolera registros viejos sin el campo

export const GestionServiciosProfesional = ({ professionalId, token }) => {
  const banner = useBanner();
  const [servicios, setServicios] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  // Modal crear / editar
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [psEditando, setPsEditando] = useState(null);
  const [form, setForm] = useState({ serviceId: "", price: "", durationMinutes: "" });
  const [errorForm, setErrorForm] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Modal confirmar baja
  const [psADesactivar, setPsADesactivar] = useState(null);

  const cargar = useCallback(async () => {
    if (!professionalId) return;
    setCargando(true);
    setError("");
    try {
      const [ps, cat] = await Promise.all([
        obtenerServiciosDeProfesional(professionalId, token),
        obtenerServicios(token, true),
      ]);
      setServicios(ps);
      setCatalogo(cat);
    } catch (err) {
      setError(err.response?.data?.mensaje || err.message);
    } finally {
      setCargando(false);
    }
  }, [professionalId, token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Servicios del catálogo que todavía no están asignados y activos
  const idsActivosAsignados = servicios.filter(esActivo).map((p) => p.serviceId);
  const disponiblesParaAgregar = catalogo.filter((s) => !idsActivosAsignados.includes(s.id));

  const abrirCrear = () => {
    setModoEdicion(false);
    setPsEditando(null);
    setForm({ serviceId: "", price: "", durationMinutes: "" });
    setErrorForm("");
    setModalAbierto(true);
  };

  const abrirEditar = (ps) => {
    setModoEdicion(true);
    setPsEditando(ps);
    setForm({
      serviceId: ps.serviceId,
      price: ps.price,
      durationMinutes: ps.durationMinutes,
    });
    setErrorForm("");
    setModalAbierto(true);
  };

  // Al elegir un servicio en alta, precargamos su duración por defecto
  const onSelectService = (serviceId) => {
    const svc = catalogo.find((s) => s.id === serviceId);
    setForm((f) => ({
      ...f,
      serviceId,
      durationMinutes: f.durationMinutes || (svc?.defaultDurationMinutes ?? ""),
    }));
  };

  const guardar = async (e) => {
    e.preventDefault();
    setErrorForm("");

    if (!modoEdicion && !form.serviceId) {
      setErrorForm("Elegí un servicio.");
      return;
    }
    if (Number(form.price) < 0) {
      setErrorForm("El precio no puede ser negativo.");
      return;
    }
    if (Number(form.durationMinutes) <= 0) {
      setErrorForm("La duración debe ser mayor a 0.");
      return;
    }

    setGuardando(true);
    try {
      if (modoEdicion) {
        await actualizarProfessionalService(
          psEditando.id,
          { price: Number(form.price), durationMinutes: Number(form.durationMinutes) },
          token,
        );
      } else {
        await crearProfessionalService(
          {
            professionalId,
            serviceId: form.serviceId,
            price: Number(form.price),
            durationMinutes: Number(form.durationMinutes),
          },
          token,
        );
      }
      setModalAbierto(false);
      const nombreServ = modoEdicion
        ? (psEditando?.service?.name || "Servicio")
        : (catalogo.find((s) => s.id === form.serviceId)?.name || "Servicio");
      banner.success(modoEdicion ? "Servicio del profesional actualizado" : "Servicio asignado al profesional", {
        details: [
          ["Servicio", nombreServ],
          ["Precio", moneda(Number(form.price))],
          ["Duración", `${Number(form.durationMinutes)} min`],
        ],
      });
      await cargar();
    } catch (err) {
      setErrorForm(err.response?.data?.mensaje || err.message);
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (ps, activar) => {
    setError("");
    try {
      await actualizarProfessionalService(ps.id, { active: activar }, token);
      setPsADesactivar(null);
      banner[activar ? "success" : "warning"](
        activar ? "Servicio reactivado" : "Servicio desactivado",
        { details: [["Servicio", ps.service?.name || "—"]] }
      );
      await cargar();
    } catch (err) {
      setPsADesactivar(null);
      const msg = err.response?.data?.mensaje || err.message;
      setError(msg);
      banner.error(msg);
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <h3 style={{ color: "#475569", margin: 0 }}>Servicios del profesional</h3>
        <Button
          onClick={abrirCrear}
          disabled={cargando || disponiblesParaAgregar.length === 0}
          style={{ fontSize: "13px", padding: "6px 12px" }}
          title={
            disponiblesParaAgregar.length === 0
              ? "No quedan servicios del catálogo para agregar"
              : "Agregar un servicio"
          }
        >
          + Agregar servicio
        </Button>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fca5a5",
            color: "#991b1b",
            borderRadius: "8px",
            padding: "10px 14px",
            fontSize: "13px",
            marginBottom: "12px",
          }}
        >
          {error}
        </div>
      )}

      {cargando ? (
        <p style={{ color: "#94a3b8", padding: "16px 0" }}>Cargando servicios...</p>
      ) : servicios.length === 0 ? (
        <p style={{ color: "#94a3b8" }}>Sin servicios asignados.</p>
      ) : (
        <Table headers={["Servicio", "Categoría", "Duración", "Precio", "Estado", "Acciones"]}>
          {servicios.map((ps) => {
            const activo = esActivo(ps);
            return (
              <Tr key={ps.id} style={!activo ? { backgroundColor: "#f1f5f9", color: "#94a3b8" } : undefined}>
                <Td>
                  <strong>{ps.service?.name || "—"}</strong>
                </Td>
                <Td>{ps.service?.category?.name || "—"}</Td>
                <Td>{ps.durationMinutes} min</Td>
                <Td>{moneda(ps.price)}</Td>
                <Td>
                  <span style={{ color: activo ? "#16a34a" : "#d32f2f", fontWeight: "bold" }}>
                    {activo ? "● Activo" : "○ Inactivo"}
                  </span>
                </Td>
                <Td>
                  <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                    {activo ? (
                      <>
                        <Button
                          style={{ padding: "6px 12px", fontSize: "12px", backgroundColor: "#64748b" }}
                          onClick={() => abrirEditar(ps)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="danger"
                          style={{ padding: "6px 12px", fontSize: "12px", backgroundColor: "#d32f2f", color: "#fff" }}
                          onClick={() => setPsADesactivar(ps)}
                        >
                          Desactivar
                        </Button>
                      </>
                    ) : (
                      <Button
                        style={{ padding: "6px 12px", fontSize: "12px", backgroundColor: "#16a34a", color: "#fff" }}
                        onClick={() => cambiarEstado(ps, true)}
                      >
                        Reactivar
                      </Button>
                    )}
                  </div>
                </Td>
              </Tr>
            );
          })}
        </Table>
      )}

      {/* Modal crear / editar */}
      <Modal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        title={modoEdicion ? `Editar — ${psEditando?.service?.name}` : "Agregar servicio"}
      >
        {errorForm && (
          <p style={{ color: "red", fontSize: "14px", textAlign: "center" }}>{errorForm}</p>
        )}

        <form onSubmit={guardar} style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "10px" }}>
          {modoEdicion ? (
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
              El precio nuevo aplica solo a reservas futuras. Los turnos ya creados mantienen el precio original.
            </p>
          ) : (
            <Select
              value={form.serviceId}
              required
              onChange={(e) => onSelectService(e.target.value)}
              options={disponiblesParaAgregar.map((s) => ({
                value: s.id,
                label: `${s.category?.name ? s.category.name + " — " : ""}${s.name}`,
              }))}
            />
          )}

          <Input
            type="number"
            placeholder="Precio (ARS)"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
            min={0}
          />

          <Input
            type="number"
            placeholder="Duración (minutos)"
            value={form.durationMinutes}
            onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
            required
            min={1}
          />

          <div style={{ display: "flex", gap: "10px", marginTop: "10px", justifyContent: "flex-end" }}>
            <Button
              type="button"
              style={{ backgroundColor: "#e2e8f0", color: "#475569" }}
              onClick={() => setModalAbierto(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : modoEdicion ? "Guardar cambios" : "Agregar"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal confirmar baja */}
      <Modal isOpen={!!psADesactivar} onClose={() => setPsADesactivar(null)} title="Confirmar">
        <p>
          ¿Desactivar el servicio <strong>{psADesactivar?.service?.name}</strong> para este profesional?
          Podés reactivarlo más adelante.
        </p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
          <Button type="button" style={{ backgroundColor: "#e2e8f0", color: "#475569" }} onClick={() => setPsADesactivar(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => cambiarEstado(psADesactivar, false)}>
            Sí, desactivar
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default GestionServiciosProfesional;
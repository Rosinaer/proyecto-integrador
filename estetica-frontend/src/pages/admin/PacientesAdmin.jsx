import { useEffect, useState } from "react";
import { Table, Tr, Td } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { useAuth } from "../../hooks/useAuth";

import {
  obtenerPacientes,
  crearPaciente,
  actualizarPaciente,
} from "../../api/patients.api";

const PacientesAdmin = () => {
  const [pacientes, setPacientes] = useState([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  // Modal formulario
  const [modalFormAbierto, setModalFormAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [pacienteEditandoId, setPacienteEditandoId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    documentType: "DNI",
    document: "",
    email: "",
    phone: "",
    cuilCuit: "",
    clinicalNotes: "",
  });

  const [errorForm, setErrorForm] = useState("");
  const [cargandoForm, setCargandoForm] = useState(false);

  const { token } = useAuth();

  const cargarPacientes = async () => {
    try {
      const data = await obtenerPacientes(token);
      setPacientes(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (token) {
      cargarPacientes();
    }
  }, [token]);

  // MODAL CREAR

  const abrirModalForm = () => {
    setModoEdicion(false);

    setPacienteEditandoId(null);

    setFormData({
      name: "",
      documentType: "DNI",
      document: "",
      email: "",
      phone: "",
      cuilCuit: "",
      clinicalNotes: "",
    });
    setModalFormAbierto(true);
  };

  // MODAL EDITAR

  const abrirModalEditar = (paciente) => {
    setModoEdicion(true);
    setPacienteEditandoId(paciente.id);

    setFormData({
      name: paciente.person?.name || "",
      documentType: paciente.person?.documentType || "DNI",
      document: paciente.person?.document || "",
      email: paciente.person?.email || "",
      phone: paciente.person?.phone || "",
      cuilCuit: paciente.cuilCuit || "",
      clinicalNotes: paciente.clinicalNotes || "",
    });

    setModalFormAbierto(true);
  };

  // GUARDAR

  const guardarPaciente = async (e) => {
    e.preventDefault();

    setErrorForm("");
    setCargandoForm(true);

    try {
      const payload = {
        ...formData,
      };

      if (modoEdicion) {
        await actualizarPaciente(pacienteEditandoId, payload, token);
      } else {
        await crearPaciente(payload, token);
      }

      setModalFormAbierto(false);

      cargarPacientes();
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setCargandoForm(false);
    }
  };

  if (cargando) {
    return (
      <p
        style={{
          textAlign: "center",
          marginTop: "50px",
        }}
      >
        Cargando pacientes...
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
        <h2 style={{ color: "#6b21a8" }}>Gestión de Pacientes</h2>

        <Button onClick={abrirModalForm}>+ Nuevo Paciente</Button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <Table
        headers={[
          "Nombre",
          "Documento",
          "Email",
          "Teléfono",
          "CUIL/CUIT",
          "Acciones",
        ]}
      >
        {pacientes.map((p) => (
          <Tr key={p.id}>
            <Td>
              <strong>{p.person?.name}</strong>
            </Td>

            <Td>
              {p.person?.documentType} {p.person?.document}
            </Td>

            <Td>{p.person?.email}</Td>

            <Td>{p.person?.phone}</Td>

            <Td>{p.cuilCuit}</Td>

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
                  onClick={() => abrirModalEditar(p)}
                >
                  Editar
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
        title={modoEdicion ? "Editar Paciente" : "Crear Nuevo Paciente"}
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
          onSubmit={guardarPaciente}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "15px",
            marginTop: "10px",
          }}
        >
          <Input
            type="text"
            placeholder="Nombre completo"
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
            value={formData.documentType}
            onChange={(e) =>
              setFormData({
                ...formData,
                documentType: e.target.value,
              })
            }
            options={[
              {
                value: "DNI",
                label: "DNI",
              },
              {
                value: "PASSPORT",
                label: "Pasaporte",
              },
              {
                value: "CUIL",
                label: "CUIL",
              },
              {
                value: "CUIT",
                label: "CUIT",
              },
            ]}
          />

          <Input
            type="text"
            placeholder="Número de documento"
            value={formData.document}
            onChange={(e) =>
              setFormData({
                ...formData,
                document: e.target.value,
              })
            }
            required
          />

          <Input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) =>
              setFormData({
                ...formData,
                email: e.target.value,
              })
            }
            required={!modoEdicion}
            disabled={modoEdicion}
          />

          <Input
            type="text"
            placeholder="Teléfono"
            value={formData.phone}
            onChange={(e) =>
              setFormData({
                ...formData,
                phone: e.target.value,
              })
            }
            required
          />

          <Input
            type="text"
            placeholder="CUIL/CUIT"
            value={formData.cuilCuit}
            onChange={(e) =>
              setFormData({
                ...formData,
                cuilCuit: e.target.value,
              })
            }
          />
          <Input
                type="text"
                placeholder="Notas clínicas"
                value={formData.clinicalNotes}
                onChange={(e) =>
                  setFormData({ ...formData, clinicalNotes: e.target.value })
                }
              />

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
              {cargandoForm ? "Guardando..." : "Guardar Paciente"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PacientesAdmin;

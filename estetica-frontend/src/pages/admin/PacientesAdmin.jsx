import { useEffect, useState } from "react";
import { Table, Tr, Td } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { PacienteFormModal } from "../../components/PacienteFormModal";
import { obtenerPacientes } from "../../api/patients.api";

const PacientesAdmin = () => {
  const [pacientes, setPacientes] = useState([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  // Modal de alta/edición (paciente = null → alta)
  const [modalAbierto, setModalAbierto] = useState(false);
  const [pacienteEditando, setPacienteEditando] = useState(null);

  const { token } = useAuth();
  const navigate = useNavigate();

  const cargarPacientes = async () => {
    try {
      const data = await obtenerPacientes(token);
      setPacientes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (token) cargarPacientes();
  }, [token]);

  const abrirAlta = () => { setPacienteEditando(null); setModalAbierto(true); };
  const abrirEdicion = (p) => { setPacienteEditando(p); setModalAbierto(true); };
  const onGuardado = () => { setModalAbierto(false); cargarPacientes(); };

  if (cargando) {
    return <p style={{ textAlign: "center", marginTop: "50px" }}>Cargando pacientes...</p>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ color: "#6b21a8", margin: 0 }}>Gestión de Pacientes</h2>
        <Button onClick={abrirAlta}>+ Nuevo Paciente</Button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <Table headers={["Nombre", "Documento", "Email", "Teléfono", "CUIL/CUIT", "Acciones"]}>
        {pacientes.map((p) => (
          <Tr key={p.id}>
            <Td>
              <span style={{ color: "#6b21a8", cursor: "pointer" }} onClick={() => navigate(`/admin/pacientes/${p.id}`)}>
                <strong>{p.person?.name}</strong>
              </span>
            </Td>
            <Td>{p.person?.documentType} {p.person?.document}</Td>
            <Td>{p.person?.email}</Td>
            <Td>{p.person?.phone}</Td>
            <Td>{p.cuilCuit}</Td>
            <Td>
              <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                <Button style={{ padding: "6px 12px", fontSize: "12px", backgroundColor: "#8b5cf6" }}
                  onClick={() => navigate(`/admin/pacientes/${p.id}`)}>
                  Ver
                </Button>
                <Button style={{ padding: "6px 12px", fontSize: "12px", backgroundColor: "#64748b" }}
                  onClick={() => abrirEdicion(p)}>
                  Editar
                </Button>
                <Button style={{ padding: "6px 12px", fontSize: "12px", backgroundColor: "#6b21a8" }}
                  onClick={() => navigate("/admin/reserva-turno", { state: { patient: { id: p.id, name: p.person?.name } } })}>
                  Turno
                </Button>
              </div>
            </Td>
          </Tr>
        ))}
      </Table>

      <PacienteFormModal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        token={token}
        paciente={pacienteEditando}
        onSaved={onGuardado}
      />
    </div>
  );
};

export default PacientesAdmin;
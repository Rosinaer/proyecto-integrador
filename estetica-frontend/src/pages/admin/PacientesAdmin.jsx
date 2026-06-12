import { useEffect, useState } from "react";
import { Table, Tr, Td } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { PacienteFormModal } from "../../components/PacienteFormModal";
import { obtenerPacientes } from "../../api/patients.api";
import { PageHeader } from "../../components/ui/PageHeader";

const PURPLE = "#6b21a8";
const BORDER = "#cbd5e1";

const PacientesAdmin = () => {
  const [pacientes, setPacientes] = useState([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  // Búsqueda / filtro
  const [busqueda, setBusqueda] = useState("");

  
  const [modalAbierto, setModalAbierto] = useState(false);
  const [pacienteEditando, setPacienteEditando] = useState(null);

  const { token } = useAuth();
  const navigate = useNavigate();

  const cargarPacientes = async (search = "") => {
    try {
      setError("");
      const data = await obtenerPacientes(token, search);
      setPacientes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  // Carga inicial
  useEffect(() => {
    if (token) cargarPacientes();
  }, [token]);

  // Búsqueda con debounce (consulta al backend por nombre / email / teléfono)
  useEffect(() => {
    if (!token) return;
    const t = setTimeout(() => cargarPacientes(busqueda.trim()), 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  const abrirAlta = () => { setPacienteEditando(null); setModalAbierto(true); };
  const abrirEdicion = (p) => { setPacienteEditando(p); setModalAbierto(true); };
  const onGuardado = () => { setModalAbierto(false); cargarPacientes(busqueda.trim()); };

  return (
    <div>
      <PageHeader
        title="Gestión de Pacientes"
        actions={<Button onClick={abrirAlta}>+ Nuevo Paciente</Button>}
      />

      {/* Buscador / filtro */}
      <div style={{ marginBottom: 16, position: "relative", maxWidth: 420 }}>
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, email o teléfono…"
          style={{ width: "100%", boxSizing: "border-box", padding: "9px 34px 9px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 14 }}
        />
        {busqueda && (
          <button
            type="button"
            onClick={() => setBusqueda("")}
            title="Limpiar"
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#94a3b8", fontSize: 18, cursor: "pointer", lineHeight: 1 }}
          >
            &times;
          </button>
        )}
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {cargando ? (
        <p style={{ textAlign: "center", marginTop: "50px" }}>Cargando pacientes...</p>
      ) : pacientes.length === 0 ? (
        <p style={{ color: "#64748b", marginTop: 20 }}>
          {busqueda ? "No se encontraron pacientes con ese criterio." : "Todavía no hay pacientes cargados."}
        </p>
      ) : (
        <Table headers={["Nombre", "Documento", "Email", "Teléfono", "CUIL/CUIT", "Acciones"]}>
          {pacientes.map((p) => (
            <Tr key={p.id}>
              <Td>
                <span style={{ color: PURPLE, cursor: "pointer" }} onClick={() => navigate(`/admin/pacientes/${p.id}`)}>
                  <strong>{p.person?.name}</strong>
                </span>
              </Td>
              <Td>{p.person?.documentType} {p.person?.document}</Td>
              <Td>{p.person?.email}</Td>
              <Td>{p.person?.phone}</Td>
              <Td>{p.person?.cuilCuit}</Td>
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
                  <Button style={{ padding: "6px 12px", fontSize: "12px", backgroundColor: PURPLE }}
                    onClick={() => navigate("/admin/reserva-turno", { state: { patient: { id: p.id, name: p.person?.name } } })}>
                    Turno
                  </Button>
                </div>
              </Td>
            </Tr>
          ))}
        </Table>
      )}

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

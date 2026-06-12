import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { Table, Tr, Td } from "../../components/ui/Table";
import { useAuth } from "../../hooks/useAuth";
import {
  obtenerPacientePorId,
  obtenerHistorialTurnos,
  obtenerHistorialPagos,
} from "../../api/patients.api";

const FichaPacienteAdmin = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [paciente, setPaciente] = useState(null);
  const [turnos, setTurnos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  const cargarDatos = async () => {
    try {
      const [dataPaciente, dataTurnos, dataPagos] = await Promise.all([
        obtenerPacientePorId(id, token),
        obtenerHistorialTurnos(id, token),
        obtenerHistorialPagos(id, token),
      ]);
      setPaciente(dataPaciente);
      setTurnos(dataTurnos);
      setPagos(dataPagos);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (token) {
      cargarDatos();
    }
  }, [token]);

  if (cargando) {
    return (
      <p style={{ textAlign: "center", marginTop: "50px" }}>
        Cargando ficha...
      </p>
    );
  }

  if (error) {
    return <p style={{ color: "red", padding: "20px" }}>{error}</p>;
  }

  return (
    <div>
      <Button
        style={{
          backgroundColor: "#e2e8f0",
          color: "#475569",
          marginBottom: "20px",
        }}
        onClick={() => navigate("/admin/pacientes")}
      >
        ← Volver
      </Button>

      {/* DATOS DEL PACIENTE */}
      <PageHeader title={`Ficha de ${paciente?.person?.name || ""}`} />

      <div
        style={{
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "30px",
        }}
      >
        <h3 style={{ color: "#475569", marginBottom: "15px" }}>
          Datos personales
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            fontSize: "14px",
          }}
        >
          <p>
            <strong>Nombre:</strong> {paciente?.person?.name}
          </p>
          <p>
            <strong>Email:</strong> {paciente?.person?.email}
          </p>
          <p>
            <strong>Teléfono:</strong> {paciente?.person?.phone}
          </p>
          <p>
            <strong>Documento:</strong> {paciente?.person?.documentType}{" "}
            {paciente?.person?.document}
          </p>
          <p>
            <strong>CUIL/CUIT:</strong> {paciente?.person?.cuilCuit || "—"}
          </p>
        </div>

        {paciente?.clinicalNotes && (
          <div
            style={{
              marginTop: "15px",
              backgroundColor: "#fef9c3",
              border: "1px solid #fde047",
              borderRadius: "6px",
              padding: "12px",
            }}
          >
            <strong style={{ color: "#854d0e" }}>Notas clínicas:</strong>
            <p style={{ marginTop: "5px", color: "#713f12", fontSize: "14px" }}>
              {paciente.clinicalNotes}
            </p>
          </div>
        )}
      </div>

      {/* HISTORIAL DE TURNOS */}

      <h3 style={{ color: "#475569", marginBottom: "15px" }}>
        Historial de turnos
      </h3>

      {turnos.length === 0 ? (
        <p style={{ color: "#94a3b8", marginBottom: "30px" }}>
          Sin turnos registrados.
        </p>
      ) : (
        <div style={{ marginBottom: "30px" }}>
          <Table
            headers={[
              "Fecha",
              "Profesional",
              "Servicio",
              "Estado",
              "Precio",
              "Pago",
            ]}
          >
            {turnos.map((t) => (
              <Tr key={t.id}>
                <Td>
                  {t.availability?.date
                    ? new Date(t.availability.date).toLocaleDateString("es-AR")
                    : "—"}
                </Td>

                <Td>
                  {t.professionalService?.professional?.person?.name || "—"}
                </Td>

                <Td>{t.professionalService?.service?.name || "—"}</Td>

                <Td>{t.status}</Td>

                <Td>
                  {Number(t.priceSnapshot).toLocaleString("es-AR", {
                    style: "currency",
                    currency: "ARS",
                    maximumFractionDigits: 0,
                  })}
                </Td>

                <Td>{t.paymentStatus}</Td>
              </Tr>
            ))}
          </Table>
        </div>
      )}

      {/* HISTORIAL DE PAGOS */}

      <h3 style={{ color: "#475569", marginBottom: "15px" }}>
        Historial de pagos
      </h3>

      {pagos.length === 0 ? (
        <p style={{ color: "#94a3b8" }}>Sin pagos registrados.</p>
      ) : (
        <Table headers={["Fecha", "Servicio", "Método", "Tipo", "Monto"]}>
          {pagos.map((p) => (
            <Tr key={p.id}>
              <Td>
                {p.paidAt
                  ? new Date(p.paidAt).toLocaleDateString("es-AR")
                  : "—"}
              </Td>

              <Td>
                {p.appointment?.professionalService?.service?.name || "—"}
              </Td>

              <Td>{p.paymentMethod}</Td>

              <Td>{p.isRefund ? "Devolución" : p.paymentType}</Td>

              <Td
                style={{
                  color: p.isRefund ? "red" : "inherit",
                  fontWeight: p.isRefund ? "bold" : "normal",
                }}
              >
                {p.isRefund ? "−" : ""}
                {Number(p.amount).toLocaleString("es-AR", {
                  style: "currency",
                  currency: "ARS",
                  maximumFractionDigits: 0,
                })}
              </Td>
            </Tr>
          ))}
        </Table>
      )}
    </div>
  );
};

export default FichaPacienteAdmin;
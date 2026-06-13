import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";
import { GestionServiciosProfesional } from "../../components/GestionServiciosProfesional";
import { GestionHorariosRecurrentes } from "../../components/GestionHorariosRecurrentes";
import { PageHeader } from "../../components/ui/PageHeader";

const FichaProfesionalAdmin = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [profesional, setProfesional] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

  const cargarDatos = async () => {
    try {
      const respuesta = await fetch(`${apiUrl}/professionals/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.mensaje || datos.error || "Error al traer el profesional");
      setProfesional(datos);
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
    return <p style={{ textAlign: "center", marginTop: "50px" }}>Cargando ficha...</p>;
  }

  if (error) {
    return <p style={{ color: "red", padding: "20px" }}>{error}</p>;
  }

  return (
    <div>
      <Button
        style={{ backgroundColor: "#e2e8f0", color: "#475569", marginBottom: "20px" }}
        onClick={() => navigate("/admin/profesionales")}
      >
        ← Volver
      </Button>
 
      <PageHeader
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            Ficha de {profesional?.person?.name}
            <span style={{ color: profesional?.active ? "#16a34a" : "#d32f2f", fontWeight: "bold", fontSize: "14px" }}>
              {profesional?.active ? "● Activo" : "○ Inactivo"}
            </span>
          </span>
        }
      />

      <div
        style={{
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "30px",
        }}
      >
        <h3 style={{ color: "#475569", marginBottom: "15px" }}>Datos personales</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "14px" }}>
          <p><strong>Nombre:</strong> {profesional?.person?.name}</p>
          <p><strong>Especialidad:</strong> {profesional?.specialty || "—"}</p>
          <p><strong>Email:</strong> {profesional?.person?.email}</p>
          <p><strong>Teléfono:</strong> {profesional?.person?.phone}</p>
          <p><strong>Documento:</strong> {profesional?.person?.documentType} {profesional?.person?.document}</p>
          <p><strong>Google Calendar ID:</strong> {profesional?.googleCalendarId || "—"}</p>
        </div>

        {profesional?.bio && (
          <div
            style={{
              marginTop: "15px",
              backgroundColor: "#f8f4ff",
              border: "1px solid #e9d5ff",
              borderRadius: "6px",
              padding: "12px",
            }}
          >
            <strong style={{ color: "#6b21a8" }}>Bio:</strong>
            <p style={{ marginTop: "5px", color: "#475569", fontSize: "14px" }}>{profesional.bio}</p>
          </div>
        )}
      </div>
 
      <div style={{ marginBottom: "30px" }}>
        <GestionServiciosProfesional professionalId={id} token={token} />
      </div>
 
      <GestionHorariosRecurrentes professionalId={id} token={token} />
    </div>
  );
};

export default FichaProfesionalAdmin;
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";
import { GestionServiciosProfesional } from "../../components/GestionServiciosProfesional";
import { GestionHorariosRecurrentes } from "../../components/GestionHorariosRecurrentes";
import { PageHeader } from "../../components/ui/PageHeader";
import client, { mensajeDeError } from "../../api/client";
import {colors, status} from "../../theme/colors"; 

const FichaProfesionalAdmin = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [profesional, setProfesional] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  const cargarDatos = async () => {
    try {
      const { data: datos } = await client.get(`/professionals/${id}`);
      setProfesional(datos);
    } catch (err) {
      setError(mensajeDeError(err) || "Error al traer el profesional");
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
        style={{ backgroundColor: colors.border, color: colors.textSecondary, marginBottom: "20px" }}
        onClick={() => navigate("/admin/profesionales")}
      >
        ← Volver
      </Button>
 
      <PageHeader
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            Ficha de {profesional?.person?.name}
            <span style={{ color: profesional?.active ? status.success.strong : status.error.strong, fontWeight: "bold", fontSize: "14px" }}>
              {profesional?.active ? "● Activo" : "○ Inactivo"}
            </span>
          </span>
        }
      />

      <div
        style={{
          backgroundColor: colors.bg,
          border: "1px solid colors.border",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "30px",
        }}
      >
        <h3 style={{ color: colors.textSecondary, marginBottom: "15px" }}>Datos personales</h3>

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
              border: "1px solid colors.brandTintLight",
              borderRadius: "6px",
              padding: "12px",
            }}
          >
            <strong style={{ color: colors.brand }}>Bio:</strong>
            <p style={{ marginTop: "5px", color: colors.textSecondary, fontSize: "14px" }}>{profesional.bio}</p>
          </div>
        )}
      </div>
 
      <div style={{ marginBottom: "30px" }}>
        <GestionServiciosProfesional professionalId={id} />
      </div>
 
      <GestionHorariosRecurrentes professionalId={id} />
    </div>
  );
};

export default FichaProfesionalAdmin;
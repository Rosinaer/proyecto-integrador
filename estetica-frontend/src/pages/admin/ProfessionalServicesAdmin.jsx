import { useState, useEffect } from "react";
import { Select } from "../../components/ui/Select";
import { useAuth } from "../../hooks/useAuth";
import { GestionServiciosProfesional } from "../../components/GestionServiciosProfesional";
import axios from "axios";

const BASE = `${import.meta.env.VITE_API_URL || "http://localhost:3000/api"}`;

const obtenerProfesionales = async (token) => {
  const res = await axios.get(`${BASE}/professionals`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

const ProfessionalServicesAdmin = () => {
  const [profesionales, setProfesionales] = useState([]);
  const [profesionalSeleccionadoId, setProfesionalSeleccionadoId] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  const { token } = useAuth();

  const cargarProfesionales = async () => {
    try {
      const data = await obtenerProfesionales(token);
      setProfesionales(data);
      if (data.length > 0) {
        setProfesionalSeleccionadoId(data[0].id);
      }
    } catch (err) {
      setError(err.response?.data?.mensaje || err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (token) {
      cargarProfesionales();
    }
  }, [token]);

  if (cargando) {
    return (
      <p style={{ textAlign: "center", marginTop: "50px" }}>
        Cargando profesionales...
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
        <h2 style={{ color: "#6b21a8" }}>Profesional</h2>

        <Select
          value={profesionalSeleccionadoId}
          onChange={(e) => setProfesionalSeleccionadoId(e.target.value)}
          options={profesionales.map((p) => ({
            value: p.id,
            label: p.person?.name || p.name,
          }))}
        />
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {profesionalSeleccionadoId && (
        <GestionServiciosProfesional
          professionalId={profesionalSeleccionadoId}
          token={token}
        />
      )}
    </div>
  );
};

export default ProfessionalServicesAdmin;
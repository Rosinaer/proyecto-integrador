import { useState, useEffect } from "react";
import { Select } from "../../components/ui/Select";
import { GestionServiciosProfesional } from "../../components/GestionServiciosProfesional";
import { PageHeader } from "../../components/ui/PageHeader";
import client, { mensajeDeError } from "../../api/client";
import {colors} from "../../theme/colors"; 

const obtenerProfesionales = async () => {
  const res = await client.get("/professionals");
  return res.data;
};

const ProfessionalServicesAdmin = () => {
  const [profesionales, setProfesionales] = useState([]);
  const [profesionalSeleccionadoId, setProfesionalSeleccionadoId] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  const cargarProfesionales = async () => {
    try {
      const data = await obtenerProfesionales();
      setProfesionales(data);
      if (data.length > 0) {
        setProfesionalSeleccionadoId(data[0].id);
      }
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarProfesionales();
  }, []);

  if (cargando) {
    return (
      <p style={{ textAlign: "center", marginTop: "50px" }}>
        Cargando profesionales...
      </p>
    );
  }

  return (
    <div>
      <PageHeader title="Servicios por Profesional" />

      <div style={{ maxWidth: "360px", marginBottom: "24px" }}>
        <label style={{ display: "block", fontSize: "13px", color: colors.textSubtle, marginBottom: "6px" }}>
          Profesional
        </label>
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
        <GestionServiciosProfesional professionalId={profesionalSeleccionadoId} />
      )}
    </div>
  );
};

export default ProfessionalServicesAdmin;
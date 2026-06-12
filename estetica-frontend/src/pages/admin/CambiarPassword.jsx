import { useState } from "react";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";

const CambiarPassword = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    passwordActual: "",
    passwordNueva: "",
    confirmarPassword: ""
  });
  const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });
  const [cargando, setCargando] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje({ texto: "", tipo: "" });

    if (formData.passwordNueva !== formData.confirmarPassword) {
      return setMensaje({ texto: "Las contraseñas nuevas no coinciden.", tipo: "error" });
    }

    if (formData.passwordNueva.length < 6) {
      return setMensaje({ texto: "La nueva contraseña debe tener al menos 6 caracteres.", tipo: "error" });
    }

    setCargando(true);

    try {
      const token = localStorage.getItem("token");
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

      // Ajustado a tu ruta exacta de Node: PATCH /users/:id/password
      const respuesta = await fetch(`${apiUrl}/users/${user.id}/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          passwordActual: formData.passwordActual,
          passwordNueva: formData.passwordNueva
        })
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(data.mensaje || data.error || "Error al cambiar la contraseña");
      }

      setMensaje({ texto: "¡Contraseña actualizada con éxito!", tipo: "exito" });
      setFormData({ passwordActual: "", passwordNueva: "", confirmarPassword: "" });

    } catch (err) {
      setMensaje({ texto: err.message, tipo: "error" });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div>
      {/* Encabezado consistente con el resto del admin */}
      <h2 style={{ color: "#6b21a8", margin: "0 0 20px", textAlign: "left" }}>Cambiar Mi Contraseña</h2>

      <div style={{ maxWidth: "520px" }}>
        <Card>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {mensaje.texto && (
              <div style={{
                padding: "15px",
                borderRadius: "5px",
                textAlign: "center",
                backgroundColor: mensaje.tipo === "error" ? "#ffebee" : "#e8f5e9",
                color: mensaje.tipo === "error" ? "#c62828" : "#2e7d32",
                fontWeight: "bold"
              }}>
                {mensaje.texto}
              </div>
            )}

            <div>
              <label style={labelStyle}>Contraseña Actual</label>
              <Input
                type="password"
                name="passwordActual"
                value={formData.passwordActual}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Nueva Contraseña</label>
              <Input
                type="password"
                name="passwordNueva"
                value={formData.passwordNueva}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Confirmar Nueva Contraseña</label>
              <Input
                type="password"
                name="confirmarPassword"
                value={formData.confirmarPassword}
                onChange={handleChange}
                required
              />
            </div>

            <Button type="submit" disabled={cargando}>
              {cargando ? "Actualizando..." : "Actualizar Contraseña"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

const labelStyle = {
  display: "block",
  marginBottom: "8px",
  fontSize: "14px",
  color: "#555",
  fontWeight: "bold"
};

export default CambiarPassword;
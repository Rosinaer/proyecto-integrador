import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import client, { mensajeDeError } from "../api/client";

const ResetPassword = () => {
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const navigate = useNavigate();
  // Esto extrae el token de la URL (ej: localhost:5173/reset-password?token=123)
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");

    if (!token) {
      return setError("No se encontró el token de seguridad en la URL. Volvé a solicitar el cambio de contraseña.");
    }

    if (nuevaPassword !== confirmarPassword) {
      return setError("Las contraseñas no coinciden.");
    }

    if (nuevaPassword.length < 6) {
      return setError("La contraseña debe tener al menos 6 caracteres.");
    }

    setCargando(true);

    try {
      await client.post("/auth/reset-password", { token, nuevaPassword });

      setMensaje("¡Contraseña actualizada con éxito!");

      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      setError(mensajeDeError(err) || "Ocurrió un error al restablecer la contraseña.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '400px', marginTop: '10vh' }}>
      <h2>Crear Nueva Contraseña</h2>

      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
      {mensaje && <p style={{ color: 'green', textAlign: 'center', fontWeight: 'bold' }}>{mensaje}</p>}

      {!mensaje && (
        <form onSubmit={manejarEnvio} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <Input
            type="password"
            placeholder="Nueva contraseña (mínimo 6 caracteres)"
            value={nuevaPassword}
            onChange={(e) => setNuevaPassword(e.target.value)}
            required
          />

          <Input
            type="password"
            placeholder="Repetir nueva contraseña"
            value={confirmarPassword}
            onChange={(e) => setConfirmarPassword(e.target.value)}
            required
          />

          <Button type="submit" disabled={cargando}>
            {cargando ? "Guardando..." : "Guardar contraseña"}
          </Button>
        </form>
      )}
    </div>
  );
};

export default ResetPassword;